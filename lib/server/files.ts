import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { getServerConfig } from "@/lib/server/config";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function saveUploadedFile(file: File) {
  const { files } = getServerConfig();
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${randomUUID()}-${sanitizeFileName(file.name)}`;

  if (files.provider === "vercel-blob") {
    if (!files.blobReadWriteToken) {
      throw new Error("Missing BLOB_READ_WRITE_TOKEN for Vercel Blob uploads");
    }

    const blob = await put(`uploads/${fileName}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type || undefined,
      token: files.blobReadWriteToken
    });

    return {
      url: blob.url,
      buffer
    };
  }

  await mkdir(files.localUploadDir, { recursive: true });
  const absolutePath = path.join(files.localUploadDir, fileName);
  await writeFile(absolutePath, buffer);

  return {
    url: `${files.localUploadUrlBase}/${fileName}`,
    buffer
  };
}

async function extractPdfText(buffer: Buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false
  });
  const document = await task.promise;

  try {
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (pageText.length > 0) {
        pages.push(pageText);
      }
    }

    return pages.join("\n").trim();
  } finally {
    await document.destroy();
  }
}

export async function extractTextContent(file: File, sourceBuffer?: Buffer) {
  const mimeType = file.type;
  const fileName = file.name.toLowerCase();
  const isPdf = mimeType === "application/pdf" || fileName.endsWith(".pdf");

  const isTextLike =
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "text/csv" ||
    fileName.endsWith(".md") ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".csv") ||
    fileName.endsWith(".json");

  if (isPdf) {
    const buffer = sourceBuffer ?? Buffer.from(await file.arrayBuffer());
    const text = await extractPdfText(buffer);
    return text.length > 0 ? text : null;
  }

  if (!isTextLike) {
    return null;
  }

  return file.text();
}
