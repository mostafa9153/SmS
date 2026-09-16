import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

const BUCKET_NAME = "staff-photos";

let bucketChecked = false;

async function ensureBucketExists(admin: ReturnType<typeof createAdminClient>) {
  if (bucketChecked) return;
  try {
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET_NAME)) {
      await admin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 2 * 1024 * 1024, // 2 MB
        allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"],
      });
    }
    bucketChecked = true;
  } catch (err) {
    console.warn("Storage bucket auto-check warning:", err);
  }
}

// POST /api/employees/[id]/photo - Upload or update staff photo
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const { id } = await params;
    const admin = createAdminClient();

    let photoUrl = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("photo") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No photo file provided" }, { status: 400 });
      }

      await ensureBucketExists(admin);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await admin.storage
        .from(BUCKET_NAME)
        .upload(fileName, buffer, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });

      if (!uploadError) {
        const { data } = admin.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        photoUrl = data.publicUrl;
      } else {
        // Fallback to dataUrl
        photoUrl = `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
      }
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      if (!body.photoUrl && !body.imageBase64) {
        return NextResponse.json({ error: "No photo data provided" }, { status: 400 });
      }
      photoUrl = body.photoUrl || body.imageBase64;
    }

    // Update staff_profiles table
    const { data: updated, error: dbError } = await admin
      .from("staff_profiles")
      .update({
        profile_picture_url: photoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (dbError) {
      console.error("DB update error for photo:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, photoUrl, staff: updated });
  } catch (error: any) {
    console.error("Photo upload error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/employees/[id]/photo - Remove staff photo
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }
    if (auth.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Only administrators can delete staff photos." }, { status: 403 });
    }

    const { id } = await params;
    const admin = createAdminClient();

    const { data: updated, error } = await admin
      .from("staff_profiles")
      .update({
        profile_picture_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Photo removed successfully", staff: updated });
  } catch (error: any) {
    console.error("Photo delete error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
