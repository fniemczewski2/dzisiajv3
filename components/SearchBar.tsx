// components/SearchBar.tsx

"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Clock, X } from "lucide-react";

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
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSuggestions = value
    ? suggestions
        .filter((s) => s.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5)
    : [];

  const showDropdown =
    isFocused && (history.length > 0 || filteredSuggestions.length > 0);

  return (
    <div className={`relative ${className}`}>

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

      {value && resultsCount !== undefined && (
        <p className="text-sm font-medium text-textSecondary mt-2.5 pl-1">
          {resultsLabel ?? `Znaleziono: ${resultsCount}`}
        </p>
      )}

      {showDropdown && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label="Podpowiedzi wyszukiwania"
          className="absolute z-50 w-full mt-2 card rounded-xl shadow-lg max-h-64 overflow-y-auto custom-scrollbar"
        >

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