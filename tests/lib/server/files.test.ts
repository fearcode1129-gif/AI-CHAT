import { beforeEach, describe, expect, it, vi } from "vitest";

const getDocumentMock = vi.fn();
const getPageMock = vi.fn();
const getTextContentMock = vi.fn();
const destroyMock = vi.fn();

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument: getDocumentMock
}));

describe("extractTextContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTextContentMock.mockReset();
    getPageMock.mockReset();
    getDocumentMock.mockReset();
    destroyMock.mockReset();

    getPageMock.mockResolvedValue({
      getTextContent: getTextContentMock
    });

    getDocumentMock.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: getPageMock,
        destroy: destroyMock
      })
    });
  });

  it("extracts text from pdf files", async () => {
    const { extractTextContent } = await import("@/lib/server/files");
    const file = new File([new Uint8Array([1, 2, 3])], "resume.pdf", {
      type: "application/pdf"
    });

    getTextContentMock.mockResolvedValueOnce({
      items: [{ str: "Resume" }, { str: "content" }, { str: "from" }, { str: "pdf" }]
    });

    await expect(extractTextContent(file, Buffer.from([1, 2, 3]))).resolves.toBe(
      "Resume content from pdf"
    );
    expect(getDocumentMock).toHaveBeenCalledOnce();
    expect(destroyMock).toHaveBeenCalledOnce();
  });

  it("returns plain text for text-like files", async () => {
    const { extractTextContent } = await import("@/lib/server/files");
    const file = new File(["hello"], "note.txt", { type: "text/plain" });

    await expect(extractTextContent(file)).resolves.toBe("hello");
  });
});
