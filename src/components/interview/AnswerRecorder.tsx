"use client";

import { Square, Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_TEXTS, type InterviewLanguage } from "@/lib/interview-i18n";

export type QuestionPhase =
  "preparing" | "speaking" | "recording" | "processing" | "retry" | "typing";

export interface AnswerRecorderProps {
  phase: QuestionPhase;
  level?: number; // 0..1 real-time audio level
  peakLevel?: number;
  elapsedMs?: number;
  durationSeconds?: number;
  disabled?: boolean;
  onStop?: () => void;
  onStopAndSubmit?: () => void;
  language?: InterviewLanguage;
  className?: string;
}

const BAR_COUNT = 28;
const BAR_IDS = Array.from({ length: BAR_COUNT }, (_, i) => `rec-bar-${i}`);

export function AnswerRecorder({
  phase,
  level,
  peakLevel,
  elapsedMs,
  durationSeconds,
  disabled = false,
  onStop,
  onStopAndSubmit,
  language = "en",
  className,
}: AnswerRecorderProps) {
  const statusTexts = STATUS_TEXTS[language] || STATUS_TEXTS.en;
  const effectiveLevel = peakLevel ?? level ?? 0;
  const effectiveElapsedMs =
    elapsedMs ?? (durationSeconds !== undefined ? durationSeconds * 1000 : 0);
  const handleStop = onStopAndSubmit || onStop || (() => {});

  const seconds = Math.floor(effectiveElapsedMs / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeFormatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  const isRecording = phase === "recording";
  const isProcessing = phase === "processing";
  const isBableActive = phase === "preparing" || phase === "speaking";

  return (
    <div className={cn("w-full flex flex-col items-center py-2 space-y-3", className)}>
      {/* Central Interactive Button */}
      <div className="relative flex items-center justify-center">
        {isRecording && (
          <span
            aria-hidden="true"
            className="absolute -inset-2.5 rounded-full bg-red-500/20 animate-ping opacity-75 pointer-events-none"
          />
        )}

        {isProcessing ? (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.15)] text-[#f5f5f5]">
            <Loader2 size={24} className="animate-spin text-[#f5f5f5]" />
          </div>
        ) : isRecording ? (
          <button
            type="button"
            disabled={disabled}
            onClick={handleStop}
            aria-label="Stop recording and submit answer"
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white border-2 border-red-400 hover:bg-red-600 active:scale-95 transition-transform duration-100 shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 cursor-pointer"
          >
            <Square size={20} className="fill-current" />
          </button>
        ) : (
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full border transition-colors",
              isBableActive
                ? "bg-[#141414] border-[rgba(255,255,255,0.08)] text-[#5c5c5c]"
                : "bg-[#1a1a1a] border-[rgba(255,255,255,0.12)] text-[#8a8a8a]",
            )}
            title={isBableActive ? statusTexts.bableAsking : undefined}
          >
            <Mic size={22} />
          </div>
        )}
      </div>

      {/* Timer & Status Label */}
      <div className="flex flex-col items-center space-y-1 text-center">
        {isRecording ? (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-[14px] font-[600] text-[#f5f5f5] tabular">
              {timeFormatted}
            </span>
          </div>
        ) : null}

        <p className="text-[12px] font-[500] text-[#8a8a8a]">
          {isProcessing
            ? statusTexts.processing
            : isRecording
              ? statusTexts.tapStopWhenDone
              : isBableActive
                ? statusTexts.bableAsking
                : statusTexts.listeningHint}
        </p>
      </div>

      {/* Real Audio Waveform Bars (Active only during recording) */}
      <div
        aria-hidden="true"
        className="relative h-6 w-48 sm:w-56 overflow-hidden flex items-center justify-center gap-[3px]"
      >
        {BAR_IDS.map((id, i) => {
          // Compute variable bar heights driven by real-time mic level
          const offset = Math.sin(i * 0.45) * 0.25;
          const dynamicScale = isRecording
            ? Math.max(0.15, Math.min(1, effectiveLevel * 2.8 + offset))
            : 0.12;

          return (
            <span
              key={id}
              className={cn(
                "h-full w-[3px] rounded-full transition-transform duration-75",
                isRecording ? "bg-[#f5f5f5]" : "bg-[rgba(255,255,255,0.12)]",
              )}
              style={{
                transform: `scaleY(${dynamicScale.toFixed(2)})`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
