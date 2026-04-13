import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
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

export async function saveBrowserFile(file: File) {
  const { files } = getServerConfig();
  const buffer = Buffer.from(await file.arrayBuffer());
  await mkdir(files.publicUploadDir, { recursive: true });
  const fileName = `${randomUUID()}-${sanitizeFileName(file.name)}`;
  const absolutePath = path.join(files.publicUploadDir, fileName);
  await writeFile(absolutePath, buffer);

  return {
    url: `${files.publicUploadUrlBase}/${fileName}`,
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
