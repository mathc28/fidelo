import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabaseAdmin";

export async function GET(
  req: NextRequest,
  { params }: { params: { deviceId: string; passTypeId: string } }
) {
  const since = req.nextUrl.searchParams.get("passesUpdatedSince");

  const { data: regs } = await db
    .from("apple_registrations")
    .select("serial_number")
    .eq("device_library_id", params.deviceId);

  if (!regs?.length) return new NextResponse(null, { status: 204 });

  let query = db
    .from("customers")
    .select("serial_number, updated_at")
    .in(
      "serial_number",
      regs.map((r) => r.serial_number)
    );
  if (since) query = query.gt("updated_at", since);

  const { data: updated } = await query;
  if (!updated?.length) return new NextResponse(null, { status: 204 });

  const lastUpdated = updated
    .map((u) => u.updated_at)
    .sort()
    .at(-1)!;
  return NextResponse.json({
    serialNumbers: updated.map((u) => u.serial_number),
    lastUpdated,
  });
}
