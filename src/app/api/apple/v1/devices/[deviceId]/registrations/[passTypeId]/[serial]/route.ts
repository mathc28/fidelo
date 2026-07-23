import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabaseAdmin";

type Params = { params: { deviceId: string; passTypeId: string; serial: string } };

async function authorize(req: NextRequest, serial: string) {
  const token = req.headers.get("authorization")?.replace("ApplePass ", "");
  if (!token) return null;
  const { data } = await db
    .from("customers")
    .select("serial_number, auth_token")
    .eq("serial_number", serial)
    .single();
  return data && data.auth_token === token ? data : null;
}

export async function POST(req: NextRequest, { params }: Params) {
  if (!(await authorize(req, params.serial))) return new NextResponse(null, { status: 401 });
  const { pushToken } = await req.json();
  const { error } = await db
    .from("apple_registrations")
    .upsert(
      { device_library_id: params.deviceId, serial_number: params.serial, push_token: pushToken },
      { onConflict: "device_library_id,serial_number" }
    );
  return new NextResponse(null, { status: error ? 500 : 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await authorize(req, params.serial))) return new NextResponse(null, { status: 401 });
  await db
    .from("apple_registrations")
    .delete()
    .eq("device_library_id", params.deviceId)
    .eq("serial_number", params.serial);
  return new NextResponse(null, { status: 200 });
}
