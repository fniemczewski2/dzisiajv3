// components/features/FeatureStatusBadge.tsx

import { FEATURE_STATUS_LABEL, type FeatureStatus } from "@/config/features";

const STYLES: Record<FeatureStatus, string> = {
  nowe: "bg-green-100 text-green-800 ring-green-600/20 dark:bg-green-900/50 dark:text-green-200 dark:ring-green-400/30",
  zmienione: "bg-blue-50 text-blue-800 ring-blue-600/20 dark:bg-blue-900/50 dark:text-blue-200 dark:ring-blue-400/30",
};

export default function FeatureStatusBadge({ status, since }: Readonly<{ status: FeatureStatus; since?: string }>) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[status]}`}
      title={since ? `${FEATURE_STATUS_LABEL[status]} w wersji ${since}` : undefined}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {FEATURE_STATUS_LABEL[status]}
    </span>
  );
}
