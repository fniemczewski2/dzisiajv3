// components/ui/QrCode.tsx
//
// Kod QR ładowany dopiero przy pierwszym wyświetleniu (qrcode.react nie trafia do głównego pakietu).

import dynamic from "next/dynamic";

interface QrCodeProps {
  value: string;
  size: number;
}

const QRCodeSVG = dynamic(() => import("qrcode.react").then((module) => module.QRCodeSVG), {
  ssr: false,
  loading: () => <div className="animate-pulse rounded-lg bg-surface" aria-hidden="true" />,
});

export default function QrCode({ value, size }: Readonly<QrCodeProps>) {
  return (
    <div style={{ width: size, height: size }}>
      <QRCodeSVG value={value} size={size} level="M" />
    </div>
  );
}
