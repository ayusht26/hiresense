"use client";

import { ArrowDown, Volume2 } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { tokenizeForHighlight } from "@/lib/speech-sync";

export interface ConversationTurn {
  id: string;
  speaker: "bable" | "mira" | "candidate";
  speakerName: string;
  text: string;
  isStreaming?: boolean;
  timestamp?: string;
}

export interface SpeechProgressProp {
  turnId: string;
  wordIndex: number;
  isComplete: boolean;
}

export interface LiveSyncedTranscriptProps {
  turns: ConversationTurn[];
  candidateName: string;
  activeTurnId?: string | undefined;
  playbackProgress?: number; // 0..1 for active Mira TTS audio (backward compatibility)
  speechProgress?: SpeechProgressProp;
  isPreparingNextQuestion?: boolean;
  onReplayTurn?: (turn: ConversationTurn) => void;
  className?: string;
}

interface Word {
  text: string;
  startRatio: number;
  index: number;
}

function splitTurnWords(text: string, baseIndex: number): { words: Word[]; nextIndex: number } {
  const parts = text.split(/\s+/).filter(Boolean);
  const total = parts.reduce((sum, w) => sum + w.length + 1, 0);
  let accumulated = 0;
  let idx = baseIndex;

  const words = parts.map((part) => {
    const startRatio = total > 0 ? accumulated / total : 0;
    accumulated += part.length + 1;
    const item: Word = { text: part, startRatio, index: idx };
    idx += 1;
    return item;
  });

  return { words, nextIndex: idx };
}

const MemoizedParagraph = memo(function MemoizedParagraph({
  words,
  activeRatio,
  isMira,
  isStreaming,
}: {
  words: Word[];
  activeRatio: number; // 0..1
  isMira: boolean;
  isStreaming?: boolean;
}) {
  return (
    <p className="leading-relaxed text-[14px]">
      {words.map((word) => {
        const isSpoken = !isMira || isStreaming || activeRatio >= word.startRatio;
        return (
          <span
            key={word.index}
            data-index={word.index}
            className={cn(
              "transition-colors duration-150 motion-reduce:transition-none inline-block mr-1",
              isSpoken ? "text-[#f5f5f5]" : "text-[#707070]",
            )}
          >
            {word.text}
          </span>
        );
      })}
    </p>
  );
});

function MiraTurnHighlight({
  text,
  turnId,
  speechProgress,
  activeWordRef,
}: {
  text: string;
  turnId: string;
  speechProgress?: SpeechProgressProp;
  activeWordRef: React.RefObject<HTMLSpanElement | null>;
}) {
  const tokens = useMemo(() => tokenizeForHighlight(text), [text]);
  const isSpeechActive = Boolean(speechProgress && speechProgress.turnId === turnId);

  if (tokens.length === 0) {
    return <p className="leading-relaxed text-[14px] text-[#f5f5f5]">{text}</p>;
  }

  return (
    <p className="leading-relaxed text-[14px]">
      {tokens.map((token, i) => {
        const precedingWhitespace =
          i > 0
            ? text.slice(tokens[i - 1].end, token.start)
            : token.start > 0
              ? text.slice(0, token.start)
              : "";

        const isSpoken = isSpeechActive
          ? speechProgress!.isComplete || token.index < speechProgress!.wordIndex
          : true;

        const isCurrent =
          isSpeechActive &&
          !speechProgress!.isComplete &&
          token.index === speechProgress!.wordIndex;

        const trailingWhitespace =
          i === tokens.length - 1 && token.end < text.length ? text.slice(token.end) : "";

        return (
          <span key={token.index}>
            {precedingWhitespace}
            <span
              ref={isCurrent ? activeWordRef : undefined}
              data-word-index={token.index}
              className={cn(
                "transition-colors duration-150 motion-reduce:transition-none inline-block",
                isCurrent
                  ? "text-[#f5f5f5] bg-[#262626] rounded-[6px] px-1 -mx-1"
                  : isSpoken
                    ? "text-[#f5f5f5]"
                    : "text-[#707070]",
              )}
            >
              {token.text}
            </span>
            {trailingWhitespace}
          </span>
        );
      })}
    </p>
  );
}

export function LiveSyncedTranscript({
  turns,
  candidateName,
  activeTurnId,
  playbackProgress = 0,
  speechProgress,
  isPreparingNextQuestion = false,
  onReplayTurn,
  className,
}: LiveSyncedTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [following, setFollowing] = useState(true);
  const [showBackToNow, setShowBackToNow] = useState(false);

  // Split words per turn for legacy fallback
  const preparedTurns = useMemo(() => {
    let globalIndex = 0;
    return turns.map((turn) => {
      const { words, nextIndex } = splitTurnWords(turn.text, globalIndex);
      globalIndex = nextIndex;
      return {
        ...turn,
        words,
      };
    });
  }, [turns]);

  // Scroll to bottom when new words or turns arrive if user is following
  const scrollToLatest = useCallback((smooth = true) => {
    const box = scrollRef.current;
    if (!box) return;
    box.scrollTo({
      top: box.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
    setFollowing(true);
    setShowBackToNow(false);
  }, []);

  // Detect user scroll away
  const handleScroll = useCallback(() => {
    const box = scrollRef.current;
    if (!box) return;
    const distanceToBottom = box.scrollHeight - (box.scrollTop + box.clientHeight);
    const isAtBottom = distanceToBottom < 60;
    setFollowing(isAtBottom);
    setShowBackToNow(!isAtBottom);
  }, []);

  useEffect(() => {
    if (following) {
      scrollToLatest(true);
    }
  }, [turns, following, scrollToLatest]);

  // Auto-scroll active word into view within the 260px transcript card
  useEffect(() => {
    if (following && activeWordRef.current) {
      activeWordRef.current.scrollIntoView({
        block: "nearest",
        behavior: shouldReduceMotion ? "auto" : "smooth",
      });
    }
  }, [speechProgress?.wordIndex, speechProgress?.turnId, following, shouldReduceMotion]);

  const showPreparingRow =
    isPreparingNextQuestion &&
    (turns.length === 0 || turns[turns.length - 1].speaker === "candidate");

  return (
    <div
      className={cn(
        "relative flex flex-col h-full rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.08)] overflow-hidden",
        className,
      )}
    >
      {/* Minimal Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(255,255,255,0.08)] bg-[#141414]/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-[650] text-[#f5f5f5]">Conversation</span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </div>
        <span className="text-[11px] text-[#707070]">
          {turns.length} message{turns.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Internal Scrollable Content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-left"
        tabIndex={0}
        aria-label="Interview conversation transcript"
      >
        {preparedTurns.length === 0 && !showPreparingRow ? (
          <div className="py-12 text-center text-[#707070] text-[13px]">
            Bable will begin the interview shortly...
          </div>
        ) : (
          <>
            {preparedTurns.map((turn, idx) => {
              const isBable = turn.speaker === "bable" || turn.speaker === "mira";
              const isActive = turn.id === activeTurnId;
              const progress = isActive ? playbackProgress : 1;
              const isLatest = idx === preparedTurns.length - 1;

              return (
                <div
                  key={`${turn.id}_${idx}`}
                  className={cn(
                    "group relative rounded-[16px] p-3.5 transition-colors border",
                    isBable
                      ? "bg-[#171717] border-[rgba(255,255,255,0.06)]"
                      : "bg-[#1a1a1a] border-[rgba(255,255,255,0.08)]",
                  )}
                  aria-live={isLatest ? "polite" : undefined}
                >
                  {/* Speaker row */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-6 w-6 rounded-[30%] flex items-center justify-center text-[11px] font-[700]",
                          isBable
                            ? "bg-[#1a1a1a] border border-[rgba(255,255,255,0.15)] text-[#f5f5f5]"
                            : "bg-[#f5f5f5] text-[#0a0a0a]",
                        )}
                      >
                        {isBable ? "B" : (candidateName[0] || "Y").toUpperCase()}
                      </div>
                      <span className="text-[12px] font-[650] text-[#f5f5f5]">
                        {isBable ? "Bable" : candidateName}
                      </span>
                      {turn.isStreaming && (
                        <span className="text-[11px] text-emerald-400 font-[500] animate-pulse">
                          (speaking...)
                        </span>
                      )}
                    </div>

                    {/* Replay action for Bable lines */}
                    {isBable && onReplayTurn && !turn.isStreaming && (
                      <button
                        type="button"
                        onClick={() => onReplayTurn(turn)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full text-[#8a8a8a] hover:text-[#f5f5f5] hover:bg-[#262626]"
                        title="Replay this question"
                        aria-label="Replay this question"
                      >
                        <Volume2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Words */}
                  {isBable ? (
                    <MiraTurnHighlight
                      text={turn.text}
                      turnId={turn.id}
                      speechProgress={speechProgress}
                      activeWordRef={activeWordRef}
                    />
                  ) : (
                    <MemoizedParagraph
                      words={turn.words}
                      activeRatio={progress}
                      isMira={false}
                      isStreaming={turn.isStreaming}
                    />
                  )}
                </div>
              );
            })}

            {showPreparingRow && (
              <div className="text-[13px] text-[#8a8a8a] px-3.5 py-2">
                Bable is preparing the next question.
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating "Back to now" pill when user scrolled away */}
      {showBackToNow && (
        <button
          type="button"
          onClick={() => scrollToLatest(true)}
          className="absolute bottom-3 right-5 z-20 inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f5] px-3.5 py-1 text-[12px] font-[600] text-[#0a0a0a] shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <ArrowDown size={13} />
          <span>Back to now</span>
        </button>
      )}
    </div>
  );
}

export default LiveSyncedTranscript;
