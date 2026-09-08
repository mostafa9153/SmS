import { NextResponse } from "next/server";
import {
  dbSaveCertificates,
  dbSearchCertificates,
  type DBCertificateInsert,
} from "@/lib/supabase/db-certificates";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    const body = await req.json();

    let certsToSave: DBCertificateInsert[] = [];
    if (Array.isArray(body.certificates)) {
      certsToSave = body.certificates;
    } else if (body.certificate) {
      certsToSave = [body.certificate];
    } else if (body.certificate_no) {
      certsToSave = [body];
    }

    if (certsToSave.length === 0) {
      return NextResponse.json({ error: "No certificate data provided" }, { status: 400 });
    }

    // Attach current user name or email as printed_by if not specified
    const printedBy = auth?.user?.email || auth?.fullName || null;
    certsToSave = certsToSave.map((item) => ({
      ...item,
      printed_by: item.printed_by || printedBy,
    }));

    const result = await dbSaveCertificates(certsToSave);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to save certificate" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      savedCount: result.savedCount,
      message: `Successfully recorded ${result.savedCount} certificate(s) in database`,
    });
  } catch (err: any) {
    console.error("Error in POST /api/certificates:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || undefined;
    const certificateType = searchParams.get("type") || null;
    const studentClass = searchParams.get("class") || null;
    const section = searchParams.get("section") || null;
    const status = searchParams.get("status") || null;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await dbSearchCertificates({
      query,
      certificateType,
      studentClass,
      section,
      status,
      limit,
      offset,
    });

    return NextResponse.json({
      data: result.data,
      total: result.total,
      error: result.error,
    });
  } catch (err: any) {
    console.error("Error in GET /api/certificates:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
