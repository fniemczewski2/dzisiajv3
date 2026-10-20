// components/ui/SearchBar.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Clock, X } from "lucide-react";
import { MAX_SEARCH_HISTORY, MAX_SEARCH_SUGGESTIONS } from "@/config/limits";

function useSessionHistory() {
  const [history, setHistory] = useState<string[]>([]);

  const add = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setHistory((prev) => {
      const deduped = prev.filter((s) => s !== trimmed);
      return [trimmed, ...deduped].slice(0, MAX_SEARCH_HISTORY);
    });
  }, []);

  const clear = useCallback(() => setHistory([]), []);

  return { history, add, clear };
}

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
}: Readonly<SearchBarProps>) {
  const [isFocused, setIsFocused] = useState(false);
  const { history, add: addToHistory, clear: clearHistory } = useSessionHistory();

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      onChange(suggestion);
      addToHistory(suggestion);
      setIsFocused(false);
      onSuggestionClick?.(suggestion);
    },
    [onChange, addToHistory, onSuggestionClick]
  );

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

  const handleClear = useCallback(() => {
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        event.target instanceof Node &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current?.contains(event.target)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSuggestions = value
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase())).slice(0, MAX_SEARCH_SUGGESTIONS)
    : [];

  const showDropdown = isFocused && (history.length > 0 || filteredSuggestions.length > 0);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder || "Szukaj"}
          autoComplete="off"
          spellCheck={false}
          className="card w-full py-2.5 pr-10 pl-11 text-text shadow-sm transition-all focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-1/2 right-3.5 -translate-y-1/2 text-text-muted transition-colors hover:text-text"
            aria-label="Wyczyść wyszukiwanie"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {value && resultsCount !== undefined && (
        <p className="mt-2.5 pl-1 text-sm font-medium text-text-secondary">
          {resultsLabel ?? `Znaleziono: ${resultsCount}`}
        </p>
      )}

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="card absolute z-50 mt-2 max-h-64 w-full scrollbar-thin overflow-y-auto shadow-lg"
        >
          {!value && history.length > 0 && (
            <div className="p-2">
              <div className="mb-1 flex items-center justify-between px-3 py-2">
                <span className="text-xs font-bold text-text-muted">Ostatnie wyszukiwania</span>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-xs font-semibold text-text-muted transition-colors hover:text-text"
                >
                  Wyczyść
                </button>
              </div>
              {history.map((query) => (
                <button
                  key={`history-${query}`}
                  type="button"
                  onClick={() => handleSuggestionClick(query)}
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface"
                >
                  <Clock className="h-4 w-4 shrink-0 text-text-muted transition-colors group-hover:text-primary" />
                  <span className="truncate font-medium text-text">{query}</span>
                </button>
              ))}
            </div>
          )}

          {value && filteredSuggestions.length > 0 && (
            <div className="p-2">
              <div className="mb-1 px-3 py-2">
                <span className="text-xs font-bold text-text-muted">Sugestie</span>
              </div>
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={`suggestion-${suggestion}`}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface"
                >
                  <Search className="h-4 w-4 shrink-0 text-text-muted transition-colors group-hover:text-primary" />
                  <span className="truncate font-medium text-text">{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
