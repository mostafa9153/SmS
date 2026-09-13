import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET_NAME = "staff-signatures";

async function ensureBucketExists(admin: ReturnType<typeof createAdminClient>) {
  try {
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET_NAME)) {
      await admin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 2 * 1024 * 1024, // 2 MB
        allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"],
      });
    }
  } catch (err) {
    console.warn("Storage bucket auto-check warning:", err);
  }
}

// POST /api/employees/[id]/signature - Upload or update staff signature
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    let signatureUrl = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("signature") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No signature file provided" }, { status: 400 });
      }

      await ensureBucketExists(admin);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `sig-${id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await admin.storage
        .from(BUCKET_NAME)
        .upload(fileName, buffer, {
          contentType: file.type || "image/png",
          upsert: true,
        });

      if (!uploadError) {
        const { data } = admin.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        signatureUrl = data.publicUrl;
      } else {
        // Fallback to dataUrl
        signatureUrl = `data:${file.type || "image/png"};base64,${buffer.toString("base64")}`;
      }
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      signatureUrl = body.signatureUrl || body.imageBase64;
    }

    // Retrieve current staff to preserve professional_meta
    const { data: currentStaff } = await admin
      .from("staff_profiles")
      .select("professional_meta")
      .eq("id", id)
      .single();

    const updatedMeta = {
      ...(currentStaff?.professional_meta || {}),
      signature_url: signatureUrl,
    };

    // Update staff_profiles table
    const { data: updated, error: dbError } = await admin
      .from("staff_profiles")
      .update({
        professional_meta: updatedMeta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (dbError) {
      console.error("DB update error for signature:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, signatureUrl, staff: updated });
  } catch (error: any) {
    console.error("Signature upload error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/employees/[id]/signature - Remove staff signature
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    const { data: currentStaff } = await admin
      .from("staff_profiles")
      .select("professional_meta")
      .eq("id", id)
      .single();

    const updatedMeta = {
      ...(currentStaff?.professional_meta || {}),
    };
    delete updatedMeta.signature_url;

    const { data: updated, error } = await admin
      .from("staff_profiles")
      .update({
        professional_meta: updatedMeta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Signature removed successfully", staff: updated });
  } catch (error: any) {
    console.error("Signature delete error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
