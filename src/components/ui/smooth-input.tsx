"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import React, {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SmoothInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> {
  type?: "text" | "password";
  error?: string;
  hint?: string;
  endAdornment?: ReactNode;
  wrapperClassName?: string;
}

export const SmoothInput = forwardRef<HTMLInputElement, SmoothInputProps>(
  (
    {
      className,
      wrapperClassName,
      value,
      defaultValue,
      onChange,
      onBlur,
      onFocus,
      type = "text",
      placeholder,
      style,
      disabled,
      error,
      hint,
      endAdornment,
      id: customId,
      ...props
    },
    forwardedRef,
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const [internalValue, setInternalValue] = useState(defaultValue ?? "");
    const [isCoarsePointer, setIsCoarsePointer] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const caretX = useMotionValue(0);
    const caretOpacity = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const prefersReducedMotion = useReducedMotion();

    useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

    const isControlled = value !== undefined;
    const inputValue = isControlled ? String(value ?? "") : String(internalValue);

    useEffect(() => {
      setIsMounted(true);
      if (typeof window !== "undefined") {
        const media = window.matchMedia("(pointer: coarse)");
        setIsCoarsePointer(media.matches);
        const listener = (e: MediaQueryListEvent) => setIsCoarsePointer(e.matches);
        media.addEventListener("change", listener);
        return () => media.removeEventListener("change", listener);
      }
    }, []);

    const springConfig = prefersReducedMotion
      ? { stiffness: 10000, damping: 100, mass: 0.1 }
      : { stiffness: 500, damping: 30, mass: 0.5 };

    const springCaretX = useSpring(caretX, springConfig);

    const getPasswordChar = () => {
      if (typeof navigator === "undefined") return "\u2022";
      return navigator.userAgent.match(/firefox|fxios/i) ? "\u25CF" : "\u2022";
    };

    const syncMeasureSpan = () => {
      const input = inputRef.current;
      const measureSpan = measureRef.current;
      if (!input || !measureSpan) return;

      const styles = window.getComputedStyle(input);
      const isPassword = type === "password";

      let fontSize = styles.fontSize;
      if (
        getPasswordChar() === "\u2022" &&
        isPassword &&
        typeof navigator !== "undefined" &&
        !navigator.userAgent.match(/chrome|chromium|crios/i)
      ) {
        fontSize = `${parseFloat(fontSize) + 6.25}px`;
      }

      measureSpan.style.font = `${styles.fontStyle} ${styles.fontWeight} ${fontSize} ${styles.fontFamily}`;
      measureSpan.style.letterSpacing = styles.letterSpacing;
      measureSpan.style.fontFeatureSettings = styles.fontFeatureSettings;
      measureSpan.style.fontVariationSettings = styles.fontVariationSettings;
    };

    const measurePrefixWidth = (text: string) => {
      const input = inputRef.current;
      const measureSpan = measureRef.current;
      if (!input || !measureSpan) return null;

      syncMeasureSpan();
      measureSpan.textContent = text;

      const paddingLeft = parseFloat(window.getComputedStyle(input).paddingLeft) || 0;

      return text.length > 0 ? measureSpan.offsetWidth + paddingLeft : paddingLeft - 1;
    };

    const scrollCaretIntoView = (target: HTMLInputElement, absoluteWidth: number) => {
      const styles = window.getComputedStyle(target);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const maxScroll = Math.max(0, target.scrollWidth - target.clientWidth);
      const visibleRight = target.scrollLeft + target.clientWidth - paddingRight;
      const visibleLeft = target.scrollLeft + paddingLeft;

      if (absoluteWidth > visibleRight) {
        target.scrollLeft = Math.min(absoluteWidth - target.clientWidth + paddingRight, maxScroll);
        return;
      }

      if (absoluteWidth < visibleLeft) {
        target.scrollLeft = Math.max(0, absoluteWidth - paddingLeft);
      }
    };

    const getCaretIndex = (target: HTMLInputElement) => {
      const selectionStart = target.selectionStart ?? 0;
      const selectionEnd = target.selectionEnd ?? 0;

      if (selectionStart === selectionEnd) {
        return selectionStart;
      }

      return target.selectionDirection === "backward" ? selectionStart : selectionEnd;
    };

    const updateCaretFromInput = (target: HTMLInputElement) => {
      if (isCoarsePointer) return;

      const selectionStart = target.selectionStart ?? 0;
      const selectionEnd = target.selectionEnd ?? 0;
      const hasSelection = selectionStart !== selectionEnd;
      const caretIndex = getCaretIndex(target);
      const isPassword = type === "password";
      const char = getPasswordChar();
      const textBeforeCaret = isPassword
        ? char.repeat(caretIndex)
        : target.value.slice(0, caretIndex);

      const absoluteWidth = measurePrefixWidth(textBeforeCaret);
      if (absoluteWidth === null) return;

      scrollCaretIntoView(target, absoluteWidth);

      const styles = window.getComputedStyle(target);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const caretPosition = absoluteWidth - target.scrollLeft;
      const minX = paddingLeft - 1;
      const maxX = target.clientWidth - paddingRight;
      const isCaretVisible = caretPosition >= minX && caretPosition <= maxX + 1;

      caretX.set(Math.min(caretPosition, maxX));

      if (!isCaretVisible || hasSelection) {
        caretOpacity.set(0);
        return;
      }

      caretOpacity.set(1);
    };

    const updateCaretRef = useRef(updateCaretFromInput);
    updateCaretRef.current = updateCaretFromInput;
    const caretOpacityRef = useRef(caretOpacity);
    caretOpacityRef.current = caretOpacity;

    useEffect(() => {
      const input = inputRef.current;
      if (input && document.activeElement === input) {
        updateCaretRef.current(input);
      }
    }, [inputValue, type]);

    useEffect(() => {
      const input = inputRef.current;
      const container = containerRef.current;
      if (!input || !container) return;

      const updateCaretIfFocused = () => {
        if (document.activeElement === input) {
          updateCaretRef.current(input);
        }
      };

      const handleSelectionChange = () => {
        if (document.activeElement !== input) return;

        requestAnimationFrame(() => {
          if (document.activeElement === input) {
            updateCaretRef.current(input);
          }
        });
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      if (typeof document.fonts !== "undefined") {
        document.fonts.addEventListener("loadingdone", updateCaretIfFocused);
        void document.fonts.ready.then(updateCaretIfFocused);
      }
      input.addEventListener("scroll", updateCaretIfFocused);

      const resizeObserver = new ResizeObserver(updateCaretIfFocused);
      resizeObserver.observe(container);

      updateCaretIfFocused();

      return () => {
        document.removeEventListener("selectionchange", handleSelectionChange);
        if (typeof document.fonts !== "undefined") {
          document.fonts.removeEventListener("loadingdone", updateCaretIfFocused);
        }
        input.removeEventListener("scroll", updateCaretIfFocused);
        resizeObserver.disconnect();
      };
    }, []);

    const showCustomCaret = isMounted && !isCoarsePointer;

    return (
      <div className="w-full">
        <div
          className={cn(
            "relative flex items-center w-full rounded-[16px] bg-[#1a1a1a] transition-all duration-150",
            "border border-[rgba(255,255,255,0.08)] focus-within:border-transparent focus-within:ring-2 focus-within:ring-[#f5f5f5] focus-within:bg-[#1a1a1a]",
            error && "ring-1 ring-[rgba(255,255,255,0.30)] bg-[#1a1a1a]",
            disabled && "opacity-50 cursor-not-allowed bg-[#141414]",
            wrapperClassName,
          )}
        >
          <div
            ref={containerRef}
            className="relative grid grid-cols-1 w-full min-h-[48px] items-center"
            style={{
              caretColor: showCustomCaret ? "transparent" : "inherit",
              fontSize: "16px",
            }}
          >
            <input
              {...props}
              ref={inputRef}
              id={id}
              type={type}
              disabled={disabled}
              placeholder={placeholder}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? errorId : hint ? hintId : undefined}
              className={cn(
                "col-start-1 col-end-2 row-start-1 row-end-2 w-full bg-transparent px-4 py-3",
                "text-[16px] text-[#f5f5f5] font-[450] placeholder:text-[#5c5c5c] outline-none",
                endAdornment && "pr-12",
                className,
              )}
              style={style}
              value={inputValue}
              onChange={(e) => {
                if (!isControlled) setInternalValue(e.target.value);
                onChange?.(e);
                requestAnimationFrame(() => {
                  updateCaretRef.current(e.target);
                });
              }}
              onFocus={(e) => {
                onFocus?.(e);
                requestAnimationFrame(() => {
                  updateCaretRef.current(e.target);
                });
              }}
              onBlur={(e) => {
                caretOpacityRef.current.set(0);
                onBlur?.(e);
              }}
            />
            <span
              ref={measureRef}
              aria-hidden
              className="pointer-events-none invisible absolute top-0 left-0 whitespace-pre"
            />
            {showCustomCaret && (
              <motion.div
                className="pointer-events-none col-start-1 col-end-2 row-start-1 row-end-2 h-[1.15em] w-[2px] bg-[#f5f5f5] self-center rounded-full"
                style={{ x: springCaretX, opacity: caretOpacity }}
              />
            )}
          </div>

          {endAdornment && (
            <div className="absolute right-3 flex items-center z-10 text-[#8a8a8a]">
              {endAdornment}
            </div>
          )}
        </div>

        {error && (
          <p
            id={errorId}
            role="alert"
            aria-live="polite"
            className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-[#f5f5f5]"
          >
            <AlertCircle size={14} className="shrink-0 text-[#f5f5f5]" />
            <span>{error}</span>
          </p>
        )}

        {!error && hint && (
          <p id={hintId} className="mt-1.5 text-[13px] font-[450] text-[#8a8a8a]">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

SmoothInput.displayName = "SmoothInput";

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5 w-full", className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="block text-[14px] font-[600] text-[#f5f5f5]">
          {label}
          {required && <span className="ml-0.5 text-[#8a8a8a]">*</span>}
        </label>
      </div>
      {children}
    </div>
  );
}
