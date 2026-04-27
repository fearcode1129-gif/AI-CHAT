const MAX_ACTIVE_STREAMS_PER_USER = 2;
const activeStreamCountsByUser = new Map<string, number>();

export function acquireUserStreamSlot(userId: string) {
  const activeCount = activeStreamCountsByUser.get(userId) ?? 0;

  if (activeCount >= MAX_ACTIVE_STREAMS_PER_USER) {
    const error = new Error("Too many active generations. Please wait for one to finish.") as Error & {
      code?: string;
    };
    error.code = "STREAM_CONCURRENCY_LIMIT";
    throw error;
  }

  let released = false;
  activeStreamCountsByUser.set(userId, activeCount + 1);

  return () => {
    if (released) {
      return;
    }

    released = true;
    const nextCount = Math.max(0, (activeStreamCountsByUser.get(userId) ?? 1) - 1);

    if (nextCount === 0) {
      activeStreamCountsByUser.delete(userId);
      return;
    }

    activeStreamCountsByUser.set(userId, nextCount);
  };
}

export function resetStreamConcurrencyForTests() {
  activeStreamCountsByUser.clear();
}
