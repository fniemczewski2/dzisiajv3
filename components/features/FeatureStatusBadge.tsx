// components/features/FeatureStatusBadge.tsx

import { FEATURE_STATUS_LABEL, type FeatureStatus } from "@/config/features";

const STYLES: Record<FeatureStatus, string> = {
  nowe: "bg-success-soft text-success ring-success/20 ",
  zmienione: "bg-info-soft text-info ring-info/20 ",
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
