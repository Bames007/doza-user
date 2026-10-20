// app/dashboard/components/medicalshop/SearchInput.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { FOCUS } from "@/app/dashboard/constants/medicalShopConstants";

interface SearchInputProps {
  initialValue: string;
  onDebouncedChange: (v: string) => void;
  placeholder?: string;
}

export function SearchInput({
  initialValue,
  onDebouncedChange,
  placeholder = "Search…",
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(initialValue);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedRef = useRef(initialValue);

  useEffect(() => {
    if (initialValue !== lastSyncedRef.current) {
      lastSyncedRef.current = initialValue;
      setLocalValue(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastSyncedRef.current = v;
      onDebouncedChange(v);
    }, 250);
  };

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLocalValue("");
    lastSyncedRef.current = "";
    onDebouncedChange("");
  };

  return (
    <div className="flex-1 relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
        className={cn(
          "w-full h-11 pl-11 pr-10 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-emerald-600 text-slate-900 text-sm transition-colors outline-none placeholder:text-slate-400",
          FOCUS,
        )}
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 transition-colors",
            FOCUS,
          )}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
