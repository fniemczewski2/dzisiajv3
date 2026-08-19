// lib/server/pdfCanvasGlobals.ts

class FallbackDOMMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;

  constructor(init?: number[] | string) {
    if (Array.isArray(init) && init.length >= 6) {
      [this.a, this.b, this.c, this.d, this.e, this.f] = init;
    }
  }

  get isIdentity(): boolean {
    return this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0;
  }

  private static from(values: number[]): FallbackDOMMatrix {
    return new FallbackDOMMatrix(values);
  }

  multiply(other: FallbackDOMMatrix): FallbackDOMMatrix {
    return FallbackDOMMatrix.from([
      this.a * other.a + this.c * other.b,
      this.b * other.a + this.d * other.b,
      this.a * other.c + this.c * other.d,
      this.b * other.c + this.d * other.d,
      this.a * other.e + this.c * other.f + this.e,
      this.b * other.e + this.d * other.f + this.f,
    ]);
  }

  translate(tx = 0, ty = 0): FallbackDOMMatrix {
    return this.multiply(FallbackDOMMatrix.from([1, 0, 0, 1, tx, ty]));
  }

  scale(sx = 1, sy = sx): FallbackDOMMatrix {
    return this.multiply(FallbackDOMMatrix.from([sx, 0, 0, sy, 0, 0]));
  }

  inverse(): FallbackDOMMatrix {
    const det = this.a * this.d - this.b * this.c;
    if (det === 0) {
      return FallbackDOMMatrix.from([Number.NaN, Number.NaN, Number.NaN, Number.NaN, Number.NaN, Number.NaN]);
    }

    return FallbackDOMMatrix.from([
      this.d / det,
      -this.b / det,
      -this.c / det,
      this.a / det,
      (this.c * this.f - this.d * this.e) / det,
      (this.b * this.e - this.a * this.f) / det,
    ]);
  }

  toString(): string {
    return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`;
  }
}

let ready: Promise<void> | undefined;

async function install(): Promise<void> {
  if ((globalThis as { DOMMatrix?: unknown }).DOMMatrix !== undefined) return;

  const target = globalThis as Record<string, unknown>;

  try {
    const canvas = await import("@napi-rs/canvas");
    target.DOMMatrix ??= canvas.DOMMatrix;
    target.ImageData ??= canvas.ImageData;
    target.Path2D ??= canvas.Path2D;
    return;
  } catch (error) {
    console.warn(
      "[pdfCanvasGlobals] @napi-rs/canvas niedostępne, używam awaryjnej macierzy:",
      error instanceof Error ? error.message : error
    );
  }

  target.DOMMatrix ??= FallbackDOMMatrix;
}

export function ensurePdfCanvasGlobals(): Promise<void> {
  ready ??= install();
  return ready;
}

export { FallbackDOMMatrix };