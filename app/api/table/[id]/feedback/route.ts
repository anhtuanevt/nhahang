import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { broadcast } from "@/lib/sse";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tableNumber = parseInt(id, 10);

  const { rating, comment, sessionId: bodySessionId } = await req.json();

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating phải từ 1-5" }, { status: 400 });
  }

  // Try to get session from auth cookie (optional — guest can also submit)
  const sessionAuth = await getSessionFromRequest(req);

  const table = await prisma.table.findUnique({ where: { number: tableNumber } });
  if (!table) return NextResponse.json({ error: "Không tìm thấy bàn" }, { status: 404 });

  const feedback = await prisma.feedback.create({
    data: {
      tableId: table.id,
      tableNumber,
      sessionId: sessionAuth?.sessionId ?? bodySessionId ?? null,
      rating,
      comment: comment?.trim() || null,
      status: "unread",
    },
  });

  broadcast("server", { type: "new_feedback", tableNumber, rating });

  return NextResponse.json(feedback, { status: 201 });
}
