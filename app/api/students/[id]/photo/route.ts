import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

const BUCKET_NAME = "student-photos";

// Ensure the storage bucket exists with public read access
async function ensureBucketExists(admin: ReturnType<typeof createAdminClient>) {
  try {
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET_NAME)) {
      await admin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 524288, // 512 KB
        allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"],
      });
    }
  } catch (err) {
    console.warn("Storage bucket auto-check warning:", err);
  }
}

// POST /api/students/[id]/photo - Upload / Replace student passport photo
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Access denied" }, { status: 401 });
    }

    const admin = createAdminClient();
    await ensureBucketExists(admin);

    let fileBuffer: Buffer | null = null;
    let contentType = "image/webp";

    const reqContentType = req.headers.get("content-type") || "";

    if (reqContentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("photo") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No photo file provided" }, { status: 400 });
      }
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      contentType = file.type || "image/webp";
    } else if (reqContentType.includes("application/json")) {
      const body = await req.json();
      if (!body.imageBase64) {
        return NextResponse.json({ error: "Missing imageBase64 in payload" }, { status: 400 });
      }
      const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, "");
      fileBuffer = Buffer.from(base64Data, "base64");
    } else {
      const arrayBuffer = await req.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: "Empty photo payload" }, { status: 400 });
    }

    // Safety check: ensure file size is within 250KB limit (our client-side optimizer guarantees <40KB)
    if (fileBuffer.length > 256 * 1024) {
      return NextResponse.json({ error: "Photo file exceeds maximum size limit (256 KB)" }, { status: 400 });
    }

    const fileName = `${id}.webp`;

    // Upload to Supabase Storage
    const { error: uploadError } = await admin.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message || "Failed to upload photo to storage" }, { status: 500 });
    }

    // Retrieve public URL
    const { data: { publicUrl } } = admin.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    const versionedUrl = `${publicUrl}?v=${Date.now()}`;

    // Gracefully attempt to update photo_url column in PostgreSQL
    try {
      await admin
        .from("students")
        .update({
          photo_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    } catch (dbErr: any) {
      console.warn("Notice: photo_url column might not exist in students table yet. Using storage URL directly.", dbErr?.message);
    }

    return NextResponse.json({
      success: true,
      photoUrl: versionedUrl,
      sizeBytes: fileBuffer.length,
    });
  } catch (error: any) {
    console.error("Photo upload handler error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/students/[id]/photo - Remove student photo
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Access denied" }, { status: 401 });
    }

    const admin = createAdminClient();
    const fileName = `${id}.webp`;

    // Remove from storage
    await admin.storage.from(BUCKET_NAME).remove([fileName]);

    // Update database
    try {
      await admin
        .from("students")
        .update({
          photo_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    } catch (dbErr: any) {
      console.warn("Notice: photo_url column reset notice:", dbErr?.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete photo" }, { status: 500 });
  }
}
