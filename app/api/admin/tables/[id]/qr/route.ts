import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";

function getBaseUrl(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  const host = req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const table = await prisma.table.findUnique({ where: { id } });
    if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

    const url = `${getBaseUrl(req)}/table/${table.number}?qr=${table.qrToken}`;
    const buffer = await QRCode.toBuffer(url, { width: 300 });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: { "Content-Type": "image/png", "Content-Length": buffer.length.toString() },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const table = await prisma.table.findUnique({ where: { id } });
    if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

    const newToken = uuidv4();
    await prisma.table.update({ where: { id }, data: { qrToken: newToken } });

    const url = `${getBaseUrl(req)}/table/${table.number}?qr=${newToken}`;
    return NextResponse.json({ qrToken: newToken, url });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
