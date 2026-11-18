// lib/prices/pdfPages.ts
//
// Renderowanie stron PDF na płótna (canvas) do rozpoznawania tekstu. Paragony w PDF (np. Biedronka) są obrazami bez
// warstwy tekstowej, więc trzeba je narysować. Biblioteka ładuje się dopiero przy pierwszym PDF.

import { PRICE_OCR } from "@/config/constants";

export type CanvasFactory = (width: number, height: number) => HTMLCanvasElement;

const browserCanvas: CanvasFactory = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export async function renderPdfPages(
  data: ArrayBuffer,
  scale: number = PRICE_OCR.pdfScale,
  createCanvas: CanvasFactory = browserCanvas
): Promise<HTMLCanvasElement[]> {
  const pdfjs = await import("pdfjs-dist");
  // Worker jako moduł zbudowany przez webpacka (wzorzec `new Worker(new URL(...))`); działa na własnym origin (CSP: worker-src 'self').
  pdfjs.GlobalWorkerOptions.workerPort ??= new Worker(
    new URL("../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
    {
      type: "module",
    }
  );

  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  const pdf = await task.promise;
  const pages: HTMLCanvasElement[] = [];
  try {
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      await page.render({ canvas, viewport }).promise;
      pages.push(canvas);
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return pages;
}
