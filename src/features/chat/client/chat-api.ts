import type {
  ChatsResponse,
  CreateChatRequest,
  GenerateImageRequest,
  GenerateImageResponse,
  MessagesResponse,
  StreamChatRequest,
  StreamEvent,
  UploadFilesResponse,
  UsageResponse,
  UpdateChatRequest
} from "@/shared/types/api";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorCode: string | undefined;

    try {
      const payload = (await response.json()) as { error?: string; code?: string };
      errorMessage = payload.error ?? errorMessage;
      errorCode = payload.code;
    } catch {
      // Ignore JSON parse errors and fall back to the status-based message.
    }

    const error = new Error(errorMessage) as Error & { code?: string };
    error.code = errorCode;
    throw error;
  }

  return (await response.json()) as T;
}

export async function fetchChats() {
  return parseJson<ChatsResponse>(await fetch("/api/chats"));
}

export async function createChat(payload: CreateChatRequest) {
  return parseJson<ChatsResponse[number]>(
    await fetch("/api/chats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function fetchChatMessages(chatId: string) {
  return parseJson<MessagesResponse>(await fetch(`/api/chats/${chatId}/messages`));
}

export async function updateChat(chatId: string, payload: UpdateChatRequest) {
  return parseJson<ChatsResponse[number]>(
    await fetch(`/api/chats/${chatId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function deleteChat(chatId: string) {
  const response = await fetch(`/api/chats/${chatId}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}

export async function streamChat(
  payload: StreamChatRequest,
  signal: AbortSignal,
  onEvent: (event: StreamEvent) => void
) {
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    await parseJson(response);
  }

  if (!response.body) {
    throw new Error("Stream request failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame
        .split("\n")
        .find((item) => item.startsWith("data: "));

      if (!line) {
        continue;
      }

      onEvent(JSON.parse(line.slice(6)) as StreamEvent);
    }
  }
}

export async function uploadFiles(input: { files: File[]; purpose: "attachment" | "knowledge" }) {
  const formData = new FormData();
  formData.append("purpose", input.purpose);

  for (const file of input.files) {
    formData.append("files", file);
  }

  return parseJson<UploadFilesResponse>(
    await fetch("/api/files/upload", {
      method: "POST",
      body: formData
    })
  );
}

export async function generateImage(payload: GenerateImageRequest) {
  return parseJson<GenerateImageResponse>(
    await fetch("/api/image/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function fetchUsage() {
  return parseJson<UsageResponse>(await fetch("/api/me/usage"));
}
