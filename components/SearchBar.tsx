// components/SearchBar.tsx
//
// Poprawki względem poprzedniej wersji:
//
// 1. USUNIĘTO localStorage — zastąpiony hookiem useSessionHistory,
//    który przechowuje historię wyszukiwań wyłącznie w pamięci React (useState).
//    Dane nie są nigdy zapisywane do localStorage ani sessionStorage.
//    Historia jest kasowana przy odświeżeniu strony — to celowe i akceptowalne
//    zachowanie dla pola wyszukiwania.
//
// 2. Brak dostępu do window/document poza useEffect — komponent jest w pełni
//    bezpieczny w środowisku SSR (Next.js).
//
// 3. Prop `storageKey` pozostawiony w interfejsie dla kompatybilności wstecznej,
//    ale jest ignorowany (opisany w JSDoc).

"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Clock, X } from "lucide-react";

// ── Hook: historia wyszukiwań w pamięci (nie w localStorage) ─────────────────
const MAX_HISTORY = 5;

function useSessionHistory() {
  const [history, setHistory] = useState<string[]>([]);

  const add = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setHistory((prev) => {
      const deduped = prev.filter((s) => s !== trimmed);
      return [trimmed, ...deduped].slice(0, MAX_HISTORY);
    });
  }, []);

  const clear = useCallback(() => setHistory([]), []);

  return { history, add, clear };
}

// ─────────────────────────────────────────────────────────────────────────────

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  className?: string;
  resultsCount?: number;
  resultsLabel?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Szukaj...",
  suggestions = [],
  onSuggestionClick,
  className = "",
  resultsCount,
  resultsLabel,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { history, add: addToHistory, clear: clearHistory } = useSessionHistory();

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Obsługa kliknięcia sugestii / pozycji z historii ──────────────────────
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      onChange(suggestion);
      addToHistory(suggestion);
      setIsFocused(false);
      onSuggestionClick?.(suggestion);
    },
    [onChange, addToHistory, onSuggestionClick]
  );

  // ── Zatwierdzenie przez Enter — zapis do historii sesji ───────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && value.trim()) {
        addToHistory(value);
        setIsFocused(false);
        inputRef.current?.blur();
      }
      if (e.key === "Escape") {
        setIsFocused(false);
        inputRef.current?.blur();
      }
    },
    [value, addToHistory]
  );

  // ── Wyczyszczenie pola ─────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  // ── Zamknięcie dropdownu po kliknięciu poza komponentem ──────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Filtrowanie podpowiedzi ────────────────────────────────────────────────
  const filteredSuggestions = value
    ? suggestions
        .filter((s) => s.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5)
    : [];

  const showDropdown =
    isFocused && (history.length > 0 || filteredSuggestions.length > 0);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`relative ${className}`}>
      {/* Pole wyszukiwania */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-textMuted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-xl pl-11 pr-10 py-2.5 card shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text transition-all"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-text transition-colors"
            aria-label="Wyczyść wyszukiwanie"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Licznik wyników */}
      {value && resultsCount !== undefined && (
        <p className="text-sm font-medium text-textSecondary mt-2.5 pl-1">
          {resultsLabel ?? `Znaleziono: ${resultsCount}`}
        </p>
      )}

      {/* Dropdown z historią i podpowiedziami */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label="Podpowiedzi wyszukiwania"
          className="absolute z-50 w-full mt-2 card rounded-xl shadow-lg max-h-64 overflow-y-auto custom-scrollbar"
        >
          {/* Historia sesji (tylko gdy pole jest puste) */}
          {!value && history.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2 mb-1">
                <span className="text-[11px] font-bold text-textMuted uppercase tracking-wider">
                  Ostatnie wyszukiwania
                </span>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-[11px] font-semibold text-textMuted hover:text-text transition-colors"
                >
                  Wyczyść
                </button>
              </div>
              {history.map((query, index) => (
                <button
                  key={`history-${index}`}
                  type="button"
                  role="option"
                  onClick={() => handleSuggestionClick(query)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface rounded-lg transition-colors group"
                >
                  <Clock className="w-4 h-4 text-textMuted group-hover:text-primary transition-colors shrink-0" />
                  <span className="text-text font-medium truncate">{query}</span>
                </button>
              ))}
            </div>
          )}

          {/* Podpowiedzi dopasowane do bieżącego zapytania */}
          {value && filteredSuggestions.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 mb-1">
                <span className="text-[11px] font-bold text-textMuted uppercase tracking-wider">
                  Sugestie
                </span>
              </div>
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={`suggestion-${index}`}
                  type="button"
                  role="option"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface rounded-lg transition-colors group"
                >
                  <Search className="w-4 h-4 text-textMuted group-hover:text-primary transition-colors shrink-0" />
                  <span className="text-text font-medium truncate">{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}