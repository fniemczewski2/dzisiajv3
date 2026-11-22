// lib/server/ticketPdf.ts
//
// Tekst z PDF biletu (pdf-parse). Tylko serwer: wymaga atrapy canvas (lib/server/pdfCanvasGlobals.ts).

import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ensurePdfCanvasGlobals } from "@/lib/server/pdfCanvasGlobals";

/**
 * pdfjs sam szuka pliku workera i w bundlu funkcji serverless trafia na ścieżkę, której tam nie ma
 * („Setting up fake worker failed: Cannot find module …”). Wskazujemy plik jawnie, z pakietów, które
 * next.config.mjs (PDF_RUNTIME_FILES) dokłada do bundla.
 */
const WORKER_CANDIDATES = [
  "node_modules/pdf-parse/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
  "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
  "node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs",
];

let workerSet = false;

function configureWorker(PDFParse: { setWorker: (src: string) => unknown }): void {
  if (workerSet) return;
  workerSet = true;
  // Pakiety są zewnętrzne wobec bundla (serverExternalPackages), więc leżą obok funkcji w node_modules.
  for (const candidate of WORKER_CANDIDATES) {
    const path = join(process.cwd(), candidate);
    if (!existsSync(path)) continue;
    try {
      PDFParse.setWorker(pathToFileURL(path).href);
      return;
    } catch {
      // Następny kandydat; przy braku wszystkich zostaje domyślne zachowanie pdfjs.
    }
  }
}

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
    configureWorker(PDFParse as unknown as { setWorker: (src: string) => unknown });
    parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    throw new PdfReadError(error);
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}
