"use client";

import { motion, useReducedMotion } from "framer-motion";
import React, { useEffect, useId, useRef, useState } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AssistedPasswordConfirmationProps {
  password: string;
  value: string;
  onChange: (value: string) => void;
  onMatchChange?: (matches: boolean) => void;
  disabled?: boolean;
  id?: string;
  error?: string;
  maxLength?: number;
  className?: string;
}

export function AssistedPasswordConfirmation({
  password = "",
  value = "",
  onChange,
  onMatchChange,
  disabled = false,
  id: customId,
  error,
  maxLength = 64,
  className,
}: AssistedPasswordConfirmationProps) {
  const generatedId = useId();
  const id = customId || generatedId;
  const statusId = `${id}-status`;
  const errorId = `${id}-error`;
  const inputRef = useRef<HTMLInputElement>(null);

  const [shake, setShake] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const isPasswordReady = password.length > 0;
  const isConfirmEntered = value.length > 0;
  const passwordsMatch = isPasswordReady && isConfirmEntered && password === value;

  useEffect(() => {
    onMatchChange?.(passwordsMatch);
  }, [passwordsMatch, onMatchChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;

    if (isPasswordReady && value.length >= password.length && nextVal.length > value.length) {
      if (!prefersReducedMotion) {
        setShake(true);
      }
      return;
    }

    onChange(nextVal);
  };

  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  const bounceAnimation = prefersReducedMotion
    ? { x: 0 }
    : {
        x: shake ? [-6, 6, -4, 4, -2, 2, 0] : 0,
        transition: { duration: 0.35 },
      };

  // If the user hasn't typed a main password yet:
  if (!isPasswordReady) {
    return (
      <div className={cn("w-full space-y-1.5", className)}>
        <input
          id={id}
          type="password"
          disabled
          placeholder="Enter a password first"
          className="h-12 w-full rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] px-4 text-[16px] text-[#5c5c5c] font-[450] placeholder:text-[#5c5c5c] outline-none cursor-not-allowed opacity-70"
        />
        {error && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-[13px] font-medium text-[#ef4444]"
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }

  // Calculate dots to display: at least the password length, or value length if user typed longer
  const totalDots = Math.max(password.length, value.length);
  const showDots = isFocused || isConfirmEntered;

  return (
    <div className={cn("w-full space-y-2", className)}>
      <motion.div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "relative flex h-12 w-full items-center rounded-[16px] bg-[#1a1a1a] px-4 cursor-text transition-all",
          "border border-[rgba(255,255,255,0.08)]",
          isFocused
            ? "border-transparent ring-2 ring-[#f5f5f5]"
            : passwordsMatch
              ? "border-[#22c55e]/40 ring-1 ring-[#22c55e]/30"
              : isConfirmEntered
                ? "border-[#ef4444]/40 ring-1 ring-[#ef4444]/20"
                : "",
          disabled && "opacity-50 cursor-not-allowed bg-[#141414]",
        )}
        animate={bounceAnimation}
      >
        {/* If empty and not focused, display standard placeholder */}
        {!showDots && (
          <span className="text-[16px] font-[450] text-[#5c5c5c] select-none pointer-events-none">
            Confirm password
          </span>
        )}

        {/* Single Row of Interactive Dots */}
        {showDots && (
          <div
            aria-hidden="true"
            className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 w-full"
          >
            {Array.from({ length: totalDots }).map((_, index) => {
              const enteredChar = value[index];
              const targetChar = password[index];
              const isTyped = index < value.length;
              const isMatch = isTyped && enteredChar === targetChar;
              const isMismatch = isTyped && enteredChar !== targetChar;
              const isCurrentCursor = isFocused && index === value.length;

              return (
                <div key={index} className="relative flex items-center justify-center shrink-0">
                  {/* Active Caret indicator at typing position */}
                  {isCurrentCursor && (
                    <motion.span
                      layoutId="confirm-caret"
                      className="absolute -left-1 h-4 w-[2px] bg-[#f5f5f5] rounded-full"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}

                  {/* Character Dot */}
                  <motion.span
                    initial={isTyped ? { scale: 0.6 } : false}
                    animate={isTyped ? { scale: [0.6, 1.15, 1] } : { scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "rounded-full transition-colors duration-150 shrink-0",
                      // Matching character: Green highlight
                      isMatch && "h-2.5 w-2.5 bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.5)]",
                      // Mismatching character: Red highlight
                      isMismatch && "h-2.5 w-2.5 bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]",
                      // Unfilled upcoming character: Neutral subtle dot
                      !isTyped && "h-2 w-2 bg-white/20",
                    )}
                  />
                </div>
              );
            })}

            {/* Trailing cursor if user reached end of password */}
            {isFocused && value.length >= totalDots && (
              <motion.span
                className="h-4 w-[2px] bg-[#f5f5f5] rounded-full shrink-0"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </div>
        )}

        {/* Real Accessible Input overlaid across the row */}
        <input
          ref={inputRef}
          id={id}
          type="password"
          autoComplete="new-password"
          maxLength={maxLength}
          disabled={disabled}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-invalid={error ? true : isConfirmEntered && !passwordsMatch ? true : undefined}
          aria-describedby={statusId}
          className="absolute inset-0 h-full w-full opacity-0 cursor-text z-10"
        />
      </motion.div>

      {/* Match Status Line below the input */}
      <div id={statusId} aria-live="polite" className="min-h-[20px]">
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-[13px] font-medium text-[#ef4444]"
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </p>
        ) : isConfirmEntered ? (
          passwordsMatch ? (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-[#22c55e]">
              <Check size={14} className="shrink-0" />
              <span>Passwords match.</span>
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-[13px] font-[450] text-[#ef4444]">
              <X size={14} className="shrink-0" />
              <span>Passwords don't match yet.</span>
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}

export default AssistedPasswordConfirmation;
