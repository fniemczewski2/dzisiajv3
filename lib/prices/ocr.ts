// lib/prices/ocr.ts
//
// Rozpoznawanie tekstu paragonów w przeglądarce (tesseract.js): plik nie opuszcza urządzenia, na serwer trafiają
// dopiero zatwierdzone pozycje i ceny. Biblioteka i model ładują się dopiero przy pierwszym użyciu.

import type { OEM, PSM } from "tesseract.js";
import { PRICE_OCR } from "@/config/constants";
import { renderPdfPages } from "./pdfPages";

export interface OcrProgress {
  fileName: string;
  /** Numer pliku (od 1) i liczba plików. */
  index: number;
  total: number;
  stage: "load" | "render" | "recognize";
  /** 0 do 1 dla etapu „recognize”. */
  fraction?: number;
}

export interface OcrResult {
  fileName: string;
  text: string;
}

const isPdf = (file: File) => file.type === "application/pdf" || /\.pdf$/i.test(file.name);

export async function recognizeReceipts(
  files: readonly File[],
  onProgress?: (progress: OcrProgress) => void
): Promise<OcrResult[]> {
  if (files.length === 0) return [];
  const total = files.length;
  let current = { fileName: "", index: 0 };
  const report = (stage: OcrProgress["stage"], fraction?: number) =>
    onProgress?.({ ...current, total, stage, fraction });

  current = { fileName: files[0].name, index: 1 };
  report("load");
  const { createWorker, PSM: Psm, OEM: Oem } = await import("tesseract.js");
  const worker = await createWorker(PRICE_OCR.language, Oem.LSTM_ONLY as OEM, {
    workerPath: PRICE_OCR.workerPath,
    corePath: PRICE_OCR.corePath,
    langPath: PRICE_OCR.langPath,
    logger: (message) => {
      if (message.status === "recognizing text") report("recognize", message.progress);
    },
  });

  try {
    // Jeden blok tekstu: paragon to kolumny z tekstu jednolitego, a nie układ strony.
    await worker.setParameters({ tessedit_pageseg_mode: Psm.SINGLE_BLOCK as PSM });

    const results: OcrResult[] = [];
    for (const [position, file] of files.entries()) {
      current = { fileName: file.name, index: position + 1 };
      const images: (File | HTMLCanvasElement)[] = [];
      if (isPdf(file)) {
        report("render");
        images.push(...(await renderPdfPages(await file.arrayBuffer())));
      } else {
        images.push(file);
      }

      const texts: string[] = [];
      for (const image of images) {
        report("recognize", 0);
        const { data } = await worker.recognize(image);
        texts.push(data.text);
      }
      results.push({ fileName: file.name, text: texts.join("\n") });
    }
    return results;
  } finally {
    await worker.terminate();
  }
}
