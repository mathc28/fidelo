import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  console.log("[Apple Wallet log]", JSON.stringify(body));
  return new NextResponse(null, { status: 200 });
}
