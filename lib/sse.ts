const globalForSSE = globalThis as unknown as {
  sseSubscribers: Map<string, Set<ReadableStreamDefaultController>>;
};

if (!globalForSSE.sseSubscribers) {
  globalForSSE.sseSubscribers = new Map();
}

const subscribers = globalForSSE.sseSubscribers;

export function subscribe(
  channel: string,
  controller: ReadableStreamDefaultController
): void {
  if (!subscribers.has(channel)) {
    subscribers.set(channel, new Set());
  }
  subscribers.get(channel)!.add(controller);
}

export function unsubscribe(
  channel: string,
  controller: ReadableStreamDefaultController
): void {
  const channelSubscribers = subscribers.get(channel);
  if (channelSubscribers) {
    channelSubscribers.delete(controller);
    if (channelSubscribers.size === 0) {
      subscribers.delete(channel);
    }
  }
}

export function broadcast(channel: string, data: object): void {
  const channelSubscribers = subscribers.get(channel);
  if (!channelSubscribers || channelSubscribers.size === 0) return;

  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);

  const toRemove: ReadableStreamDefaultController[] = [];

  for (const controller of channelSubscribers) {
    try {
      controller.enqueue(encoded);
    } catch {
      toRemove.push(controller);
    }
  }

  for (const controller of toRemove) {
    channelSubscribers.delete(controller);
  }
}
