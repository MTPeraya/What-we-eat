// change to socket.io / pusher / upstash-redis pubsub
type Payload = Record<string, unknown>;

export async function emitToRoom(roomId: string, event: string, payload: Payload) {
  // connect real provider
  if (process.env.NODE_ENV !== "test") {
    console.log(`[realtime] ${event} -> room:${roomId}`, payload);
  }
}
