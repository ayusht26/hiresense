import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  Clock,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Radio,
  Keyboard,
} from "lucide-react";
import {
  generateInterviewQuestions,
  evaluateInterviewSession,
  type InterviewQuestion,
  type InterviewScorecard,
} from "@/lib/ai-interview";
import { MiraWaveform, type WaveformState } from "./MiraWaveform";

interface AiInterviewRoomProps {
  candidateName: string;
  targetJobTitle: string;
  jobPosting?: Record<string, any>;
  verificationQuestions?: string[];
  preferredLanguage?: "en" | "hi" | "code_mixed";
  onClose: () => void;
}

export function AiInterviewRoom({
  candidateName,
  targetJobTitle,
  jobPosting = {},
  verificationQuestions = [],
  preferredLanguage = "en",
  onClose,
}: AiInterviewRoomProps) {
  const [mounted, setMounted] = useState(false);

  // Session Stage: "lobby" | "interview" | "scorecard"
  const [stage, setStage] = useState<"lobby" | "interview" | "scorecard">("lobby");

  // Interview Configuration
  const [language, setLanguage] = useState<"en" | "hi" | "code_mixed">(preferredLanguage);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Audio & Video Devices
  const [hasCamera, setHasCamera] = useState(true);
  const [hasMic, setHasMic] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [micAudioLevel, setMicAudioLevel] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Live Interview State
  const [miraState, setMiraState] = useState<WaveformState>("speaking");
  const [isTtsSpeaking, setIsTtsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [manualTextMode, setManualTextMode] = useState(false);

  // Captured Answers & Durations
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Scorecard
  const [scorecard, setScorecard] = useState<InterviewScorecard | null>(null);
  const [expandedAnswerId, setExpandedAnswerId] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef<boolean>(false);
  const restartTimerRef = useRef<any>(null);

  // Mount check & body scroll locking
  useEffect(() => {
    setMounted(true);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, []);

  // 1. Initialize questions
  useEffect(() => {
    const list = generateInterviewQuestions(targetJobTitle, jobPosting, verificationQuestions);
    setQuestions(list);
  }, [targetJobTitle, jobPosting, verificationQuestions]);

  // Comprehensive hardware shutdown function (security & privacy)
  const releaseAllMedia = () => {
    shouldListenRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }

    // Stop speech synthesis
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    // Release camera and microphone hardware tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (lobbyVideoRef.current) {
      lobbyVideoRef.current.srcObject = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setMicAudioLevel(0);
    setIsRecognizing(false);
    setIsListening(false);
  };

  // Hardware acquisition function
  const initMedia = async () => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 720 },
          height: { ideal: 720 },
          aspectRatio: 1.0,
          facingMode: "user",
        },
        audio: true,
      });
      mediaStreamRef.current = stream;

      if (lobbyVideoRef.current) {
        lobbyVideoRef.current.srcObject = stream;
        lobbyVideoRef.current.play().catch(() => {});
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Setup Web Audio Analyser
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const checkAudio = () => {
            if (analyserRef.current && mediaStreamRef.current?.active) {
              const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setMicAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              requestAnimationFrame(checkAudio);
            }
          };
          requestAnimationFrame(checkAudio);
        }
      } catch (audioErr) {
        console.warn("Audio analyser fallback:", audioErr);
      }

      setHasCamera(true);
      setHasMic(true);
      setIsCameraActive(true);
      setIsMicMuted(false);
      setCameraError(null);
    } catch (err: any) {
      console.warn("Camera or microphone permission error:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera and microphone access was not granted. You can still proceed with text mode."
          : "Could not access hardware camera/mic."
      );
      setHasCamera(false);
    }
  };

  // Hardware initialization on mount & cleanup on unmount
  useEffect(() => {
    initMedia();
    return () => {
      releaseAllMedia();
    };
  }, []);

  // Sync stream to video elements when transitioning
  useEffect(() => {
    if (stage === "interview" && videoRef.current && mediaStreamRef.current && isCameraActive) {
      if (videoRef.current.srcObject !== mediaStreamRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
      }
      videoRef.current.play().catch(() => {});
    } else if (stage === "lobby" && lobbyVideoRef.current && mediaStreamRef.current) {
      if (lobbyVideoRef.current.srcObject !== mediaStreamRef.current) {
        lobbyVideoRef.current.srcObject = mediaStreamRef.current;
      }
      lobbyVideoRef.current.play().catch(() => {});
    }
  }, [stage, isCameraActive]);

  // Session Timer
  useEffect(() => {
    if (stage !== "interview") return;
    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [stage]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 3. Speech Synthesis (TTS for Mira)
  const speakText = (text: string, onEndCallback?: () => void) => {
    if (!("speechSynthesis" in window)) {
      setMiraState("listening");
      setIsTtsSpeaking(false);
      startSpeechRecognition();
      if (onEndCallback) onEndCallback();
      return;
    }

    window.speechSynthesis.cancel();
    stopSpeechRecognition();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.includes("en-IN") || v.name.toLowerCase().includes("india")) ||
      voices.find((v) => v.lang.includes("en-US") && v.name.includes("Natural")) ||
      voices.find((v) => v.lang.includes("en"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    setMiraState("speaking");
    setIsTtsSpeaking(true);

    utterance.onend = () => {
      setIsTtsSpeaking(false);
      setMiraState("listening");
      startSpeechRecognition();
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = () => {
      setIsTtsSpeaking(false);
      setMiraState("listening");
      startSpeechRecognition();
    };

    window.speechSynthesis.speak(utterance);
  };

  // 4. Speech Recognition (STT for Candidate answers)
  const startSpeechRecognition = () => {
    if (isMicMuted || stage !== "interview") return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setManualTextMode(true);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === "hi" ? "hi-IN" : "en-IN";

      shouldListenRef.current = true;

      recognition.onstart = () => {
        setIsRecognizing(true);
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = 0; i < event.results.length; ++i) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += chunk + " ";
          } else {
            interimTranscript += chunk;
          }
        }

        const combined = (finalTranscript + interimTranscript).trim();
        if (combined) {
          setCurrentAnswer(combined);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "no-speech") return;
        console.warn("Speech recognition notice:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setManualTextMode(true);
          shouldListenRef.current = false;
          setIsRecognizing(false);
        }
      };

      recognition.onend = () => {
        setIsRecognizing(false);
        if (shouldListenRef.current && !isMicMuted && stage === "interview") {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (shouldListenRef.current && !isMicMuted && stage === "interview") {
              try {
                recognition.start();
              } catch (_) {}
            }
          }, 250);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("Speech recognition initialization fallback:", err);
      setIsRecognizing(false);
    }
  };

  const stopSpeechRecognition = () => {
    shouldListenRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsRecognizing(false);
    setIsListening(false);
  };

  // Question rotation
  useEffect(() => {
    if (stage === "interview" && questions.length > 0 && questions[currentIdx]) {
      const q = questions[currentIdx];
      setCurrentAnswer("");
      setQuestionStartTime(Date.now());
      stopSpeechRecognition();

      const timer = setTimeout(() => {
        speakText(q.question);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [stage, currentIdx, questions]);

  // Actions
  const handleJoinInterview = () => {
    setStage("interview");
    setCurrentIdx(0);
    setSessionSeconds(0);
    setAnswers({});
    setDurations({});
  };

  const handleRepeatQuestion = () => {
    if (questions[currentIdx]) {
      stopSpeechRecognition();
      speakText(questions[currentIdx].question);
    }
  };

  const handleToggleMic = () => {
    const nextState = !isMicMuted;
    setIsMicMuted(nextState);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextState;
      });
    }
    if (nextState) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  };

  const handleToggleCamera = () => {
    const nextState = !isCameraActive;
    setIsCameraActive(nextState);

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }

    if (videoRef.current && mediaStreamRef.current) {
      if (videoRef.current.srcObject !== mediaStreamRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
      }
      if (nextState) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handleNextQuestion = () => {
    stopSpeechRecognition();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const currentQ = questions[currentIdx];
    if (!currentQ) return;

    const timeSpent = Math.max(5, Math.round((Date.now() - questionStartTime) / 1000));
    const finalAnswer = currentAnswer.trim();

    const updatedAnswers = { ...answers, [currentQ.id]: finalAnswer };
    const updatedDurations = { ...durations, [currentQ.id]: timeSpent };

    setAnswers(updatedAnswers);
    setDurations(updatedDurations);

    if (currentIdx < questions.length - 1) {
      setMiraState("thinking");
      setTimeout(() => {
        setCurrentIdx((prev) => prev + 1);
      }, 500);
    } else {
      // Completed all questions -> Immediately stop all media hardware for security
      releaseAllMedia();

      setMiraState("thinking");
      setTimeout(() => {
        const finalScorecard = evaluateInterviewSession(
          candidateName,
          targetJobTitle,
          questions,
          updatedAnswers,
          updatedDurations
        );
        setScorecard(finalScorecard);
        setStage("scorecard");
      }, 600);
    }
  };

  const handleEndInterviewEarly = () => {
    const currentQ = questions[currentIdx];
    const finalAnswer = currentAnswer.trim();
    const updatedAnswers = {
      ...answers,
      [currentQ?.id || "q_early"]: finalAnswer,
    };
    const updatedDurations = {
      ...durations,
      [currentQ?.id || "q_early"]: Math.max(5, Math.round((Date.now() - questionStartTime) / 1000)),
    };

    // Immediately stop camera & microphone hardware!
    releaseAllMedia();

    const finalScorecard = evaluateInterviewSession(
      candidateName,
      targetJobTitle,
      questions,
      updatedAnswers,
      updatedDurations
    );
    setScorecard(finalScorecard);
    setStage("scorecard");
  };

  const handleClose = () => {
    releaseAllMedia();
    onClose();
  };

  const handleRetake = () => {
    setStage("lobby");
    setCurrentIdx(0);
    setAnswers({});
    setDurations({});
    initMedia();
  };

  if (!mounted) return null;

  // Use createPortal to mount directly to document.body, escaping any parent stacking contexts
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-[24px] bg-[#0a0a0a] border border-[rgba(255,255,255,0.12)] p-4 sm:p-7 shadow-2xl flex flex-col justify-between my-auto max-h-[92vh] overflow-y-auto">
        {/* ========================================================= */}
        {/* STAGE 1: LOBBY & EQUIPMENT READINESS                      */}
        {/* ========================================================= */}
        {stage === "lobby" && (
          <div className="flex-1 flex flex-col justify-between space-y-6">
            {/* Header */}
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
                    Pre-session readiness check for{" "}
                    <span className="text-[#f5f5f5] font-[600]">{targetJobTitle}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="text-[#8a8a8a] hover:text-[#f5f5f5] p-1.5 transition-colors"
                title="Exit interview setup"
              >
                <X size={20} />
              </button>
            </div>

            {/* Main Lobby Content: Square Camera Mirror & Briefing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center flex-1">
              {/* Left: Square Camera Preview Mirror (Full face visible) */}
              <div className="rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-5 flex flex-col items-center justify-center space-y-3 relative overflow-hidden">
                <div className="relative w-full aspect-square max-w-[280px] sm:max-w-[310px] rounded-[18px] bg-[#1a1a1a] overflow-hidden flex items-center justify-center border border-[rgba(255,255,255,0.08)] shadow-inner">
                  {hasCamera && !cameraError ? (
                    <video
                      ref={lobbyVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: "scaleX(-1)" }}
                    />
                  ) : (
                    <div className="w-full h-full rounded-[14px] bg-[#1a1a1a] flex flex-col items-center justify-center text-center p-4 space-y-2">
                      <User size={40} className="text-[#5c5c5c]" />
                      <span className="text-[13px] font-[500] text-[#8a8a8a]">
                        Camera mirror unavailable
                      </span>
                      <span className="text-[11px] text-[#5c5c5c] max-w-xs">
                        {cameraError || "Audio and text mode will remain fully enabled."}
                      </span>
                    </div>
                  )}

                  {/* Camera overlay badge */}
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[11px] text-[#f5f5f5] font-[500] border border-white/10 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Video Check Active</span>
                  </div>
                </div>

                {/* Live Mic Meter */}
                <div className="w-full max-w-[310px] flex items-center justify-between text-[12px] text-[#8a8a8a] px-1 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Mic size={14} className={micAudioLevel > 15 ? "text-emerald-400" : "text-[#8a8a8a]"} />
                    <span>Mic Activity</span>
                  </div>
                  <div className="w-28 h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-75"
                      style={{ width: `${micAudioLevel}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Right: Interview Briefing & Language Selection */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#1a1a1a] text-[11px] font-[600] text-[#60a5fa] border border-[#3b82f6]/30">
                    AI Interviewer · Mira
                  </span>
                  <h4 className="text-[18px] font-[650] text-[#f5f5f5]">
                    Meet your technical interviewer.
                  </h4>
                  <p className="text-[13px] text-[#8a8a8a] leading-relaxed">
                    Mira conducts an interactive, spoken technical assessment tailored to your resume
                    and this role's mandatory requirements. Mira listens, probes deeper when an answer is
                    brief, and evaluates real-world problem solving.
                  </p>
                </div>

                {/* Session Highlights */}
                <div className="space-y-2 text-[12px] text-[#8a8a8a]">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[#f5f5f5]" />
                    <span>Estimated duration: 15 minutes · 5 structured questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-[#f5f5f5]" />
                    <span>Transparent scoring: unanswered questions receive 0 points; hardware releases on session end</span>
                  </div>
                </div>

                {/* Language Mode Toggle */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[12px] font-[600] text-[#8a8a8a]">Preferred Language</span>
                  <div className="flex items-center gap-2">
                    {(["en", "hi", "code_mixed"] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setLanguage(lang)}
                        className={`px-3.5 py-1.5 rounded-full text-[12px] font-[600] transition-colors ${
                          language === lang
                            ? "bg-[#f5f5f5] text-[#0a0a0a]"
                            : "bg-[#141414] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)] hover:text-[#f5f5f5]"
                        }`}
                      >
                        {lang === "en" ? "English" : lang === "hi" ? "Hindi (हिन्दी)" : "Hinglish"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Join CTA */}
            <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.08)] pt-4 flex-wrap gap-3">
              <span className="text-[12px] text-[#707070]">
                Candidate: <strong className="text-[#f5f5f5]">{candidateName}</strong>
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="h-10 px-5 rounded-full text-[13px] font-[600] text-[#8a8a8a] hover:text-[#f5f5f5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleJoinInterview}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[#f5f5f5] px-7 text-[14px] font-[600] text-[#0a0a0a] hover:bg-[#e0e0e0] transition-all active:scale-[0.98] shadow-lg"
                >
                  <span>Enter Interview Room</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STAGE 2: LIVE AI INTERVIEW ROOM (THE DUAL VIEW EXPERIENCE) */}
        {/* ========================================================= */}
        {stage === "interview" && questions[currentIdx] && (
          <div className="flex-1 flex flex-col justify-between space-y-4">
            {/* Top Bar: Progress, Timer, End Session */}
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-[30%] bg-[#141414] border border-[rgba(255,255,255,0.12)] text-[#f5f5f5] font-[650] text-[13px]">
                  M
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-[650] text-[#f5f5f5]">Mira · Technical Panel</span>
                  <span className="text-[#5c5c5c]">/</span>
                  <span className="text-[12px] text-[#8a8a8a]">{targetJobTitle}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141414] text-[12px] font-[600] text-[#8a8a8a] border border-[rgba(255,255,255,0.08)]">
                  <Clock size={12} className="text-[#f5f5f5]" />
                  <span>{formatTime(sessionSeconds)}</span>
                </span>

                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#141414] text-[12px] font-[600] text-[#60a5fa] border border-[#3b82f6]/30">
                  Question {currentIdx + 1} of {questions.length}
                </span>

                <button
                  type="button"
                  onClick={handleEndInterviewEarly}
                  className="h-8 px-3.5 rounded-full bg-[#1a1a1a] text-[12px] font-[600] text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
                >
                  End Session
                </button>
              </div>
            </div>

            {/* Central Dual View: Mira Interviewer Tile (Left) + Candidate Tile (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 items-stretch">
              {/* Tile 1: Mira AI Interviewer */}
              <div className="rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-4 sm:p-5 flex flex-col justify-between space-y-3">
                {/* Mira Header & Waveform */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-[30%] bg-[#1a1a1a] flex items-center justify-center text-[#f5f5f5] font-[600] text-[14px] border border-[rgba(255,255,255,0.12)]">
                      M
                    </div>
                    <div>
                      <span className="text-[13px] font-[650] text-[#f5f5f5]">Mira</span>
                      <span className="block text-[11px] text-[#8a8a8a]">
                        {miraState === "speaking"
                          ? "Speaking question..."
                          : miraState === "thinking"
                          ? "Thinking..."
                          : "Listening to your answer..."}
                      </span>
                    </div>
                  </div>

                  {/* Active Waveform */}
                  <MiraWaveform state={miraState} audioLevel={micAudioLevel} size="sm" />
                </div>

                {/* Question Display */}
                <div className="space-y-1.5 py-1">
                  <span className="inline-block text-[11px] font-[600] text-[#8a8a8a] uppercase tracking-wider">
                    {questions[currentIdx].phaseLabel}
                  </span>
                  <h4 className="text-[16px] sm:text-[18px] font-[650] text-[#f5f5f5] leading-snug">
                    "{questions[currentIdx].question}"
                  </h4>
                  <p className="text-[12px] text-[#707070] italic">
                    Hint: {questions[currentIdx].contextHint}
                  </p>
                </div>

                {/* Repeat Audio Button & Language Indicator */}
                <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.06)]">
                  <button
                    type="button"
                    onClick={handleRepeatQuestion}
                    className="inline-flex items-center gap-1.5 text-[12px] font-[600] text-[#8a8a8a] hover:text-[#f5f5f5] transition-colors"
                  >
                    <Volume2 size={14} />
                    <span>Repeat question</span>
                  </button>

                  <span className="text-[11px] text-[#5c5c5c]">
                    Language: {language === "hi" ? "Hindi" : language === "code_mixed" ? "Hinglish (en-IN)" : "English"}
                  </span>
                </div>
              </div>

              {/* Tile 2: Candidate Video Feed (Permanently mounted, instant re-toggle) */}
              <div className="rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-4 flex flex-col justify-between relative overflow-hidden">
                <div className="relative w-full h-[200px] sm:h-[220px] rounded-[16px] bg-[#0a0a0a] overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transition-opacity duration-200 ${
                      hasCamera && isCameraActive ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                    style={{ transform: "scaleX(-1)" }}
                  />

                  {(!hasCamera || !isCameraActive) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-[#5c5c5c] bg-[#141414]">
                      <VideoOff size={32} />
                      <span className="text-[12px] font-[500]">Camera feed disabled</span>
                      <button
                        type="button"
                        onClick={handleToggleCamera}
                        className="px-3 py-1 rounded-full bg-[#1a1a1a] text-[11px] text-[#f5f5f5] border border-white/10 hover:bg-[#262626] transition-colors"
                      >
                        Turn on camera
                      </button>
                    </div>
                  )}

                  {/* Candidate Name Badge */}
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[11px] text-[#f5f5f5] font-[500] border border-white/10 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{candidateName}</span>
                  </div>

                  {/* Camera & Mic Action Toggles */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                    <button
                      type="button"
                      onClick={handleToggleMic}
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
                      onClick={handleToggleCamera}
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

                  {/* Proctoring Event Tag */}
                  <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-[#8a8a8a] border border-white/10">
                    Proctoring: Active & Monitored
                  </div>
                </div>

                {/* Sub-bar: Mic Input Meter */}
                <div className="flex items-center justify-between text-[11px] text-[#8a8a8a] pt-2">
                  <span className="flex items-center gap-1.5">
                    <Mic size={12} className={micAudioLevel > 15 ? "text-emerald-400" : "text-[#707070]"} />
                    <span>Mic Level {isMicMuted ? "(Muted)" : ""}</span>
                  </span>
                  <div className="w-28 h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-75"
                      style={{ width: `${isMicMuted ? 0 : micAudioLevel}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Zone: Live Transcript Subtitles & Action Controls */}
            <div className="rounded-[18px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-3.5 space-y-3 sticky bottom-0 z-20">
              {/* Header inside Transcript */}
              <div className="flex items-center justify-between text-[11px] text-[#8a8a8a] flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-[600]">
                    <Radio size={12} className="animate-pulse text-emerald-400" />
                    <span>
                      {isRecognizing ? "Mic Live · Transcribing Speech" : "Speech Detection Ready"}
                    </span>
                  </span>

                  {!isRecognizing && !isMicMuted && (
                    <button
                      type="button"
                      onClick={startSpeechRecognition}
                      className="px-2.5 py-0.5 rounded-full bg-[#1a1a1a] text-[11px] text-[#f5f5f5] border border-white/10 hover:bg-[#262626] transition-colors"
                    >
                      Tap to Start Transcribing
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setManualTextMode(!manualTextMode)}
                  className="flex items-center gap-1 text-[#707070] hover:text-[#f5f5f5] text-[11px] transition-colors"
                >
                  <Keyboard size={12} />
                  <span>{manualTextMode ? "Switch to Voice Transcript" : "Type Answer Manually"}</span>
                </button>
              </div>

              {/* Live Transcript / Manual Input */}
              {manualTextMode ? (
                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type your answer here or paste code..."
                  className="w-full h-18 rounded-[12px] bg-[#1a1a1a] p-2.5 text-[13px] text-[#f5f5f5] placeholder:text-[#5c5c5c] border border-[rgba(255,255,255,0.06)] focus:outline-none focus:ring-1 focus:ring-white resize-none"
                />
              ) : (
                <div className="min-h-[50px] max-h-[85px] overflow-y-auto rounded-[12px] bg-[#1a1a1a] p-3 text-[13px] text-[#f5f5f5] border border-[rgba(255,255,255,0.06)] flex items-start justify-between">
                  <p className="italic text-[#d4d4d4] leading-relaxed">
                    {currentAnswer || (
                      <span className="text-[#707070] not-italic">
                        {isRecognizing
                          ? "Listening to you... Speak into your microphone to record your answer."
                          : "Click 'Tap to Start Transcribing' or speak. Your spoken answer will appear here in real time."}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Bottom Control Actions */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-[12px] text-[#8a8a8a]">
                    Phase {currentIdx + 1} of 5: {questions[currentIdx].phaseLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f5f5f5] px-6 text-[13px] font-[600] text-[#0a0a0a] hover:bg-[#e0e0e0] transition-all active:scale-[0.98] shadow-md"
                  >
                    <span>
                      {currentIdx === questions.length - 1 ? "Submit & View Scorecard" : "Submit & Next Question"}
                    </span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STAGE 3: POST-INTERVIEW PERFORMANCE SCORECARD             */}
        {/* ========================================================= */}
        {stage === "scorecard" && scorecard && (
          <div className="flex-1 flex flex-col justify-between space-y-6 overflow-y-auto pr-1">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4 flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-[600] border border-emerald-500/30">
                    Interview Assessment Complete
                  </span>
                  <span className="text-[12px] text-[#707070]">
                    Evaluated by Mira AI Engine · {scorecard.durationFormatted}
                  </span>
                </div>
                <h3 className="text-[20px] sm:text-[24px] font-[650] text-[#f5f5f5] tracking-tight">
                  Interview Performance Scorecard.
                </h3>
                <p className="text-[13px] text-[#8a8a8a]">
                  Candidate <strong className="text-[#f5f5f5]">{scorecard.candidateName}</strong> for{" "}
                  <strong className="text-[#f5f5f5]">{scorecard.targetJobTitle}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.12)] px-4 text-[12px] font-[600] text-[#f5f5f5] hover:bg-[#262626] transition-colors"
                >
                  <RotateCcw size={13} />
                  <span>Retake Interview</span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#f5f5f5] px-5 text-[12px] font-[600] text-[#0a0a0a] hover:bg-[#e0e0e0] transition-colors"
                >
                  <span>Done</span>
                </button>
              </div>
            </div>

            {/* Overall Score & Dimension Rubrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Primary Score Box */}
              <div className="rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-5 flex flex-col items-center justify-center text-center space-y-2">
                <span className="text-[12px] font-[600] text-[#8a8a8a]">Overall Score</span>
                <div className="text-[44px] font-[650] text-[#f5f5f5] tracking-tight leading-none">
                  {scorecard.overallScore}
                  <span className="text-[20px] text-[#707070]">/100</span>
                </div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-[12px] font-[600] ${
                    scorecard.fitVerdict === "Strong Fit"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : scorecard.overallScore === 0
                      ? "bg-red-500/10 text-red-400 border border-red-500/30"
                      : "bg-[#1a1a1a] text-[#f5f5f5] border border-[rgba(255,255,255,0.12)]"
                  }`}
                >
                  {scorecard.overallScore === 0 ? "Unanswered / Incomplete" : scorecard.fitVerdict}
                </span>
              </div>

              {/* Rubric 1: Technical Depth */}
              <div className="rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-4 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between text-[12px] text-[#8a8a8a]">
                  <span>Technical Accuracy</span>
                  <span className="text-[#f5f5f5] font-[650]">
                    {scorecard.categories.technicalAccuracy}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
                  <div
                    className="h-full bg-[#f5f5f5]"
                    style={{ width: `${scorecard.categories.technicalAccuracy}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#707070]">
                  Grounded coverage of core stack, asynchronous operations, and race conditions.
                </p>
              </div>

              {/* Rubric 2: Communication & STAR */}
              <div className="rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-4 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between text-[12px] text-[#8a8a8a]">
                  <span>Communication Clarity</span>
                  <span className="text-[#f5f5f5] font-[650]">
                    {scorecard.categories.communicationClarity}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
                  <div
                    className="h-full bg-[#f5f5f5]"
                    style={{ width: `${scorecard.categories.communicationClarity}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#707070]">
                  Structured responses, articulate reasoning, and clear context framing.
                </p>
              </div>

              {/* Rubric 3: Problem Solving */}
              <div className="rounded-[20px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-4 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between text-[12px] text-[#8a8a8a]">
                  <span>Problem Solving</span>
                  <span className="text-[#f5f5f5] font-[650]">
                    {scorecard.categories.problemSolving}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
                  <div
                    className="h-full bg-[#f5f5f5]"
                    style={{ width: `${scorecard.categories.problemSolving}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#707070]">
                  System architecture decisions, trade-offs, and pragmatic engineering maturity.
                </p>
              </div>
            </div>

            {/* Question-by-Question Audit Accordion */}
            <div className="space-y-3">
              <h4 className="text-[15px] font-[650] text-[#f5f5f5]">
                Question-by-Question Audit & Transcripts
              </h4>

              <div className="space-y-2.5">
                {scorecard.answers.map((item, idx) => {
                  const isExpanded = expandedAnswerId === item.questionId;
                  const isZero = item.metrics.technicalScore === 0;

                  return (
                    <div
                      key={item.questionId}
                      className="rounded-[16px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-4 space-y-3"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAnswerId(isExpanded ? null : item.questionId)
                        }
                        className="w-full flex items-center justify-between text-left"
                      >
                        <div className="space-y-1">
                          <span className="text-[11px] font-[600] text-[#60a5fa] block">
                            Question {idx + 1} · {item.phaseLabel}
                          </span>
                          <span className="text-[14px] font-[600] text-[#f5f5f5] block">
                            {item.question}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <span
                            className={`text-[12px] font-[650] ${
                              isZero ? "text-red-400" : "text-[#f5f5f5]"
                            }`}
                          >
                            Score: {item.metrics.technicalScore}/100
                          </span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] space-y-3 text-[13px] animate-in fade-in duration-150">
                          {/* Transcribed response */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-[600] text-[#8a8a8a] block">
                              Transcribed Answer:
                            </span>
                            <p
                              className={`p-3 rounded-[12px] text-[13px] leading-relaxed italic ${
                                isZero
                                  ? "bg-red-500/10 text-red-300 border border-red-500/20"
                                  : "bg-[#1a1a1a] text-[#d4d4d4]"
                              }`}
                            >
                              "{item.transcribedAnswer}"
                            </p>
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

                          {/* Ideal Answer Suggestion */}
                          <div className="p-3 rounded-[12px] bg-[#1a1a1a]/60 border border-[rgba(255,255,255,0.06)] space-y-1 text-[12px]">
                            <span className="font-[600] text-[#f5f5f5] block">
                              Mira's Benchmark Guide:
                            </span>
                            <p className="text-[#8a8a8a]">{item.modelAnswer}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recruiter Verification Notes */}
            <div className="rounded-[16px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-4 space-y-2">
              <span className="text-[12px] font-[650] text-[#f5f5f5] block">
                Next-Step Human Recruiter Verification Notes
              </span>
              <ul className="list-disc pl-5 text-[13px] text-[#8a8a8a] space-y-1">
                {scorecard.recruiterVerificationNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
