const streamAbortControllersByUser = new Map<string, Map<string, AbortController>>();

export function registerStreamAbortController(
  userId: string,
  streamId: string,
  controller: AbortController
) {
  const userControllers = streamAbortControllersByUser.get(userId) ?? new Map();
  userControllers.set(streamId, controller);
  streamAbortControllersByUser.set(userId, userControllers);

  return () => {
    const currentControllers = streamAbortControllersByUser.get(userId);
    if (!currentControllers) {
      return;
    }

    currentControllers.delete(streamId);
    if (currentControllers.size === 0) {
      streamAbortControllersByUser.delete(userId);
    }
  };
}

export function abortRegisteredStream(userId: string, streamId: string) {
  const controller = streamAbortControllersByUser.get(userId)?.get(streamId);
  if (!controller) {
    return false;
  }

  controller.abort();
  return true;
}

export function resetStreamAbortRegistryForTests() {
  streamAbortControllersByUser.clear();
}
