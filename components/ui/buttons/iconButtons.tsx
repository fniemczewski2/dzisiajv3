// components/ui/buttons/iconButtons.tsx
// Split out of the former CommonButtons.tsx: the family of small icon+label
// action buttons (Delete/Edit/Confirm/Pin/Archive/...) that all share the
// `actionButton` cva variant from ./actionButtonVariants.

import React from "react";
import {
  Trash2,
  Edit2,
  ChevronsRight,
  Timer,
  Share,
  Check,
  Archive,
  Pin,
  Eye,
  Download,
  Star,
  Bell,
  BellOff,
  Copy,
  ChartNoAxesCombined,
} from "lucide-react";
import { actionButton, actionIcon, ACTION_LABEL_CLASS } from "./actionButtonVariants";

export const ConfirmButton = ({ onClick, small = false, label = "OK" }: { onClick: () => void; small?: boolean; label: string }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "active", size: small ? "small" : "default" })}
    aria-label={label}
  >
    <Check className={actionIcon(small)} />
    {!small && <span className={ACTION_LABEL_CLASS}>{label}</span>}
  </button>
);

export const DeleteButton = ({ onClick, small = false }: { onClick: () => void; small?: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "red", size: small ? "small" : "default" })}
    aria-label="usuń"
  >
    <Trash2 className={actionIcon(small)} />
    {!small && <span className={ACTION_LABEL_CLASS}>Usuń</span>}
  </button>
);

export const NotifyButton = ({ onClick, small = false, disabled = false }: { onClick: () => void; small?: boolean; disabled?: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "blue", size: small ? "small" : "default" })}
    aria-label="powiadom"
  >
    {disabled ? (
      <Bell className={actionIcon(small)} />
    ) : (
      <BellOff className={actionIcon(small)} />
    )}
    {!small && <span className={ACTION_LABEL_CLASS}>Powiadom</span>}
  </button>
);

export const EditButton = ({ onClick, small = false }: { onClick: () => void; small?: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "blue", size: small ? "small" : "default" })}
    aria-label="edytuj"
  >
    <Edit2 className={actionIcon(small)} />
    {!small && <span className={ACTION_LABEL_CLASS}>Edytuj</span>}
  </button>
);

export const FavButton = ({ onClick, small = false }: { onClick: () => void; small?: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "blue", size: small ? "small" : "default" })}
    aria-label="dodaj do ulubionych"
    title="Dodaj do ulubionych"
  >
    <Star className={actionIcon(small)} />
    {!small && <span className={ACTION_LABEL_CLASS}>Dodaj</span>}
  </button>
);

export const RescheduleButton = ({ onClick, loading }: { onClick: () => void; loading?: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    disabled={loading}
    className={actionButton({ color: "yellow" })}
    aria-label="przesuń na jutro"
    title="Przesuń na jutro"
  >
    <ChevronsRight className={actionIcon()} />
    <span className={ACTION_LABEL_CLASS}>
      {loading ? '...' : 'Odłóż'}
    </span>
  </button>
);

export const TimerButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "purple" })}
    aria-label="uruchom timer"
    title="Uruchom timer Pomodoro"
  >
    <Timer className={actionIcon()} />
    <span className={ACTION_LABEL_CLASS}>Timer</span>
  </button>
);

export const ShareButton = ({ onClick, small = false }: { onClick: () => void; small?: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "blue" })}
    aria-label="udostępnij"
    title="Udostępnij"
  >
    <Share className={actionIcon(small)} />
    {!small && <span className={ACTION_LABEL_CLASS}>Wyślij</span>}
  </button>
);

export const ShowResultsButton = ({ href, small = false }: { href: string; small?: boolean }) => (
  <a
    href={href}
    className={actionButton({ color: "blue" })}
    aria-label="pokaż wyniki"
    title="Pokaż wyniki"
  >
    <ChartNoAxesCombined className={actionIcon(small)} />
    {!small && <span className={ACTION_LABEL_CLASS}>Wyniki</span>}
  </a>
);

export const PinButton = ({ onClick, isPinned }: { onClick: () => void; isPinned: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "blue" })}
    title={isPinned ? "Odepnij" : "Przypnij"}
    aria-label={isPinned ? "Odepnij" : "Przypnij"}
  >
    <Pin className={`${actionIcon()} ${isPinned ? "fill-primary" : ""}`} />
    <span className={ACTION_LABEL_CLASS}>
      {isPinned ? "Odepnij" : "Przypnij"}
    </span>
  </button>
);

export const ArchiveButton = ({ onClick, isArchived }: { onClick: () => void; isArchived: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "purple" })}
    title={isArchived ? "Przywróć z archiwum" : "Zarchiwizuj"}
    aria-label={isArchived ? "Przywróć z archiwum" : "Zarchiwizuj"}
  >
    <Archive className={actionIcon()} />
    <span className={ACTION_LABEL_CLASS}>
      {isArchived ? "Pokaż" : "Ukryj"}
    </span>
  </button>
);

export const WatchButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "active" })}
    title="Obejrzane"
    aria-label="Obejrzane"
  >
    <Check className={actionIcon()} />
    <span className={ACTION_LABEL_CLASS}>Obejrzane</span>
  </button>
);

export const UnwatchButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "blue" })}
    title="Do obejrzenia"
    aria-label="Do obejrzenia"
  >
    <Eye className={actionIcon()} />
    <span className={ACTION_LABEL_CLASS}>Obejrzyj</span>
  </button>
);

export const PdfButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "purple" })}
    aria-label="Generuj PDF"
    title="Generuj PDF"
  >
    <Download className={actionIcon()} />
    <span className={ACTION_LABEL_CLASS}>PDF</span>
  </button>
);

export const DownloadButton = ({ onClick, fileFormat }: { onClick: () => void, fileFormat: string }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "purple" })}
    aria-label={`Pobierz plik ${fileFormat}`}
    title={`Pobierz plik ${fileFormat}`}
  >
    <Download className={actionIcon()} />
    <span className={ACTION_LABEL_CLASS}>{fileFormat}</span>
  </button>
);

export const CopyButton = ({ onClick}: { onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "blue" })}
    title="Kopiuj"
    aria-label="Kopiuj"
  >
    <Copy className={actionIcon()} />
    <span className={ACTION_LABEL_CLASS}>
      Kopiuj
    </span>
  </button>
);
