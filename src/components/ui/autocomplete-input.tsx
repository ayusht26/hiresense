import { useState, useRef, useEffect, type ReactNode } from "react";
import { Check } from "lucide-react";

export interface AutocompleteSuggestion {
  id: string;
  name: string;
  subtitle?: string;
  logo?: string;
  domain?: string;
}

interface AutocompleteInputProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (item: AutocompleteSuggestion) => void;
  suggestions: AutocompleteSuggestion[];
  placeholder?: string;
  renderLogo?: (item: AutocompleteSuggestion) => ReactNode;
  disabled?: boolean;
  className?: string;
}

export function AutocompleteInput({
  id,
  name,
  value,
  onChange,
  onSelect,
  suggestions,
  placeholder,
  renderLogo,
  disabled = false,
  className = "",
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: AutocompleteSuggestion) => {
    onChange(item.name);
    onSelect?.(item);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev <= 0 ? suggestions.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
        handleSelect(suggestions[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        className={`w-full rounded-[16px] bg-[#1a1a1a] px-4 py-3 text-[14px] font-[450] text-[#f5f5f5] placeholder:text-[#5c5c5c] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5] transition-all disabled:opacity-50 ${className}`}
      />

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto rounded-[16px] bg-[#141414] border border-[rgba(255,255,255,0.16)] p-1.5 shadow-2xl backdrop-blur-md">
          <div className="px-3 py-1.5 text-[11px] font-[600] text-[#707070] uppercase tracking-wider">
            Suggestions ({suggestions.length})
          </div>
          {suggestions.map((item, index) => {
            const isHighlighted = index === highlightIndex;
            const isExactMatch =
              item.name.toLowerCase() === value.toLowerCase().trim();

            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => handleSelect(item)}
                className={`flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left transition-colors ${
                  isHighlighted
                    ? "bg-[#1a1a1a] text-[#f5f5f5]"
                    : "text-[#d4d4d4] hover:bg-[#1a1a1a] hover:text-[#f5f5f5]"
                }`}
              >
                {/* Logo or Icon */}
                <div className="shrink-0">
                  {renderLogo ? (
                    renderLogo(item)
                  ) : item.logo ? (
                    <div className="h-7 w-7 rounded-[8px] bg-white p-0.5 flex items-center justify-center overflow-hidden border border-[rgba(255,255,255,0.10)]">
                      <img
                        src={item.logo}
                        alt=""
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-7 w-7 rounded-[8px] bg-[#262626] flex items-center justify-center text-[11px] font-[600] text-[#f5f5f5]">
                      {item.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name and Subtitle */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-[600] text-[#f5f5f5]">
                    {item.name}
                  </div>
                  {item.subtitle && (
                    <div className="truncate text-[11px] font-[450] text-[#8a8a8a]">
                      {item.subtitle}
                    </div>
                  )}
                </div>

                {isExactMatch && (
                  <Check size={14} className="text-[#0066ff] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

