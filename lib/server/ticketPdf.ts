// lib/server/ticketPdf.ts
//
// Tekst z PDF biletu (pdf-parse). Tylko serwer: wymaga atrapy canvas (lib/server/pdfCanvasGlobals.ts).

import { ensurePdfCanvasGlobals } from "@/lib/server/pdfCanvasGlobals";

export class PdfReadError extends Error {
  constructor(readonly cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
  }
}

export async function extractPdfText(dataBuffer: Buffer): Promise<string> {
  let parser: { getText: () => Promise<{ text: string }>; destroy: () => Promise<void> } | undefined;
  try {
    await ensurePdfCanvasGlobals();

    const { PDFParse } = await import("pdf-parse");
    parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    throw new PdfReadError(error);
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}
