// lib/errors.ts

/** Akcja wymaga zalogowania, a sesji nie ma (np. wygasła w innej karcie). */
export class NotSignedInError extends Error {
  constructor() {
    super("Zaloguj się ponownie, aby wykonać tę akcję.");
    this.name = "NotSignedInError";
  }
}
