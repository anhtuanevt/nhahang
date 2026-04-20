import { NextRequest } from "next/server";
import { subscribe, unsubscribe, broadcast } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const channel = req.nextUrl.searchParams.get("channel") || "server";

  const encoder = new TextEncoder();

  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      subscribe(channel, controller);

      // Send initial connected event
      const connectMsg = `event: connected\ndata: ${JSON.stringify({ channel })}\n\n`;
      controller.enqueue(encoder.encode(connectMsg));
    },
    cancel() {
      unsubscribe(channel, controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
