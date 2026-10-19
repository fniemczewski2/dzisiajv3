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
  ListPlus,
  RefreshCw,
} from "lucide-react";
import { actionButton, actionIcon, ACTION_LABEL_CLASS } from "./actionButtonVariants";

export const ConfirmButton = ({
  onClick,
  small = false,
  label,
}: {
  onClick: () => void;
  small?: boolean;
  label: string;
}) => (
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
  ariaLabel = "Usuń",
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
    className={actionButton({ color: "danger", size: small ? "small" : "default" })}
    aria-label={ariaLabel}
  >
    <Trash2 className={actionIcon(small)} />
    {!small && <span className={ACTION_LABEL_CLASS}>Usuń</span>}
  </button>
);

export const NotifyButton = ({
  onClick,
  small = false,
  disabled = false,
}: {
  onClick: () => void;
  small?: boolean;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "info", size: small ? "small" : "default" })}
    aria-label="Powiadom"
  >
    {disabled ? <Bell className={actionIcon(small)} /> : <BellOff className={actionIcon(small)} />}
    {!small && <span className={ACTION_LABEL_CLASS}>Powiadom</span>}
  </button>
);

export const EditButton = ({
  onClick,
  small = false,
  disabled = false,
  ariaLabel = "Edytuj",
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
    className={actionButton({ color: "info", size: small ? "small" : "default" })}
    aria-label={ariaLabel}
  >
    <Edit2 className={actionIcon(small)} />
    {!small && <span className={ACTION_LABEL_CLASS}>Edytuj</span>}
  </button>
);

export const FavButton = ({
  onClick,
  small = false,
  label = "Dodaj do ulubionych",
}: {
  onClick: () => void;
  small?: boolean;
  label?: string;
}) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "info", size: small ? "small" : "default" })}
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
    className={actionButton({ color: "warning" })}
    aria-label="Przesuń na jutro"
    title="Przesuń na jutro"
  >
    <ChevronsRight className={actionIcon()} />
    <span className={ACTION_LABEL_CLASS}>{loading ? "..." : "Odłóż"}</span>
  </button>
);

export const TimerButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "success" })}
    aria-label="Uruchom timer"
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
    className={actionButton({ color: "info" })}
    aria-label="Udostępnij"
    title="Udostępnij"
  >
    <Share className={actionIcon(small)} />
    {!small && <span className={ACTION_LABEL_CLASS}>Wyślij</span>}
  </button>
);

export const PinButton = ({ onClick, isPinned }: { onClick: () => void; isPinned: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "info" })}
    title={isPinned ? "Odepnij" : "Przypnij"}
    aria-label={isPinned ? "Odepnij" : "Przypnij"}
  >
    <Pin className={`${actionIcon()} ${isPinned ? "fill-primary" : ""}`} />
    <span className={ACTION_LABEL_CLASS}>{isPinned ? "Odepnij" : "Przypnij"}</span>
  </button>
);

export const ArchiveButton = ({ onClick, isArchived }: { onClick: () => void; isArchived: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "success" })}
    title={isArchived ? "Przywróć z archiwum" : "Zarchiwizuj"}
    aria-label={isArchived ? "Przywróć z archiwum" : "Zarchiwizuj"}
  >
    <Archive className={actionIcon()} />
    <span className={ACTION_LABEL_CLASS}>{isArchived ? "Pokaż" : "Ukryj"}</span>
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
    className={actionButton({ color: "info" })}
    title="Do obejrzenia"
    aria-label="Do obejrzenia"
  >
    <Eye className={actionIcon()} />
    <span className={ACTION_LABEL_CLASS}>Obejrzyj</span>
  </button>
);

export const ToTasksButton = ({
  onClick,
  pending,
  expanded,
}: {
  onClick: () => void;
  pending: number;
  expanded: boolean;
}) => (
  <button
    onClick={onClick}
    type="button"
    aria-expanded={expanded}
    className={actionButton({ color: expanded ? "active" : "warning" })}
    title={pending > 0 ? `Dodaj zadania z protokołu do Zadań (${pending})` : "Zadania z protokołu są już w Zadaniach"}
  >
    <ListPlus className={actionIcon()} aria-hidden="true" />
    <span className={ACTION_LABEL_CLASS}>{`Zadania`}</span>
  </button>
);

export const DownloadButton = ({ onClick, fileFormat }: { onClick: () => void; fileFormat: string }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "success" })}
    aria-label={`Pobierz plik ${fileFormat}`}
    title={`Pobierz plik ${fileFormat}`}
  >
    <Download className={actionIcon()} />
    <span className={ACTION_LABEL_CLASS}>{fileFormat}</span>
  </button>
);

export const UploadButton = ({
  onClick,
  fileFormat,
  small,
  busy = false,
  ariaLabel,
}: {
  onClick: () => void;
  fileFormat?: string;
  small?: boolean;
  busy?: boolean;
  /** Nazwa dla czytników ekranu, gdy przycisk dotyczy konkretnego pliku lub pola. */
  ariaLabel?: string;
}) => (
  <button
    onClick={onClick}
    type="button"
    disabled={busy}
    aria-busy={busy}
    className={actionButton({ color: "success", size: small ? "small" : "default" })}
    aria-label={ariaLabel ?? (fileFormat ? `Prześlij plik ${fileFormat}` : "Importuj plik")}
    title={ariaLabel ?? (fileFormat ? `Prześlij plik ${fileFormat}` : "Importuj plik")}
  >
    <Upload className={actionIcon()} />
    {!small && <span className={ACTION_LABEL_CLASS}>{fileFormat}</span>}
  </button>
);

export const CopyButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "info" })}
    title="Kopiuj"
    aria-label="Kopiuj"
  >
    <Copy className={actionIcon()} />
    <span className={ACTION_LABEL_CLASS}>Kopiuj</span>
  </button>
);

export const UndoButton = ({ onClick, small = false }: { onClick: () => void; small?: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "info", size: small ? "small" : "default" })}
    aria-label="Oznacz jako niewykonane"
    title="Oznacz jako niewykonane"
  >
    <RotateCcw className={actionIcon(small)} />
    {!small && <span className={ACTION_LABEL_CLASS}>Przywróć</span>}
  </button>
);

export const RefreshButton = ({ onClick, small = false }: { onClick: () => void; small?: boolean }) => (
  <button
    onClick={onClick}
    type="button"
    className={actionButton({ color: "info", size: small ? "small" : "default" })}
    aria-label="Odśwież"
    title="Odśwież"
  >
    <RefreshCw className={actionIcon(small)} />
    {!small && <span className={ACTION_LABEL_CLASS}>Przywróć</span>}
  </button>
);
