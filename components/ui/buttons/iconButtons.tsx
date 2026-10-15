// components/ui/buttons/iconButtons.tsx

import React from "react";
import {
  RotateCcw,
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
  Upload,
  Star,
  Bell,
  BellOff,
  Copy,
  ChartNoAxesCombined, ListPlus } from "lucide-react";
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

export const DeleteButton = ({
  onClick,
  small = false,
  disabled = false,
  ariaLabel = "usuń",
}: {
  onClick: () => void;
  small?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) => (
  <button
    onClick={onClick}
    type="button"
    disabled={disabled}
    className={actionButton({ color: "red", size: small ? "small" : "default" })}
    aria-label={ariaLabel}
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

export const EditButton = ({
  onClick,
  small = false,
  disabled = false,
  ariaLabel = "edytuj",
}: {
  onClick: () => void;
  small?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) => (
  <button
    onClick={onClick}
    type="button"
    disabled={disabled}
    className={actionButton({ color: "blue", size: small ? "small" : "default" })}
    aria-label={ariaLabel}
  >
    <Edit2 className={actionIcon(small)} />
    {!small && <span className={ACTION_LABEL_CLASS}>Edytuj</span>}
  </button>
);

export const FavButton = ({ onClick, small = false, label = "dodaj do ulubionych" }: { onClick: () => void; small?: boolean; label?: string }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "blue", size: small ? "small" : "default" })}
    aria-label={label}
    title={label}
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

export const ToTasksButton = ({ onClick, pending, expanded }: { onClick: () => void; pending: number; expanded: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    aria-expanded={expanded}
    className={actionButton({ color: expanded ? "active" : "yellow" })}
    title={pending > 0 ? `Dodaj zadania z protokołu do Zadań (${pending})` : "Zadania z protokołu są już w Zadaniach"}
  >
    <ListPlus className={actionIcon()} aria-hidden="true" />
    <span className={ACTION_LABEL_CLASS}>{`Zadania`}</span>
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

export const UploadButton = ({ onClick, fileFormat, small }: { onClick: () => void, fileFormat: string, small?: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "purple", size: small ? "small" : "default" })}
    aria-label={`Prześlij plik ${fileFormat}`}
    title={`Prześlij plik ${fileFormat}`}
  >
    <Upload className={actionIcon()} />
    {!small && <span className={ACTION_LABEL_CLASS}>{fileFormat}</span>}
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

export const UndoButton = ({ onClick, small = false }: { onClick: () => void; small?: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "blue", size: small ? "small" : "default" })}
    aria-label="Oznacz jako niewykonane"
    title="Oznacz jako niewykonane"
  >
    <RotateCcw className={actionIcon(small)} />
    {!small && <span className={ACTION_LABEL_CLASS}>Przywróć</span>}
  </button>
);
