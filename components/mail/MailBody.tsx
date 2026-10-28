// components/mail/MailBody.tsx
//
// Treść wiadomości. HTML: izolowana ramka (sandbox bez allow-scripts – skrypty z maila nie działają,
// linki otwierają się w nowej karcie), wysokość dopasowana do treści, zdalne obrazy po zgodzie.
// Tekst: klikalne adresy i zawijanie długich ciągów.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { linkifyText } from "@/lib/noteFormatting";
import { prepareEmailHtml } from "@/lib/mail/emailHtml";

interface Props {
  html: string | null;
  text: string;
  inlineImages?: Record<string, string>;
  keyPrefix: string;
}

const MIN_FRAME_HEIGHT = 120;

export default function MailBody({ html, text, inlineImages, keyPrefix }: Readonly<Props>) {
  const [showImages, setShowImages] = useState(false);
  const [height, setHeight] = useState(MIN_FRAME_HEIGHT);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const prepared = useMemo(
    () => (html ? prepareEmailHtml(html, { inlineImages, showRemoteImages: showImages }) : null),
    [html, inlineImages, showImages]
  );

  const measure = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (doc?.documentElement) setHeight(Math.max(MIN_FRAME_HEIGHT, doc.documentElement.scrollHeight));
  }, []);

  const onLoad = () => {
    measure();
    observerRef.current?.disconnect();
    const body = frameRef.current?.contentDocument?.body;
    if (body && typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(body);
      observerRef.current = observer;
    }
  };

  useEffect(() => () => observerRef.current?.disconnect(), []);

  if (!prepared) {
    return (
      <div className="min-w-0 rounded-lg bg-surface p-3 text-sm wrap-anywhere whitespace-pre-wrap text-text">
        {text ? linkifyText(text, keyPrefix) : "(brak treści)"}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-2">
      {prepared.blockedImages > 0 && !showImages && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text-secondary">
          <span className="flex min-w-0 items-center gap-2">
            <ImageOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Obrazy zewnętrzne ukryte ({prepared.blockedImages}). Mogą informować nadawcę o otwarciu wiadomości.
            </span>
          </span>
          <button
            type="button"
            onClick={() => setShowImages(true)}
            className="min-h-11 rounded-lg border border-line-strong px-3 text-sm font-semibold text-text hover:bg-surface-hover"
          >
            Pokaż obrazy
          </button>
        </div>
      )}
      <iframe
        ref={frameRef}
        title="Treść wiadomości"
        srcDoc={prepared.document}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        onLoad={onLoad}
        style={{ height }}
        className="block w-full rounded-lg border border-line bg-white"
      />
    </div>
  );
}
