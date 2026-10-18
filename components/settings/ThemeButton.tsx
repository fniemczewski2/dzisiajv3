// components/settings/ThemeButton.tsx

import { useIsClient } from "@/hooks/useIsClient";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const mounted = useIsClient();
  const { theme, setTheme } = useTheme();

  if (!mounted) {
    return <div className="h-6 w-6" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-lg bg-surface-hover p-2 text-text transition-colors"
      aria-label="Przełącz tryb ciemny"
      type="button"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
