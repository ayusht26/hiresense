"use client";

import { motion, useReducedMotion } from "framer-motion";
import React, { useEffect, useId, useState } from "react";
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
        x: shake ? [-8, 8, -6, 6, -3, 3, 0] : 0,
        transition: { duration: 0.4 },
      };

  const matchAnimation = prefersReducedMotion
    ? { scale: 1 }
    : {
        scale: passwordsMatch ? [1, 1.02, 1] : 1,
        transition: { duration: 0.3 },
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
          className="w-full rounded-[16px] bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] px-4 py-3 text-[16px] text-[#5c5c5c] font-[450] placeholder:text-[#5c5c5c] outline-none cursor-not-allowed opacity-75"
        />
        {error && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-[13px] font-medium text-[#f5f5f5]"
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full space-y-2", className)}>
      <motion.div
        className={cn(
          "relative flex flex-col rounded-[16px] bg-[#1a1a1a] p-2 transition-all",
          "border border-[rgba(255,255,255,0.08)]",
          isFocused
            ? "border-transparent ring-2 ring-[#f5f5f5]"
            : passwordsMatch
              ? "ring-1 ring-[rgba(255,255,255,0.30)]"
              : "",
          disabled && "opacity-50 cursor-not-allowed bg-[#141414]",
        )}
        animate={{
          ...bounceAnimation,
          ...matchAnimation,
        }}
      >
        {/* Assisted character comparison row (aria-hidden) */}
        <div
          aria-hidden="true"
          className="relative mb-1.5 flex h-6 w-full items-center overflow-x-auto overflow-y-hidden rounded-lg bg-white/[0.04] px-2 py-1 scrollbar-none"
        >
          <div className="flex items-center gap-1">
            {password.split("").map((letter, index) => {
              const enteredChar = value[index];
              const isFilled = Boolean(enteredChar);
              const isCharMatch = enteredChar === letter;

              return (
                <div
                  key={index}
                  className={cn(
                    "relative flex h-4 w-3.5 shrink-0 items-center justify-center rounded-[3px] transition-colors duration-150",
                    isFilled
                      ? isCharMatch
                        ? "bg-white/20" // subtle light wash on dark
                        : "bg-white/[0.06]" // hairline wash
                      : "bg-transparent",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-all",
                      isFilled ? (isCharMatch ? "bg-[#f5f5f5]" : "bg-[#8a8a8a]") : "bg-[#5c5c5c]",
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Real Controlled Input */}
        <input
          id={id}
          type="password"
          autoComplete="new-password"
          maxLength={maxLength}
          disabled={disabled}
          placeholder="Confirm password"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-invalid={error ? true : isConfirmEntered && !passwordsMatch ? true : undefined}
          aria-describedby={statusId}
          className="w-full bg-transparent px-2 py-1.5 text-[16px] text-[#f5f5f5] font-[450] placeholder:text-[#5c5c5c] outline-none"
        />
      </motion.div>

      {/* Match Status Line */}
      <div id={statusId} aria-live="polite" className="min-h-[20px]">
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-[13px] font-medium text-[#f5f5f5]"
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </p>
        ) : isConfirmEntered ? (
          passwordsMatch ? (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-[#f5f5f5]">
              <Check size={14} className="shrink-0" />
              <span>Passwords match.</span>
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-[13px] font-[450] text-[#8a8a8a]">
              <X size={14} className="shrink-0" />
              <span>Keep going, these don't match yet.</span>
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}

export default AssistedPasswordConfirmation;
