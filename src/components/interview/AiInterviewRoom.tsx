"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  Clock,
  ArrowRight,
  RotateCcw,
  X,
  ChevronDown,
  ChevronUp,
  Keyboard,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Quote,
} from "lucide-react";
import {
  generateInterviewQuestions,
  evaluateInterviewSession,
  type InterviewQuestion,
  type InterviewScorecard,
} from "@/lib/ai-interview";
import { useMediaSession } from "@/hooks/useMediaSession";
import { useMiraSpeech, unlockAudio } from "@/hooks/useMiraSpeech";
import { VoicePill, type VoiceState } from "@/components/interview/VoicePill";
import {
  LiveSyncedTranscript,
  type ConversationTurn,
} from "@/components/kokonutui/synced-transcript";
import { AppleActivityCard } from "@/components/kokonutui/apple-activity-card";
import AITextLoading from "@/components/kokonutui/ai-text-loading";
import { AnswerRecorder, type QuestionPhase } from "@/components/interview/AnswerRecorder";
import { useAnswerRecorder } from "@/hooks/useAnswerRecorder";
import { transcribeAudioBlob } from "@/lib/transcribe-client";
import { STATUS_TEXTS } from "@/lib/interview-i18n";
import { scoreTone } from "@/lib/score-tone";
import { RUBRIC_WEIGHTS, type RubricKey } from "@/lib/scoring";
import type { PlanContext } from "@/lib/interview-planner";
import {
  recordInterviewStarted,
  recordInterviewProgress,
  recordInterviewCompleted,
} from "@/lib/applications";
import { saveInterviewScorecardServerFn } from "@/lib/interview-sync";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface AiInterviewRoomProps {
  userId?: string;
  jobId?: string;
  candidateName: string;
  targetJobTitle: string;
  jobPosting?: Record<string, unknown>;
  verificationQuestions?: string[];
  preferredLanguage?: "en" | "hi" | "hinglish" | "code_mixed";
  analysis?: PlanContext["analysis"];
  onClose: () => void;
}

const RUBRIC_LABELS: Record<RubricKey, { label: string; weight: string }> = {
  technicalCorrectness: { label: "Technical Correctness", weight: "35%" },
  problemSolving: { label: "Problem Solving", weight: "20%" },
  projectUnderstanding: { label: "Project Understanding", weight: "15%" },
  relevanceCompleteness: { label: "Relevance & Completeness", weight: "10%" },
  communicationClarity: { label: "Communication Clarity", weight: "10%" },
  behavioralEvidence: { label: "Behavioral Evidence", weight: "10%" },
};

export function AiInterviewRoom({
  userId = "guest_user",
  jobId = "demo-job",
  candidateName,
  targetJobTitle,
  jobPosting = {},
  verificationQuestions = [],
  preferredLanguage = "en",
  analysis,
  onClose,
}: AiInterviewRoomProps) {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  // Session stage: "lobby" | "interview" | "evaluating" | "scorecard"
  const [stage, setStage] = useState<"lobby" | "interview" | "evaluating" | "scorecard">("lobby");

  // Normalized language
  const normalizedLanguage: "en" | "hi" | "hinglish" =
    preferredLanguage === "code_mixed" ? "hinglish" : preferredLanguage;
  const [language, setLanguage] = useState<"en" | "hi" | "hinglish">(normalizedLanguage);
  const [isPlanLoading, setIsPlanLoading] = useState(false);

  // Questions in lobby
  const [questions, setQuestions] = useState<InterviewQuestion[]>(() =>
    generateInterviewQuestions(targetJobTitle, jobPosting, {
      verificationQuestions,
      language: normalizedLanguage,
      analysis,
    }),
  );

  // Frozen question snapshot used exclusively once interview starts
  const [sessionQuestions, setSessionQuestions] = useState<InterviewQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Per-question phase state machine
  const [questionPhase, setQuestionPhase] = useState<QuestionPhase>("preparing");

  // Dedicated Mira speech engine
  const {
    phase: speechPhase,
    progress: speechProgress,
    speak: speakSpeech,
    prefetch: prefetchSpeech,
    cancel: cancelSpeech,
  } = useMiraSpeech();

  // Single media session from context
  const { stream, isAcquired, hasCamera, hasMic, audioLevel, acquire, release } = useMediaSession();

  // Local device toggles
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);

  // Manual text fallback toggle and input
  const [manualTextMode, setManualTextMode] = useState(false);
  const [manualAnswerText, setManualAnswerText] = useState("");
  const [emptyAnswerWarning, setEmptyAnswerWarning] = useState(false);

  // Synced transcripts
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [activeTurnId, setActiveTurnId] = useState<string | undefined>(undefined);

  // Answers & Durations
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const sessionStartedRef = useRef<boolean>(false);

  // End Session Confirmation Modal
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Scorecard
  const [scorecard, setScorecard] = useState<InterviewScorecard | null>(null);
  const [expandedAnswerId, setExpandedAnswerId] = useState<string | null>(null);

  // Refs for video & speech
  const videoRef = useRef<HTMLVideoElement>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const planAbortControllerRef = useRef<AbortController | null>(null);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Audio Recorder Hook
  const recorder = useAnswerRecorder({
    stream: isMicMuted ? null : stream,
    maxDurationSeconds: 120,
    onMaxDurationReached: () => {
      handleFinishAnswer();
    },
  });

  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;

  // Video attachment callbacks
  const setLobbyVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      lobbyVideoRef.current = el;
      if (el && stream) {
        if (el.srcObject !== stream) {
          el.srcObject = stream;
        }
        el.play().catch(() => {});
      }
    },
    [stream],
  );

  const setInterviewVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el && stream && isCameraActive) {
        if (el.srcObject !== stream) {
          el.srcObject = stream;
        }
        el.play().catch(() => {});
      }
    },
    [stream, isCameraActive],
  );

  // Body scroll lock
  useEffect(() => {
    setMounted(true);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, []);

  // Ensure stream acquired
  useEffect(() => {
    if (!stream) {
      acquire().catch(() => {});
    }
  }, [stream, acquire]);

  // Video stream synchronization
  useEffect(() => {
    if (!stream) return;

    if (stage === "interview" && videoRef.current) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      if (isCameraActive) {
        videoRef.current.play().catch(() => {});
      }
    } else if (stage === "lobby" && lobbyVideoRef.current) {
      if (lobbyVideoRef.current.srcObject !== stream) {
        lobbyVideoRef.current.srcObject = stream;
      }
      lobbyVideoRef.current.play().catch(() => {});
    }
  }, [stage, stream, isCameraActive]);

  // Plan fetching with language switch support
  const fetchPlanForLanguage = useCallback(
    async (lang: "en" | "hi" | "hinglish") => {
      if (planAbortControllerRef.current) {
        planAbortControllerRef.current.abort();
      }
      const controller = new AbortController();
      planAbortControllerRef.current = controller;

      setIsPlanLoading(true);

      // 8-second safety fallback timeout
      const fallbackTimer = setTimeout(() => {
        setIsPlanLoading(false);
      }, 8000);

      try {
        const resp = await fetch("/api/interview/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobTitle: targetJobTitle,
            jobPosting,
            verificationQuestions,
            language: lang,
            analysis,
          }),
          signal: controller.signal,
        });

        clearTimeout(fallbackTimer);

        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data.questions) && data.questions.length > 0) {
            setQuestions(data.questions);
            setIsPlanLoading(false);
            return;
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.warn("[interview/plan] API fallback:", err);
      } finally {
        clearTimeout(fallbackTimer);
      }

      // Deterministic fallback
      const deterministic = generateInterviewQuestions(targetJobTitle, jobPosting, {
        verificationQuestions,
        language: lang,
        analysis,
      });
      setQuestions(deterministic);
      setIsPlanLoading(false);
    },
    [targetJobTitle, jobPosting, verificationQuestions, analysis],
  );

  // Fetch initial plan on lobby mount
  useEffect(() => {
    if (stage === "lobby") {
      fetchPlanForLanguage(language);
    }
  }, [fetchPlanForLanguage, stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefetch question 1 in lobby
  useEffect(() => {
    if (stage === "lobby" && questions.length > 0 && questions[0]?.question) {
      prefetchSpeech(questions[0].question, language);
    }
  }, [stage, questions, language, prefetchSpeech]);

  // Session timer
  useEffect(() => {
    if (stage !== "interview") return;
    const interval = setInterval(() => {
      if (sessionStartedRef.current) {
        setSessionSeconds((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [stage]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQ = sessionQuestions[currentIdx];

  // Mira question speech function
  const speakCurrentQuestion = useCallback(
    async (q: InterviewQuestion) => {
      setQuestionPhase("preparing");
      recorderRef.current.cancelRecording();

      const turnId = `mira_q_${q.id}`;
      setActiveTurnId(turnId);

      // Add turn immediately if not already present
      setTurns((prev) => {
        if (prev.some((t) => t.id === turnId)) return prev;
        return [
          ...prev,
          {
            id: turnId,
            speaker: "mira",
            speakerName: "Mira",
            text: q.question,
            isStreaming: false,
          },
        ];
      });

      const speakResult = await speakSpeech(q.question, {
        language,
        onStart: () => {
          setQuestionPhase("speaking");
          if (!sessionStartedRef.current) {
            sessionStartedRef.current = true;
          }
          setQuestionStartTime(Date.now());
        },
      });

      if (speakResult === "cancelled") {
        return;
      }

      // Auto-listen when Mira finishes speaking
      setQuestionPhase("recording");
      setQuestionStartTime(Date.now());
      setEmptyAnswerWarning(false);
      recorderRef.current.startRecording();

      // Prefetch next question
      if (currentIdx + 1 < sessionQuestions.length) {
        const nextQ = sessionQuestions[currentIdx + 1];
        if (nextQ?.question) {
          prefetchSpeech(nextQ.question, language);
        }
      }
    },
    [speakSpeech, language, currentIdx, sessionQuestions, prefetchSpeech],
  );

  // Trigger speech on question change during interview
  useEffect(() => {
    if (stage !== "interview" || sessionQuestions.length === 0 || !sessionQuestions[currentIdx]) {
      return;
    }

    const q = sessionQuestions[currentIdx];
    const timer = setTimeout(() => {
      speakCurrentQuestion(q);
    }, 300);

    return () => {
      clearTimeout(timer);
      cancelSpeech();
    };
  }, [stage, currentIdx, sessionQuestions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelSpeech();
      recorderRef.current.cancelRecording();
      if (planAbortControllerRef.current) {
        planAbortControllerRef.current.abort();
      }
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, [cancelSpeech]);

  // Start interview from lobby
  const handleJoinInterview = async () => {
    unlockAudio();
    cancelSpeech();

    if (!isAcquired) {
      await acquire().catch(() => {});
    }

    let questionsToUse = questions;
    if (questionsToUse.length === 0) {
      questionsToUse = generateInterviewQuestions(targetJobTitle, jobPosting, {
        verificationQuestions,
        language,
        analysis,
      });
      setQuestions(questionsToUse);
    }

    const snapshot = [...questionsToUse];
    setSessionQuestions(snapshot);
    setStage("interview");
    setCurrentIdx(0);
    setSessionSeconds(0);
    setAnswers({});
    setDurations({});
    setTurns([]);
    setQuestionPhase("preparing");
    sessionStartedRef.current = false;

    recordInterviewStarted(userId, jobId, `session_${Date.now()}`);
  };

  // Evaluation submission
  const completeInterviewEvaluation = async (
    allAnswers: Record<string, string>,
    allDurations: Record<string, number>,
  ) => {
    setStage("evaluating");
    const startTime = Date.now();

    let finalScorecard: InterviewScorecard | null = null;
    try {
      const resp = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName,
          targetJobTitle,
          questions: sessionQuestions,
          answers: allAnswers,
          durations: allDurations,
          language,
        }),
      });

      if (resp.ok) {
        finalScorecard = await resp.json();
      } else {
        const bodySnippet = await resp.text().catch(() => "");
        console.warn(`[interview/evaluate] status ${resp.status}: ${bodySnippet.slice(0, 300)}`);
      }
    } catch (err) {
      console.warn("[interview/evaluate] API fallback:", err);
    }

    if (!finalScorecard) {
      finalScorecard = evaluateInterviewSession(
        candidateName,
        targetJobTitle,
        sessionQuestions,
        allAnswers,
        allDurations,
        language,
      );
    }

    if (finalScorecard) {
      (finalScorecard as any).candidateName = candidateName;
    }

    const elapsed = Date.now() - startTime;
    if (elapsed < 2500) {
      await new Promise((r) => setTimeout(r, 2500 - elapsed));
    }

    recordInterviewCompleted(userId, jobId, finalScorecard);

    // Persist completed interview scorecard to Supabase if candidate is logged in
    try {
      if (userId && userId !== "guest_user" && userId !== "anonymous") {
        // 1. Call server function with elevated recruiter authorization to ensure Supabase DB update succeeds
        try {
          await saveInterviewScorecardServerFn({
            data: {
              jobId,
              studentId: userId,
              candidateName,
              targetJobTitle,
              scorecard: finalScorecard as unknown as Record<string, unknown>,
              overallScore: finalScorecard.overallScore,
            },
          });
        } catch (serverErr) {
          console.warn("[AiInterviewRoom] ServerFn save fallback:", serverErr);
        }

        // 2. Also attempt direct client upsert as extra redundancy
        const { data: existingApp } = await supabase
          .from("applications")
          .select("match_report, match_score")
          .eq("job_id", jobId)
          .eq("student_id", userId)
          .maybeSingle();

        const existingReport = (existingApp?.match_report || {}) as Record<string, unknown>;

        await supabase.from("applications").upsert(
          {
            job_id: jobId,
            student_id: userId,
            match_score: existingApp?.match_score ?? finalScorecard.overallScore ?? null,
            match_report: {
              ...existingReport,
              candidate_name: candidateName || (existingReport.candidate_name as string),
              target_role: targetJobTitle,
              interview_scorecard: finalScorecard,
              overallScore: finalScorecard.overallScore,
              stage: "interview_completed",
            },
            status: "under_review",
            result_published: true,
          },
          { onConflict: "job_id, student_id" },
        );
      }
    } catch (dbErr) {
      console.warn("Could not sync interview scorecard to Supabase:", dbErr);
    }

    setScorecard(finalScorecard);
    setStage("scorecard");
  };

  // Save answer and advance or finish
  const commitAnswerAndAdvance = (answerText: string) => {
    const q = sessionQuestions[currentIdx];
    if (!q) return;

    const timeSpent = Math.max(5, Math.round((Date.now() - questionStartTime) / 1000));
    const cleanAnswer = answerText.trim();

    const updatedAnswers = { ...answers, [q.id]: cleanAnswer };
    const updatedDurations = { ...durations, [q.id]: timeSpent };

    setAnswers(updatedAnswers);
    setDurations(updatedDurations);

    // Add candidate turn to transcript
    const turnId = `candidate_ans_${q.id}`;
    setTurns((prev) => [
      ...prev,
      {
        id: turnId,
        speaker: "candidate",
        speakerName: candidateName,
        text: cleanAnswer || "[unanswered]",
        isStreaming: false,
      },
    ]);

    recordInterviewProgress(userId, jobId, {
      currentIdx: currentIdx + 1,
      answers: updatedAnswers,
      durations: updatedDurations,
      sessionSeconds,
    });

    if (currentIdx < sessionQuestions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setManualAnswerText("");
      setEmptyAnswerWarning(false);
    } else {
      completeInterviewEvaluation(updatedAnswers, updatedDurations);
    }
  };

  // Finish answer handler: stops recorder, transcribes, advances
  const handleFinishAnswer = async () => {
    if (questionPhase === "processing") return;

    setQuestionPhase("processing");
    cancelSpeech();

    const audioBlob = await recorder.stopRecording();

    let transcribedText = "";
    if (audioBlob && audioBlob.size > 500) {
      try {
        const result = await transcribeAudioBlob(audioBlob, language);
        transcribedText = result.transcript;
      } catch (err) {
        console.warn("[AiInterviewRoom] Transcription failed:", err);
      }
    }

    // Check if answer is empty
    if (!transcribedText || transcribedText.trim().length === 0) {
      setEmptyAnswerWarning(true);
      setQuestionPhase("recording");
      return;
    }

    commitAnswerAndAdvance(transcribedText);
  };

  // Submit manual text answer
  const handleSubmitManualText = () => {
    if (!manualAnswerText.trim()) {
      setEmptyAnswerWarning(true);
      return;
    }
    commitAnswerAndAdvance(manualAnswerText.trim());
    setManualAnswerText("");
    setManualTextMode(false);
  };

  // Confirm End Interview early
  const handleConfirmEndEarly = () => {
    cancelSpeech();
    recorder.cancelRecording();
    setShowEndConfirm(false);

    const q = sessionQuestions[currentIdx];
    const timeSpent = Math.max(5, Math.round((Date.now() - questionStartTime) / 1000));
    const updatedAnswers = {
      ...answers,
      [q?.id || `q_${currentIdx}`]: manualAnswerText.trim() || "[unanswered]",
    };
    const updatedDurations = {
      ...durations,
      [q?.id || `q_${currentIdx}`]: timeSpent,
    };

    completeInterviewEvaluation(updatedAnswers, updatedDurations);
  };

  // Retake interview
  const handleRetake = () => {
    cancelSpeech();
    recorder.cancelRecording();
    sessionStartedRef.current = false;
    setStage("lobby");
    setCurrentIdx(0);
    setSessionSeconds(0);
    setAnswers({});
    setDurations({});
    setTurns([]);
    setQuestionPhase("preparing");
  };

  // Done button navigation
  const handleDone = () => {
    cancelSpeech();
    recorder.cancelRecording();
    release();
    onClose();
    navigate({ to: "/dashboard" });
  };

  // Close modal
  const handleClose = () => {
    cancelSpeech();
    recorder.cancelRecording();
    release();
    onClose();
  };

  // Determine VoicePill state
  const getVoicePillState = (): VoiceState => {
    if (questionPhase === "speaking" || speechPhase === "speaking") return "speaking";
    if (questionPhase === "recording") return "listening";
    if (questionPhase === "processing") return "thinking";
    return "idle";
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-[24px] bg-[#0a0a0a] border border-[rgba(255,255,255,0.12)] p-4 sm:p-8 shadow-2xl flex flex-col justify-between my-auto max-h-[94vh] overflow-y-auto">
        {/* ========================================================= */}
        {/* STAGE 1: LOBBY & EQUIPMENT READINESS                      */}
        {/* ========================================================= */}
        {stage === "lobby" && (
          <div className="flex-1 flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[30%] bg-[#141414] border border-[rgba(255,255,255,0.12)] text-[#f5f5f5] font-[650] text-[15px]">
                  M
                </div>
                <div>
                  <h3 className="text-[18px] sm:text-[20px] font-[650] text-[#f5f5f5] tracking-tight">
                    Mira AI Interview Room.
                  </h3>
                  <p className="text-[12px] font-[450] text-[#8a8a8a]">
                    Pre-session readiness check for {targetJobTitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="rounded-full p-2 text-[#8a8a8a] hover:bg-[#1a1a1a] hover:text-[#f5f5f5] transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-4">
              {/* Left: Video Self-View */}
              <div className="flex flex-col items-center space-y-3">
                <div className="relative w-full max-w-[310px] aspect-video rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.10)] overflow-hidden flex items-center justify-center">
                  {hasCamera && isCameraActive && stream ? (
                    <video
                      ref={setLobbyVideo}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: "scaleX(-1)" }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 text-[#8a8a8a]">
                      <VideoOff size={28} />
                      <span className="text-[12px]">
                        {!hasCamera ? "No camera detected" : "Camera turned off"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!stream) {
                            acquire().catch(() => {});
                          } else {
                            setIsCameraActive(true);
                          }
                        }}
                        className="px-3 py-1 rounded-full bg-[#1a1a1a] text-[11px] text-[#f5f5f5] border border-white/10 hover:bg-[#262626] transition-colors"
                      >
                        Enable camera
                      </button>
                    </div>
                  )}

                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] text-[#f5f5f5] font-[500] border border-white/10 flex items-center gap-1.5 z-20">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isAcquired ? "bg-emerald-400 animate-pulse" : "bg-[#707070]"
                      }`}
                    />
                    <span>{candidateName}</span>
                  </div>
                </div>

                <div className="w-full max-w-[310px] flex items-center justify-between text-[11px] text-[#8a8a8a] px-1">
                  <span className="flex items-center gap-1.5">
                    <Mic
                      size={12}
                      className={audioLevel > 0.15 ? "text-emerald-400" : "text-[#707070]"}
                    />
                    <span>Microphone check</span>
                  </span>
                  <div className="w-24 h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-75"
                      style={{ width: `${Math.round(audioLevel * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Right: Briefing & Language Selection */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-[600] text-[#0066ff]">Protocol Guide</span>
                  <h4 className="text-[20px] font-[650] text-[#f5f5f5] tracking-tight">
                    How your AI interview works.
                  </h4>
                  <p className="text-[13px] text-[#8a8a8a] leading-relaxed">
                    Mira asks 5 structured, spoken-length questions covering role fundamentals,
                    technical depth, and system trade-offs. Mira automatically listens after each
                    question.
                  </p>
                </div>

                <div className="space-y-2.5 text-[12px] text-[#8a8a8a]">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Auto-listening begins as soon as Mira finishes speaking.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>Type mode available at any moment if background noise occurs.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>All evaluations link directly to verbatim evidence snippets.</span>
                  </div>
                </div>

                {/* Language Mode Toggle */}
                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] text-[#8a8a8a] mr-2">Language:</span>
                  {(["en", "hi", "hinglish"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        unlockAudio();
                        setLanguage(lang);
                        fetchPlanForLanguage(lang);
                      }}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-[600] transition-colors ${
                        language === lang
                          ? "bg-[#f5f5f5] text-[#0a0a0a]"
                          : "bg-[#141414] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)] hover:text-[#f5f5f5]"
                      }`}
                    >
                      {lang === "en" ? "English" : lang === "hi" ? "Hindi (हिन्दी)" : "Hinglish"}
                    </button>
                  ))}
                  {isPlanLoading && (
                    <span className="text-[11px] text-[#0066ff] flex items-center gap-1">
                      <RefreshCw size={11} className="animate-spin" />
                      <span>Loading questions...</span>
                    </span>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    disabled={isPlanLoading}
                    onClick={handleJoinInterview}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-[#f5f5f5] px-7 text-[14px] font-[600] text-[#0a0a0a] hover:bg-[#e0e0e0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Enter interview room</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fallback loader if questions are ever empty */}
        {stage === "interview" &&
          (sessionQuestions.length === 0 || !sessionQuestions[currentIdx]) && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4 text-center my-auto">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.15)] border-t-[#f5f5f5]" />
              <p className="text-[14px] text-[#8a8a8a]">Preparing your interview session...</p>
            </div>
          )}

        {/* ========================================================= */}
        {/* STAGE 2: REDESIGNED SPLIT INTERVIEW SCREEN                */}
        {/* ========================================================= */}
        {stage === "interview" && sessionQuestions.length > 0 && currentQ && (
          <div className="flex-1 flex flex-col space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Media Column (5fr) */}
              <div className="lg:col-span-5 space-y-4">
                {/* 1. Stacked AI Speaker Card (Top) */}
                <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[30%] bg-[#1a1a1a] border border-[rgba(255,255,255,0.12)] text-[#f5f5f5] font-[650] text-[15px]">
                        M
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[14px] font-[650] text-[#f5f5f5]">Mira</span>
                          <span className="text-[11px] text-[#8a8a8a]">· Technical Panel</span>
                        </div>
                        <span className="text-[11px] text-[#8a8a8a] block">
                          {questionPhase === "preparing"
                            ? STATUS_TEXTS[language].preparingQuestion
                            : questionPhase === "speaking"
                              ? STATUS_TEXTS[language].miraAsking
                              : questionPhase === "processing"
                                ? STATUS_TEXTS[language].processing
                                : STATUS_TEXTS[language].listeningToCandidate}
                        </span>
                      </div>
                    </div>

                    <VoicePill
                      state={getVoicePillState()}
                      audioLevel={questionPhase === "recording" ? recorder.peakLevel : audioLevel}
                      isTtsSpeaking={speechPhase === "speaking"}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.06)] text-[12px]">
                    <button
                      type="button"
                      disabled={questionPhase === "preparing" || questionPhase === "speaking"}
                      onClick={() => {
                        unlockAudio();
                        speakCurrentQuestion(currentQ);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[#8a8a8a] transition-colors",
                        questionPhase === "preparing" || questionPhase === "speaking"
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:text-[#f5f5f5]",
                      )}
                    >
                      <Volume2 size={13} />
                      <span>Repeat question</span>
                    </button>
                    <span className="text-[11px] text-[#5c5c5c] capitalize">
                      Language:{" "}
                      {language === "hi"
                        ? "Hindi"
                        : language === "hinglish"
                          ? "Hinglish"
                          : "English"}
                    </span>
                  </div>
                </div>

                {/* 2. Candidate Camera Card (Bottom, 16:9 mirrored) */}
                <div className="rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-4 space-y-3">
                  <div className="relative w-full aspect-video rounded-[16px] bg-[#0a0a0a] overflow-hidden flex items-center justify-center">
                    {hasCamera && isCameraActive && stream ? (
                      <video
                        ref={setInterviewVideo}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ transform: "scaleX(-1)" }}
                      />
                    ) : hasMic && !hasCamera ? (
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="h-16 w-16 rounded-full bg-[#141414] border border-[rgba(255,255,255,0.15)] flex items-center justify-center text-[18px] font-[700] text-[#f5f5f5]">
                          {candidateName
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <span className="text-[10px] font-[600] px-2.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)]">
                          Audio only mode
                        </span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-[#5c5c5c] bg-[#141414]">
                        <VideoOff size={28} />
                        <span className="text-[12px]">
                          {!isCameraActive ? "Camera feed disabled" : "Camera disconnected"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!stream) {
                              acquire().catch(() => {});
                            } else {
                              setIsCameraActive(true);
                            }
                          }}
                          className="px-3 py-1 rounded-full bg-[#1a1a1a] text-[11px] text-[#f5f5f5] border border-white/10 hover:bg-[#262626] transition-colors"
                        >
                          Turn on camera
                        </button>
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[11px] text-[#f5f5f5] font-[500] border border-white/10 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>You · {candidateName}</span>
                    </div>

                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                      <button
                        type="button"
                        onClick={() => setIsMicMuted(!isMicMuted)}
                        className={`h-7 w-7 rounded-full flex items-center justify-center backdrop-blur-md border transition-colors ${
                          isMicMuted
                            ? "bg-red-500/80 border-red-500/40 text-white"
                            : "bg-black/60 border-white/10 text-white hover:bg-black/80"
                        }`}
                        title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
                      >
                        {isMicMuted ? <MicOff size={13} /> : <Mic size={13} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsCameraActive(!isCameraActive)}
                        className={`h-7 w-7 rounded-full flex items-center justify-center backdrop-blur-md border transition-colors ${
                          !isCameraActive
                            ? "bg-red-500/80 border-red-500/40 text-white"
                            : "bg-black/60 border-white/10 text-white hover:bg-black/80"
                        }`}
                        title={isCameraActive ? "Disable Camera" : "Enable Camera"}
                      >
                        {isCameraActive ? <Video size={13} /> : <VideoOff size={13} />}
                      </button>
                    </div>

                    <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-[#8a8a8a] border border-white/10">
                      Proctoring: Active & Monitored
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#8a8a8a] px-1">
                    <span className="flex items-center gap-1.5">
                      <Mic
                        size={12}
                        className={
                          (recorder.isRecording ? recorder.peakLevel : audioLevel) > 0.15
                            ? "text-emerald-400"
                            : "text-[#707070]"
                        }
                      />
                      <span>Mic Input {isMicMuted ? "(Muted)" : ""}</span>
                    </span>
                    <div className="w-28 h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-75"
                        style={{
                          width: `${
                            isMicMuted
                              ? 0
                              : Math.round(
                                  (recorder.isRecording ? recorder.peakLevel : audioLevel) * 100,
                                )
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Conversation Column (7fr) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Sticky Top Header Bar */}
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141414] text-[12px] font-[600] text-[#f5f5f5] border border-[rgba(255,255,255,0.08)]">
                      <Clock size={12} className="text-[#8a8a8a]" />
                      <span>{formatTime(sessionSeconds)}</span>
                    </span>

                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#141414] text-[12px] font-[600] text-[#0066ff] border border-[rgba(255,255,255,0.08)]">
                      Question {currentIdx + 1} of {sessionQuestions.length}
                    </span>

                    <span className="text-[11px] font-[500] text-[#8a8a8a]">
                      · {currentQ.phaseLabel}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowEndConfirm(true)}
                    className="h-8 px-3.5 rounded-full bg-[#1a1a1a] text-[12px] font-[600] text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
                  >
                    End Session
                  </button>
                </div>

                {/* Synced Transcript Component */}
                <div className="rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-4 min-h-[260px] max-h-[380px] overflow-hidden flex flex-col">
                  <span className="text-[11px] font-[600] text-[#8a8a8a] uppercase tracking-wider mb-2 block">
                    Live Transcript
                  </span>
                  <LiveSyncedTranscript
                    turns={turns}
                    candidateName={candidateName}
                    activeTurnId={activeTurnId}
                    {...(speechPhase === "speaking" || speechProgress.isComplete
                      ? {
                          speechProgress: {
                            turnId: activeTurnId || "",
                            wordIndex: speechProgress.wordIndex,
                            isComplete: speechProgress.isComplete,
                          },
                        }
                      : {})}
                    isPreparingNextQuestion={questionPhase === "preparing"}
                    className="flex-1"
                  />
                </div>

                {/* Controlled Response Area */}
                <div className="rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-4 space-y-3">
                  <div className="flex items-center justify-between text-[12px] text-[#8a8a8a]">
                    <span className="text-[12px] font-[600] text-[#f5f5f5]">
                      {manualTextMode ? "Type Your Response" : "Voice Response"}
                    </span>

                    <button
                      type="button"
                      onClick={() => setManualTextMode(!manualTextMode)}
                      className="inline-flex items-center gap-1.5 text-[#8a8a8a] hover:text-[#f5f5f5] transition-colors"
                    >
                      <Keyboard size={13} />
                      <span>{manualTextMode ? "Switch to Voice" : "Type Answer"}</span>
                    </button>
                  </div>

                  {/* Empty answer warning prompt */}
                  {emptyAnswerWarning && (
                    <div className="rounded-[16px] bg-[#1a1a1a] border border-amber-500/30 p-3 text-[12px] text-amber-300 space-y-2">
                      <p>
                        We could not detect a response. Would you like to record again, type your
                        answer, or skip to the next question?
                      </p>
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEmptyAnswerWarning(false);
                            setQuestionPhase("recording");
                            recorder.startRecording();
                          }}
                          className="px-3 py-1 rounded-full bg-[#f5f5f5] text-[#0a0a0a] text-[11px] font-[600] hover:bg-[#e0e0e0] transition-colors"
                        >
                          Record again
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEmptyAnswerWarning(false);
                            setManualTextMode(true);
                          }}
                          className="px-3 py-1 rounded-full bg-[#141414] border border-white/10 text-[#f5f5f5] text-[11px] font-[600] hover:bg-[#262626] transition-colors"
                        >
                          Type answer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEmptyAnswerWarning(false);
                            commitAnswerAndAdvance("[skipped]");
                          }}
                          className="px-3 py-1 rounded-full bg-transparent text-[#8a8a8a] text-[11px] hover:text-[#f5f5f5] transition-colors"
                        >
                          Skip question
                        </button>
                      </div>
                    </div>
                  )}

                  {manualTextMode ? (
                    <div className="space-y-3">
                      <textarea
                        rows={3}
                        value={manualAnswerText}
                        onChange={(e) => setManualAnswerText(e.target.value)}
                        placeholder="Type your response here..."
                        className="w-full p-3.5 rounded-[16px] bg-[#1a1a1a] border-0 text-[13px] text-[#f5f5f5] placeholder-[#5c5c5c] focus:outline-none focus:ring-2 focus:ring-[#f5f5f5]"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSubmitManualText}
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f5f5f5] px-6 text-[13px] font-[600] text-[#0a0a0a] hover:bg-[#e0e0e0] transition-colors"
                        >
                          <span>Submit answer</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <AnswerRecorder
                      phase={questionPhase}
                      durationSeconds={recorder.durationSeconds}
                      peakLevel={recorder.peakLevel}
                      language={language}
                      onStopAndSubmit={handleFinishAnswer}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* End Session Confirmation Modal */}
            {showEndConfirm && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="max-w-md w-full rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.12)] p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <h4 className="text-[18px] font-[650] text-[#f5f5f5]">End interview?</h4>
                      <p className="text-[13px] text-[#8a8a8a]">
                        Your answers up to question {currentIdx + 1} will be scored. Unanswered
                        questions will receive 0.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                    <button
                      type="button"
                      onClick={() => setShowEndConfirm(false)}
                      className="h-10 px-5 rounded-full bg-[#1a1a1a] text-[13px] font-[600] text-[#f5f5f5] hover:bg-[#262626] transition-colors"
                    >
                      Keep interviewing
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmEndEarly}
                      className="h-10 px-5 rounded-full bg-red-500/10 border border-red-500/30 text-[13px] font-[600] text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      End and score
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* STAGE 2.5: EVALUATION LOADING SCREEN (Kokonut UI)         */}
        {/* ========================================================= */}
        {stage === "evaluating" && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[520px] w-full max-w-2xl mx-auto px-4 py-12 text-center animate-in fade-in duration-300">
            <div className="w-full rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-8 sm:p-12 space-y-8 relative">
              <div className="py-2">
                <AITextLoading
                  texts={[
                    "Evaluating responses...",
                    "Analyzing communication evidence...",
                    "Benchmarking technical competencies...",
                    "Calculating objective rubrics...",
                    "Compiling comprehensive scorecard...",
                    "Almost ready...",
                  ]}
                  className="text-2xl sm:text-3xl font-[650] text-[#f5f5f5] tracking-tight justify-center"
                  interval={1800}
                  showElapsed={false}
                  label="Evaluating interview session"
                />
              </div>

              <div className="space-y-3 max-w-md mx-auto pt-2 border-t border-[rgba(255,255,255,0.06)]">
                <p className="text-[13px] text-[#8a8a8a] leading-relaxed">
                  Every score links directly back to transcripts and verified evidence. Human
                  recruiters review all decisions.
                </p>
                <div className="flex items-center justify-center gap-3 text-[12px] text-[#5c5c5c]">
                  <span>{sessionQuestions.length} Questions Processed</span>
                  <span>•</span>
                  <span>Session Duration {formatTime(sessionSeconds)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STAGE 3: RESULTS SCORECARD                                */}
        {/* ========================================================= */}
        {stage === "scorecard" && scorecard && (
          <div className="flex-1 max-w-[1100px] w-full mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[12px] font-[600] text-[#8a8a8a]">
                    Interview Performance Scorecard
                  </span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#1a1a1a] text-[#8a8a8a] border border-white/10">
                    {scorecard.lowConfidence
                      ? "Fallback keyword scorer · low confidence"
                      : `Scored by ${scorecard.modelUsed}`}
                  </span>
                </div>
                <h1 className="text-[26px] sm:text-[32px] font-[650] text-[#f5f5f5] tracking-tight leading-tight">
                  Interview evaluation.
                </h1>
                <p className="text-[14px] text-[#8a8a8a] mt-1">
                  Candidate <strong className="text-[#f5f5f5]">{scorecard.candidateName}</strong>{" "}
                  for <strong className="text-[#f5f5f5]">{scorecard.targetJobTitle}</strong> ·
                  Evaluated{" "}
                  {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.12)] px-5 text-[13px] font-[600] text-[#f5f5f5] hover:bg-[#262626] transition-colors"
                >
                  <RotateCcw size={14} />
                  <span>Retake Interview</span>
                </button>

                <button
                  type="button"
                  onClick={handleDone}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#f5f5f5] px-7 text-[13px] font-[600] text-[#0a0a0a] hover:bg-[#e0e0e0] transition-colors"
                >
                  <span>Done</span>
                </button>
              </div>
            </div>

            {/* Apple Activity Rings with unified score tone */}
            <div className="space-y-2">
              <AppleActivityCard
                title="Competency Activity Rings"
                overallScore={scorecard.overallScore}
                activities={[
                  {
                    label: "Technical Accuracy",
                    current: scorecard.categories.technicalAccuracy,
                    target: 100,
                    color: scoreTone(scorecard.categories.technicalAccuracy).color,
                    colorEnd: scoreTone(scorecard.categories.technicalAccuracy).color,
                    size: 200,
                    description:
                      "Grounded technical depth, core stack mechanisms, and architecture",
                  },
                  {
                    label: "Communication Clarity",
                    current: scorecard.categories.communicationClarity,
                    target: 100,
                    color: scoreTone(scorecard.categories.communicationClarity).color,
                    colorEnd: scoreTone(scorecard.categories.communicationClarity).color,
                    size: 160,
                    description: "Structured responses, articulate reasoning, and concise delivery",
                  },
                  {
                    label: "Problem Solving",
                    current: scorecard.categories.problemSolving,
                    target: 100,
                    color: scoreTone(scorecard.categories.problemSolving).color,
                    colorEnd: scoreTone(scorecard.categories.problemSolving).color,
                    size: 120,
                    description: "System engineering judgment, trade-offs, and pragmatic decisions",
                  },
                ]}
              />
              <p className="text-[11px] text-[#707070] text-center">
                Rings show 3 of 6 rubric components; the overall score uses all six.
              </p>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-5 space-y-2.5">
                <span className="text-[12px] font-[650] text-[#f5f5f5] block">
                  Identified Strengths
                </span>
                <ul className="space-y-1.5 text-[13px] text-[#8a8a8a] pl-4 list-disc">
                  {scorecard.keyTakeaways.slice(0, 3).map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-5 space-y-2.5">
                <span className="text-[12px] font-[650] text-[#f5f5f5] block">
                  Observed Gaps & Trade-offs
                </span>
                <ul className="space-y-1.5 text-[13px] text-[#8a8a8a] pl-4 list-disc">
                  {(scorecard.gaps || []).slice(0, 3).map((item: string, idx: number) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-5 space-y-2.5">
                <span className="text-[12px] font-[650] text-[#f5f5f5] block">
                  Questions for Human Interview Round
                </span>
                <ul className="space-y-1.5 text-[13px] text-[#8a8a8a] pl-4 list-disc">
                  {scorecard.recruiterVerificationNotes.slice(0, 3).map((note, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Question-by-Question Audit & Transcripts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[18px] font-[650] text-[#f5f5f5]">
                  Question-by-Question Audit & Transcripts.
                </h3>
                <span className="text-[12px] text-[#8a8a8a]">
                  Overall = average of question scores
                </span>
              </div>

              <div className="space-y-3">
                {scorecard.answers.map((item, idx) => {
                  const isExpanded =
                    expandedAnswerId === item.questionId ||
                    (expandedAnswerId === null && idx === 0);
                  const tone = scoreTone(item.compositeScore);

                  return (
                    <div
                      key={item.questionId}
                      className="rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-5 space-y-3"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedAnswerId(isExpanded ? "none" : item.questionId)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <div className="space-y-1">
                          <span className="text-[11px] font-[600] text-[#0066ff] block">
                            Question {idx + 1} · {item.phaseLabel}
                          </span>
                          <span className="text-[15px] font-[600] text-[#f5f5f5] block">
                            {item.question}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <span
                            className="text-[13px] font-[650] tabular px-2.5 py-0.5 rounded-full"
                            style={{ color: tone.color, backgroundColor: tone.badgeBg }}
                          >
                            Score: {item.compositeScore}/100
                          </span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] space-y-4 text-[13px] animate-in fade-in duration-150">
                          <p className="text-[11px] text-[#707070]">
                            Question score = weighted rubric average. Overall = average of question
                            scores.
                          </p>

                          {/* Transcribed Candidate Response */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-[600] text-[#8a8a8a] block">
                              Transcribed Candidate Response:
                            </span>
                            <p className="p-3.5 rounded-[14px] bg-[#1a1a1a] text-[#d4d4d4] text-[13px] leading-relaxed italic">
                              "{item.transcribedAnswer}"
                            </p>

                            {/* English translation if applicable */}
                            {item.englishTranslation && (
                              <div className="p-3 rounded-[12px] bg-[#1a1a1a]/70 border border-white/5 text-[12px] text-[#8a8a8a] space-y-1">
                                <span className="font-[600] text-[#f5f5f5] block text-[11px]">
                                  English Translation:
                                </span>
                                <p className="italic">"{item.englishTranslation}"</p>
                              </div>
                            )}

                            {/* Verbatim Evidence Quotes */}
                            {item.evidenceQuotes && item.evidenceQuotes.length > 0 && (
                              <div className="pt-1.5 space-y-1">
                                <span className="text-[11px] font-[600] text-[#8a8a8a] flex items-center gap-1.5">
                                  <Quote size={12} className="text-[#0066ff]" />
                                  <span>Grounded Evidence Quotes:</span>
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {item.evidenceQuotes.map((quote, qIdx) => (
                                    <span
                                      key={qIdx}
                                      className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#1a1a1a] border border-white/10 text-[11px] text-[#f5f5f5]"
                                    >
                                      "{quote}"
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* All 6 Rubric Dimensions with weights */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-[600] text-[#8a8a8a] block">
                              6-Dimensional Rubric Breakdown:
                            </span>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-left">
                              {(Object.keys(RUBRIC_WEIGHTS) as RubricKey[]).map((dimKey) => {
                                const val = item.rubric[dimKey];
                                const dimTone = val !== null ? scoreTone(val) : null;
                                const meta = RUBRIC_LABELS[dimKey];

                                return (
                                  <div
                                    key={dimKey}
                                    className="rounded-[12px] bg-[#1a1a1a] p-2.5 border border-[rgba(255,255,255,0.06)] space-y-1"
                                  >
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-[#8a8a8a] truncate">{meta.label}</span>
                                      <span className="text-[#5c5c5c] shrink-0 font-[600]">
                                        {meta.weight}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span
                                        className="text-[14px] font-[650] tabular"
                                        style={{ color: dimTone ? dimTone.color : "#5c5c5c" }}
                                      >
                                        {val !== null ? `${val}%` : "—"}
                                      </span>
                                    </div>
                                    <div className="h-1 rounded-full bg-[#141414] overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                          width: `${val !== null ? val : 0}%`,
                                          backgroundColor: dimTone ? dimTone.color : "#333",
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Strengths & Improvements */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
                            <div className="space-y-1">
                              <span className="font-[600] text-emerald-400 block">
                                Strengths Identified:
                              </span>
                              <ul className="list-disc pl-4 space-y-1 text-[#8a8a8a]">
                                {item.strengths.map((s, sIdx) => (
                                  <li key={sIdx}>{s}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="space-y-1">
                              <span className="font-[600] text-amber-400 block">
                                Improvement Recommendations:
                              </span>
                              <ul className="list-disc pl-4 space-y-1 text-[#8a8a8a]">
                                {item.improvements.map((imp, impIdx) => (
                                  <li key={impIdx}>{imp}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Benchmark Outline */}
                          <div className="p-3.5 rounded-[14px] bg-[#1a1a1a]/60 border border-[rgba(255,255,255,0.06)] space-y-1 text-[12px]">
                            <span className="font-[600] text-[#f5f5f5] block">
                              Mira's Benchmark Guide:
                            </span>
                            <p className="text-[#8a8a8a] leading-relaxed">{item.modelAnswer}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
