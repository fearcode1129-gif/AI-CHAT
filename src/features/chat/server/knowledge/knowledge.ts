import OpenAI from "openai";

import { getDashScopeConfig } from "@/server/config/aliyun";
import { getServerConfig } from "@/server/config/config";
import { attachmentRepository } from "@/features/files/server/repositories/attachment-repository";

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  const length = Math.min(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    const valueA = a[index] ?? 0;
    const valueB = b[index] ?? 0;
    dot += valueA * valueB;
    normA += valueA * valueA;
    normB += valueB * valueB;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function createEmbeddingClient() {
  const { apiKey, baseURL } = getDashScopeConfig();

  return new OpenAI({
    apiKey,
    baseURL
  });
}

export async function createKnowledgeEmbedding(content: string) {
  const { ai, knowledge } = getServerConfig();
  const client = createEmbeddingClient();
  const response = await client.embeddings.create({
    model: ai.knowledgeEmbeddingModel,
    input: content.slice(0, knowledge.maxEmbeddingInputChars)
  });

  return response.data[0]?.embedding ?? [];
}

export async function retrieveKnowledgeContext(userId: string, query: string) {
  const { knowledge } = getServerConfig();
  const documents = await attachmentRepository.listKnowledgeDocuments(userId);

  if (documents.length === 0) {
    return [];
  }

  const queryEmbedding = await createKnowledgeEmbedding(query);

  return documents
    .map((document) => ({
      document,
      score: cosineSimilarity(
        queryEmbedding,
        Array.isArray(document.embedding) ? (document.embedding as number[]) : []
      )
    }))
    .filter((item) => Array.isArray(item.document.embedding))
    .sort((a, b) => b.score - a.score)
    .slice(0, knowledge.topK)
    .filter((item) => item.score > knowledge.scoreThreshold && item.document.content)
    .map((item) => ({
      id: item.document.id,
      title: item.document.name,
      content: item.document.content ?? "",
      score: item.score
    }));
}

export function getKnowledgeEmbeddingModel() {
  return getServerConfig().ai.knowledgeEmbeddingModel;
}
