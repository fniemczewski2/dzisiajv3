// components/SearchBar/SearchBar.tsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { Search, Clock, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
  className?: string;
  resultsCount?: number;
  resultsLabel?: string;
  storageKey?: string; // Key for storing recent searches
}

const MAX_RECENT_SEARCHES = 5;

export default function SearchBar({
  value,
  onChange,
  placeholder = "Szukaj...",
  suggestions = [],
  onSuggestionClick,
  className = "",
  resultsCount,
  resultsLabel,
  storageKey = "recent-searches",
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse recent searches", e);
        }
      }
    }
  }, [storageKey]);

  // Save search to recent searches
  const saveToRecent = (query: string) => {
    if (!query.trim() || typeof window === "undefined") return;

    const updated = [
      query,
      ...recentSearches.filter((s) => s !== query),
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // Clear recent searches
  const clearRecent = () => {
    setRecentSearches([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    saveToRecent(suggestion);
    setIsFocused(false);
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
  };

  // Handle search submit (Enter key)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      saveToRecent(value);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  // Clear search
  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  // Close dropdown when clicking outside
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

  // Filter suggestions based on current value
  const filteredSuggestions = suggestions
    .filter((s) => s.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 5);

  const showDropdown =
    isFocused && (recentSearches.length > 0 || filteredSuggestions.length > 0);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-xl border pl-10 pr-10 py-2 bg-white focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Wyczyść wyszukiwanie"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results count */}
      {value && resultsCount !== undefined && (
        <p className="text-sm text-gray-600 mt-2">
          {resultsLabel || `Znaleziono: ${resultsCount}`}
        </p>
      )}

      {/* Dropdown with suggestions and recent searches */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {/* Recent searches */}
          {!value && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1 mb-1">
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  Ostatnie wyszukiwania
                </span>
                <button
                  onClick={clearRecent}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Wyczyść
                </button>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(search)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors"
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* Filtered suggestions */}
          {value && filteredSuggestions.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 mb-1">
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  Sugestie
                </span>
              </div>
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors"
                >
                  <Search className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}