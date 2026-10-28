"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CircleCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProgressIndicatorProps {
  step: number;
  totalSteps?: number;
  className?: string;
}

export function ProgressIndicator({ step, totalSteps = 3, className }: ProgressIndicatorProps) {
  const prefersReducedMotion = useReducedMotion();
  const clampedStep = Math.min(Math.max(step, 1), totalSteps);

  // Dot is 8px (w-2), gap is 24px (gap-6 = 1.5rem = 24px).
  // Step 1: 1 dot -> 24px
  // Step 2: 2 dots -> 24 + 32 = 56px
  // Step 3: 3 dots -> 56 + 32 = 88px
  const overlayWidth = 24 + (clampedStep - 1) * 32;

  return (
    <div
      role="progressbar"
      aria-label={`Step ${clampedStep} of ${totalSteps}`}
      aria-valuemin={1}
      aria-valuenow={clampedStep}
      aria-valuemax={totalSteps}
      className={cn("flex flex-col items-center justify-center py-2", className)}
    >
      <div className="relative flex items-center gap-6">
        {/* Underneath Dots */}
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((dot) => (
          <div
            key={dot}
            className={cn(
              "relative z-10 h-2 w-2 rounded-full transition-colors duration-200",
              dot <= clampedStep ? "bg-[#0a0a0a]" : "bg-[rgba(255,255,255,0.20)]",
            )}
          />
        ))}

        {/* Ink progress pill overlay */}
        <motion.div
          initial={false}
          animate={{
            width: `${overlayWidth}px`,
          }}
          transition={
            prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 350, damping: 25 }
          }
          className="absolute -left-[8px] top-1/2 -translate-y-1/2 h-4 rounded-full bg-[#f5f5f5]"
        />
      </div>
    </div>
  );
}

export interface StepActionsProps {
  step: number;
  totalSteps?: number;
  onBack?: () => void;
  onContinue?: () => void;
  canGoBack?: boolean;
  loading?: boolean;
  disabled?: boolean;
  continueLabel?: string;
  finishLabel?: string;
  className?: string;
}

export function StepActions({
  step,
  totalSteps = 3,
  onBack,
  onContinue,
  canGoBack = true,
  loading = false,
  disabled = false,
  continueLabel = "Continue",
  finishLabel = "Finish",
  className,
}: StepActionsProps) {
  const prefersReducedMotion = useReducedMotion();
  const showBack = canGoBack && step > 1;
  const isLastStep = step === totalSteps;

  const handleClickContinue = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!loading && !disabled) {
      onContinue?.();
    }
  };

  const handleClickBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!loading) {
      onBack?.();
    }
  };

  return (
    <div className={cn("w-full max-w-sm mx-auto", className)}>
      <motion.div layout={!prefersReducedMotion} className="flex items-center gap-2 w-full">
        {showBack && (
          <motion.button
            type="button"
            layout={!prefersReducedMotion}
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: "88px" }}
            exit={{ opacity: 0, scale: 0.9, width: 0 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            onClick={handleClickBack}
            disabled={loading}
            className="flex h-12 items-center justify-center rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.10)] text-[15px] font-[600] text-[#f5f5f5] transition-colors hover:bg-[#262626] active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-[#f5f5f5]"
          >
            Back
          </motion.button>
        )}

        <motion.button
          type="button"
          layout={!prefersReducedMotion}
          onClick={handleClickContinue}
          disabled={disabled || loading}
          className={cn(
            "flex h-12 flex-1 items-center justify-center rounded-full bg-[#f5f5f5] px-6 text-[15px] font-[600] text-[#0a0a0a] transition-all outline-none",
            "hover:bg-[#e0e0e0] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#f5f5f5]",
            (disabled || loading) && "opacity-50 cursor-not-allowed hover:bg-[#f5f5f5]",
          )}
        >
          <div className="flex items-center justify-center gap-2">
            {loading ? (
              <Loader2 size={18} className="animate-spin text-[#0a0a0a]" />
            ) : isLastStep ? (
              <motion.div
                initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <CircleCheck size={18} className="text-[#0a0a0a]" />
              </motion.div>
            ) : null}
            <span>{isLastStep ? finishLabel : continueLabel}</span>
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
}

export default ProgressIndicator;
