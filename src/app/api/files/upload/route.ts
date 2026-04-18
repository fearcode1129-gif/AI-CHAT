import { attachmentRepository } from "@/features/files/server/repositories/attachment-repository";
import { toClientAttachment } from "@/features/chat/server/mappers/chat-mappers";
import {
  getKnowledgeEmbeddingModel,
  createKnowledgeEmbedding
} from "@/features/chat/server/knowledge/knowledge";
import {
  extractTextContent,
  formatFileSize,
  saveUploadedFile
} from "@/features/files/server/services/files";
import { getServerConfig } from "@/server/config/config";
import { requireUser } from "@/server/auth/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { userId } = await requireUser();
    const formData = await request.formData();
    const purpose = String(formData.get("purpose") ?? "attachment");
    const files = formData.getAll("files").filter((file): file is File => file instanceof File);

    if (files.length === 0) {
      return Response.json({ error: "Missing files" }, { status: 400 });
    }

    const uploads = await Promise.all(
      files.map(async (file) => {
        const maxFileSizeBytes = getServerConfig().files.maxUploadFileSizeMb * 1024 * 1024;

        if (file.size > maxFileSizeBytes) {
          throw new Error(`File ${file.name} exceeds the ${getServerConfig().files.maxUploadFileSizeMb} MB limit`);
        }

        const { url, buffer } = await saveUploadedFile(file);
        const content = await extractTextContent(file, buffer);
        const isKnowledge = purpose === "knowledge";
        const embedding =
          isKnowledge && content
            ? await createKnowledgeEmbedding(content)
            : undefined;

        const attachment = await attachmentRepository.create({
          userId,
          name: file.name,
          kind: isKnowledge ? "knowledge" : file.type.startsWith("image/") ? "image" : "file",
          sizeLabel: formatFileSize(file.size),
          mimeType: file.type || undefined,
          url,
          content: content ?? undefined,
          embedding
        });

        return toClientAttachment(attachment);
      })
    );

    return Response.json(uploads, {
      status: 201,
      headers:
        purpose === "knowledge"
          ? { "X-Knowledge-Embedding-Model": getKnowledgeEmbeddingModel() }
          : undefined
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload files";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
