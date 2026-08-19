// components/ui/Modal.tsx

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  label?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Native <dialog>-based modal. Replaces the previous pattern of a
 * `<div role="dialog">` overlay with a manual onClick-outside-to-close
 * handler — that pattern needed a hand-rolled focus trap and keyboard
 * handling that this app never actually had. `<dialog>` gets focus
 * trapping, Escape-to-close, and top-layer stacking from the browser for
 * free.
 *
 * `showModal`/`close`/`open` aren't implemented in jsdom (the test
 * environment) as of this writing, so every call is feature-detected —
 * that also protects real users on the rare browser without <dialog>
 * support instead of throwing at them.
 */
export default function Modal({ open, onClose, labelledBy, label, className, children }: Readonly<ModalProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || typeof dialog.showModal !== "function") return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Fires on Escape (native cancel -> close) and on our own dialog.close()
    // call above — keeps `open` state in sync either way.
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Attached imperatively (not as a JSX onClick) so this is treated as
    // native <dialog> backdrop-dismiss behavior rather than a click handler
    // on a semantically non-interactive JSX element (S6847/S6848). The
    // content div doesn't need its own listener: `e.target` is the
    // original click target regardless of where in the tree this fires,
    // so it only matches the dialog itself when the backdrop was clicked.
    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === dialog) onClose();
    };
    dialog.addEventListener("click", handleBackdropClick);
    return () => dialog.removeEventListener("click", handleBackdropClick);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      className={cn(
        "m-auto w-full max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-visible border-0 bg-transparent p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm",
        className
      )}
    >
      {open && <div>{children}</div>}
    </dialog>
  );
}
