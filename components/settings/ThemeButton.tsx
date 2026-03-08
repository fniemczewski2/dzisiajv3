// components/ThemeToggle.tsx
"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react"; // Zastąp swoimi ikonami, jeśli używasz innych

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect zapobiega błędom hydratacji (Next.js vs renderowanie po stronie klienta)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-6 h-6" />; // Zastępczy pusty div o rozmiarze ikony, by layout nie skakał
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors"
      aria-label="Przełącz tryb ciemny"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}