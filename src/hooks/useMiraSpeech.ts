"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  tokenizeForHighlight,
  estimateSpeechDurationMs,
  buildWordSchedule,
  wordIndexAtTime,
  wordIndexAtChar,
} from "@/lib/speech-sync";

export type SpeechLanguage = "en" | "hi" | "hinglish";
export type SpeechPhase = "idle" | "preparing" | "speaking";
export type SpeakResult = "completed" | "cancelled" | "failed";

export interface SpeakOptions {
  language: SpeechLanguage;
  /** Fires exactly once, at the moment sound is actually audible
   *  (HTMLAudioElement "playing" event, or utterance.onstart). Never fires for superseded requests. */
  onStart?: () => void;
}

export interface SpeechProgress {
  requestId: number;
  wordIndex: number; // index of the word being spoken now; -1 before the first word
  wordCount: number;
  isComplete: boolean; // true only after natural completion
}

interface CacheItem {
  objectUrl: string;
  mimeType: string;
  durationMs?: number;
}

type PrefetchCacheValue = CacheItem | { unavailable: true };

// Invariant verification counter for active audible playbacks in DEV
let activePlaybacksCount = 0;

function logDev(msg: string) {
  if (import.meta.env.DEV) {
    console.log(msg);
  }
}

function base64ToBlobUrl(base64: string, mimeType: string): string {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const cleanMime = mimeType === "audio/mp3" || !mimeType ? "audio/mpeg" : mimeType;
  const blob = new Blob([bytes], { type: cleanMime });
  return URL.createObjectURL(blob);
}

async function getOrWaitForVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) return voices;

  return new Promise((resolve) => {
    let resolved = false;
    const onVoices = () => {
      if (resolved) return;
      resolved = true;
      window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoices);
    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
      resolve(window.speechSynthesis.getVoices());
    }, 1000);
  });
}

let sharedAudioUnlock: HTMLAudioElement | null = null;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      ctx.resume().catch(() => {});
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }
    // Also unlock HTMLAudioElement for autoplay in Chrome
    if (!sharedAudioUnlock) {
      sharedAudioUnlock = new Audio();
    }
    sharedAudioUnlock.src =
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    sharedAudioUnlock.volume = 0.01;
    sharedAudioUnlock
      .play()
      .then(() => {
        sharedAudioUnlock?.pause();
      })
      .catch(() => {});
  } catch (e) {
    console.warn("[useMiraSpeech] unlockAudio failed:", e);
  }
}

function selectBrowserVoice(
  voices: SpeechSynthesisVoice[],
  language: SpeechLanguage,
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  if (language === "hi" || language === "hinglish") {
    const hiVoice = voices.find((v) => v.lang.toLowerCase().startsWith("hi"));
    if (hiVoice) return hiVoice;
    // For Hinglish or when Hindi voice is missing, Indian English is the best fallback
    const enInVoice = voices.find(
      (v) => v.lang.toLowerCase().includes("en-in") || v.name.toLowerCase().includes("india"),
    );
    if (enInVoice) return enInVoice;
  }

  // Preferred order: en-IN (Ravi / male), en-US (David / Mark / Guy / male), any en-IN, en-GB, en-US
  const enInMale = voices.find(
    (v) =>
      (v.lang.toLowerCase().includes("en-in") || v.name.toLowerCase().includes("india")) &&
      (v.name.toLowerCase().includes("ravi") || v.name.toLowerCase().includes("male")),
  );
  if (enInMale) return enInMale;

  const enUsMale = voices.find(
    (v) =>
      v.lang.toLowerCase().includes("en-us") &&
      (v.name.toLowerCase().includes("david") ||
        v.name.toLowerCase().includes("mark") ||
        v.name.toLowerCase().includes("guy") ||
        v.name.toLowerCase().includes("male")),
  );
  if (enUsMale) return enUsMale;

  const enIn = voices.find(
    (v) => v.lang.toLowerCase().includes("en-in") || v.name.toLowerCase().includes("india"),
  );
  if (enIn) return enIn;

  const enGb = voices.find((v) => v.lang.toLowerCase().includes("en-gb"));
  if (enGb) return enGb;

  const enUs = voices.find(
    (v) =>
      v.lang.toLowerCase().includes("en-us") &&
      (v.name.includes("Natural") || v.name.includes("Online")),
  );
  if (enUs) return enUs;

  const anyUs = voices.find((v) => v.lang.toLowerCase().includes("en-us"));
  if (anyUs) return anyUs;

  const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
  if (anyEn) return anyEn;

  return voices[0] || null;
}

export function useMiraSpeech(): {
  phase: SpeechPhase;
  progress: SpeechProgress;
  speak: (text: string, opts: SpeakOptions) => Promise<SpeakResult>;
  prefetch: (text: string, language: SpeechLanguage) => void;
  cancel: () => void;
  isSpeaking: () => boolean;
} {
  const [phase, setPhase] = useState<SpeechPhase>("idle");
  const [progress, setProgress] = useState<SpeechProgress>({
    requestId: 0,
    wordIndex: -1,
    wordCount: 0,
    isComplete: false,
  });

  const phaseRef = useRef<SpeechPhase>("idle");
  phaseRef.current = phase;

  const requestIdRef = useRef<number>(0);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const activeRafRef = useRef<number | null>(null);
  const activeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentEphemeralUrlRef = useRef<string | null>(null);
  const soundAudibleRef = useRef<boolean>(false);

  // Count consecutive failures before disabling server TTS for the session
  const serverFailuresRef = useRef<number>(0);

  // Prefetch cache and in-flight map
  const prefetchCacheRef = useRef<Map<string, PrefetchCacheValue>>(new Map());
  const inFlightPrefetchRef = useRef<Map<string, Promise<void>>>(new Map());

  // Cached voice per language
  const cachedVoicesRef = useRef<Map<string, SpeechSynthesisVoice>>(new Map());

  // Last reported word index to prevent React state churn
  const lastIndexRef = useRef<number>(-1);

  // Stop all playback, timers, network requests, and animation frames
  const hardStop = useCallback(() => {
    phaseRef.current = "idle";
    soundAudibleRef.current = false;

    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }

    if (activeTimeoutRef.current) {
      clearTimeout(activeTimeoutRef.current);
      activeTimeoutRef.current = null;
    }

    if (activeRafRef.current !== null) {
      cancelAnimationFrame(activeRafRef.current);
      activeRafRef.current = null;
    }

    if (activeAudioRef.current) {
      const audio = activeAudioRef.current;
      audio.onended = null;
      audio.onerror = null;
      audio.onplaying = null;
      audio.onloadedmetadata = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      activeAudioRef.current = null;
    }

    if (currentEphemeralUrlRef.current) {
      try {
        URL.revokeObjectURL(currentEphemeralUrlRef.current);
      } catch {
        // ignore
      }
      currentEphemeralUrlRef.current = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    activeUtteranceRef.current = null;

    if (soundAudibleRef.current) {
      soundAudibleRef.current = false;
      activePlaybacksCount = Math.max(0, activePlaybacksCount - 1);
    }
  }, []);

  const cancel = useCallback(() => {
    const wasActive = phaseRef.current !== "idle" || soundAudibleRef.current;
    phaseRef.current = "idle";
    soundAudibleRef.current = false;
    hardStop();
    if (wasActive) {
      const id = ++requestIdRef.current;
      setPhase("idle");
      setProgress({
        requestId: id,
        wordIndex: -1,
        wordCount: 0,
        isComplete: false,
      });
      logDev(`[TTS#${id}] cancelled`);
    }
  }, [hardStop]);

  const isSpeaking = useCallback(() => {
    return phaseRef.current === "speaking" || soundAudibleRef.current;
  }, []);

  // Prefetch implementation
  const prefetch = useCallback((text: string, language: SpeechLanguage) => {
    if (!text || typeof window === "undefined") return;
    if (serverFailuresRef.current >= 3) return;

    const cacheKey = `${language}:${text.trim()}`;
    if (prefetchCacheRef.current.has(cacheKey) || inFlightPrefetchRef.current.has(cacheKey)) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const promise = (async () => {
      try {
        const resp = await fetch("/api/speech/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.trim(), language }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!resp.ok) {
          prefetchCacheRef.current.set(cacheKey, { unavailable: true });
          return;
        }

        const data = await resp.json();
        if (data.audioBase64 && !data.useBrowserFallback) {
          const mime = data.mimeType || "audio/mpeg";
          const objectUrl = base64ToBlobUrl(data.audioBase64, mime);
          prefetchCacheRef.current.set(cacheKey, {
            objectUrl,
            mimeType: mime,
          });
        } else {
          prefetchCacheRef.current.set(cacheKey, { unavailable: true });
        }
      } catch {
        clearTimeout(timeoutId);
        prefetchCacheRef.current.set(cacheKey, { unavailable: true });
      } finally {
        inFlightPrefetchRef.current.delete(cacheKey);
      }
    })();

    inFlightPrefetchRef.current.set(cacheKey, promise);
  }, []);

  const speak = useCallback(
    async (text: string, opts: SpeakOptions): Promise<SpeakResult> => {
      if (!text || !text.trim()) {
        return "completed";
      }

      const id = ++requestIdRef.current;
      hardStop();

      phaseRef.current = "preparing";
      setPhase("preparing");
      lastIndexRef.current = -1;

      const tokens = tokenizeForHighlight(text);
      setProgress({
        requestId: id,
        wordIndex: -1,
        wordCount: tokens.length,
        isComplete: false,
      });

      logDev(`[TTS#${id}] requested: "${text.slice(0, 30)}..."`);

      return new Promise<SpeakResult>((resolve) => {
        let isResolved = false;
        let soundStarted = false;
        let fallbackStarted = false;

        const safeResolve = (result: SpeakResult) => {
          if (isResolved) return;
          isResolved = true;

          if (soundAudibleRef.current) {
            soundAudibleRef.current = false;
            activePlaybacksCount = Math.max(0, activePlaybacksCount - 1);
          }

          if (id === requestIdRef.current) {
            phaseRef.current = "idle";
            setPhase("idle");
            if (result === "completed") {
              setProgress({
                requestId: id,
                wordIndex: Math.max(0, tokens.length - 1),
                wordCount: tokens.length,
                isComplete: true,
              });
            }
          }

          logDev(`[TTS#${id}] ${result}`);
          resolve(result);
        };

        const triggerOnStartOnce = () => {
          if (id !== requestIdRef.current || soundStarted) return;
          soundStarted = true;
          soundAudibleRef.current = true;
          activePlaybacksCount++;

          if (import.meta.env.DEV && activePlaybacksCount > 1) {
            console.error(`[TTS] more than one active playback (count=${activePlaybacksCount})`);
          }

          phaseRef.current = "speaking";
          setPhase("speaking");
          try {
            opts.onStart?.();
          } catch (e) {
            console.error("[useMiraSpeech] error in onStart callback:", e);
          }
        };

        // Browser Web Speech Engine
        const startBrowserEngine = async () => {
          if (id !== requestIdRef.current) {
            safeResolve("cancelled");
            return;
          }

          logDev(`[TTS#${id}] engine=browser`);

          if (typeof window === "undefined" || !("speechSynthesis" in window)) {
            safeResolve("failed");
            return;
          }

          let voice = cachedVoicesRef.current.get(opts.language) || null;
          if (!voice) {
            const voices = await getOrWaitForVoices();
            if (id !== requestIdRef.current) {
              safeResolve("cancelled");
              return;
            }
            voice = selectBrowserVoice(voices, opts.language);
            if (voice) {
              cachedVoicesRef.current.set(opts.language, voice);
            }
          }

          if (id !== requestIdRef.current) {
            safeResolve("cancelled");
            return;
          }

          try {
            window.speechSynthesis.cancel();
          } catch {
            // ignore
          }

          const utterance = new SpeechSynthesisUtterance(text);
          activeUtteranceRef.current = utterance;

          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
          } else {
            utterance.lang = opts.language === "hi" ? "hi-IN" : "en-US";
          }

          utterance.rate = 1.0;
          utterance.pitch = 1.02;

          let boundaryReceived = false;
          let rAfId: number | null = null;

          utterance.onstart = () => {
            if (id !== requestIdRef.current) return;
            triggerOnStartOnce();

            const estDuration = estimateSpeechDurationMs(text, utterance.rate);
            const schedule = buildWordSchedule(tokens, estDuration);
            const startTime = performance.now();

            const loop = () => {
              if (id !== requestIdRef.current) return;
              if (!boundaryReceived) {
                const elapsed = performance.now() - startTime;
                const idx = wordIndexAtTime(schedule, elapsed);
                if (idx !== lastIndexRef.current) {
                  lastIndexRef.current = idx;
                  setProgress({
                    requestId: id,
                    wordIndex: idx,
                    wordCount: tokens.length,
                    isComplete: false,
                  });
                }
              }
              rAfId = requestAnimationFrame(loop);
              activeRafRef.current = rAfId;
            };

            rAfId = requestAnimationFrame(loop);
            activeRafRef.current = rAfId;
          };

          utterance.onboundary = (e: SpeechSynthesisEvent) => {
            if (id !== requestIdRef.current) return;
            if (e.name === "word" || (e.name === undefined && typeof e.charIndex === "number")) {
              boundaryReceived = true;
              const idx = wordIndexAtChar(tokens, e.charIndex);
              if (idx !== lastIndexRef.current) {
                lastIndexRef.current = idx;
                setProgress({
                  requestId: id,
                  wordIndex: idx,
                  wordCount: tokens.length,
                  isComplete: false,
                });
              }
            }
          };

          utterance.onend = () => {
            if (rAfId !== null) cancelAnimationFrame(rAfId);
            activeUtteranceRef.current = null;
            if (id !== requestIdRef.current) {
              safeResolve("cancelled");
              return;
            }
            safeResolve("completed");
          };

          utterance.onerror = (event) => {
            if (rAfId !== null) cancelAnimationFrame(rAfId);
            activeUtteranceRef.current = null;
            if (id !== requestIdRef.current) {
              safeResolve("cancelled");
              return;
            }
            // If canceled via window.speechSynthesis.cancel(), it's a cancellation
            if (event.error === "canceled" || event.error === "interrupted") {
              safeResolve("cancelled");
            } else {
              safeResolve("failed");
            }
          };

          try {
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.error("[useMiraSpeech] speechSynthesis.speak failed:", e);
            safeResolve("failed");
          }
        };

        const tryFallbackToBrowser = () => {
          if (fallbackStarted || soundStarted) return;
          fallbackStarted = true;
          serverFailuresRef.current++;
          logDev(
            `[TTS#${id}] server failure count=${serverFailuresRef.current}, falling back to browser`,
          );

          // Hard kill server audio before falling back to browser engine
          if (activeAudioRef.current) {
            const a = activeAudioRef.current;
            a.onended = null;
            a.onerror = null;
            a.onplaying = null;
            a.onloadedmetadata = null;
            a.pause();
            a.removeAttribute("src");
            a.load();
            activeAudioRef.current = null;
          }

          if (currentEphemeralUrlRef.current) {
            try {
              URL.revokeObjectURL(currentEphemeralUrlRef.current);
            } catch {
              // ignore
            }
            currentEphemeralUrlRef.current = null;
          }

          startBrowserEngine();
        };

        // If server TTS repeatedly failed 3 times in this session, skip straight to browser engine
        if (serverFailuresRef.current >= 3) {
          startBrowserEngine();
          return;
        }

        // Server Audio Engine
        const startServerEngine = async () => {
          logDev(`[TTS#${id}] engine=server`);
          const cacheKey = `${opts.language}:${text.trim()}`;

          // Check if in-flight prefetch exists
          if (inFlightPrefetchRef.current.has(cacheKey)) {
            try {
              await inFlightPrefetchRef.current.get(cacheKey);
            } catch {
              // ignore
            }
          }

          if (id !== requestIdRef.current) {
            safeResolve("cancelled");
            return;
          }

          let audioSrc = "";
          let isFromCache = false;

          const cached = prefetchCacheRef.current.get(cacheKey);
          if (cached && "objectUrl" in cached) {
            audioSrc = cached.objectUrl;
            isFromCache = true;
          } else if (cached && "unavailable" in cached) {
            tryFallbackToBrowser();
            return;
          } else {
            const controller = new AbortController();
            activeAbortControllerRef.current = controller;

            const timeoutId = setTimeout(() => {
              controller.abort();
            }, 7000);
            activeTimeoutRef.current = timeoutId;

            try {
              const resp = await fetch("/api/speech/synthesize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: text.trim(),
                  language: opts.language,
                }),
                signal: controller.signal,
              });

              clearTimeout(timeoutId);
              activeTimeoutRef.current = null;

              if (id !== requestIdRef.current) {
                safeResolve("cancelled");
                return;
              }

              if (!resp.ok) {
                tryFallbackToBrowser();
                return;
              }

              const data = await resp.json();
              if (id !== requestIdRef.current) {
                safeResolve("cancelled");
                return;
              }

              if (data.audioBase64 && !data.useBrowserFallback) {
                const mime = data.mimeType || "audio/mpeg";
                audioSrc = base64ToBlobUrl(data.audioBase64, mime);
                currentEphemeralUrlRef.current = audioSrc;
              } else {
                tryFallbackToBrowser();
                return;
              }
            } catch {
              if (id !== requestIdRef.current) {
                safeResolve("cancelled");
                return;
              }
              tryFallbackToBrowser();
              return;
            }
          }

          if (id !== requestIdRef.current || !audioSrc) {
            safeResolve("cancelled");
            return;
          }

          const audio = new Audio();
          activeAudioRef.current = audio;
          audio.src = audioSrc;

          let rAfId: number | null = null;
          let schedule: number[] = [];

          audio.onloadedmetadata = () => {
            if (id !== requestIdRef.current) return;
            const durMs =
              Number.isFinite(audio.duration) && audio.duration > 0
                ? audio.duration * 1000
                : estimateSpeechDurationMs(text);
            schedule = buildWordSchedule(tokens, durMs);
          };

          audio.onplaying = () => {
            if (id !== requestIdRef.current) return;
            serverFailuresRef.current = 0;
            triggerOnStartOnce();

            if (schedule.length === 0) {
              const durMs =
                Number.isFinite(audio.duration) && audio.duration > 0
                  ? audio.duration * 1000
                  : estimateSpeechDurationMs(text);
              schedule = buildWordSchedule(tokens, durMs);
            }

            const loop = () => {
              if (id !== requestIdRef.current || audio.paused || audio.ended) return;
              const elapsedMs = audio.currentTime * 1000;
              const idx = wordIndexAtTime(schedule, elapsedMs);
              if (idx !== lastIndexRef.current) {
                lastIndexRef.current = idx;
                setProgress({
                  requestId: id,
                  wordIndex: idx,
                  wordCount: tokens.length,
                  isComplete: false,
                });
              }
              rAfId = requestAnimationFrame(loop);
              activeRafRef.current = rAfId;
            };

            rAfId = requestAnimationFrame(loop);
            activeRafRef.current = rAfId;
          };

          audio.onended = () => {
            if (rAfId !== null) cancelAnimationFrame(rAfId);
            if (!isFromCache && currentEphemeralUrlRef.current) {
              try {
                URL.revokeObjectURL(currentEphemeralUrlRef.current);
              } catch {
                // ignore
              }
              currentEphemeralUrlRef.current = null;
            }
            activeAudioRef.current = null;

            if (id !== requestIdRef.current) {
              safeResolve("cancelled");
              return;
            }
            safeResolve("completed");
          };

          audio.onerror = () => {
            if (rAfId !== null) cancelAnimationFrame(rAfId);
            const a = activeAudioRef.current;
            if (a) {
              a.onended = null;
              a.onerror = null;
              a.onplaying = null;
              a.onloadedmetadata = null;
              a.pause();
              a.removeAttribute("src");
              a.load();
              activeAudioRef.current = null;
            }
            if (id !== requestIdRef.current) {
              safeResolve("cancelled");
              return;
            }
            if (!soundStarted) {
              tryFallbackToBrowser();
            } else {
              safeResolve("failed");
            }
          };

          try {
            await audio.play();
          } catch (playErr) {
            console.warn(`[useMiraSpeech#${id}] audio.play() failed:`, playErr);
            const a = activeAudioRef.current;
            if (a) {
              a.onended = null;
              a.onerror = null;
              a.onplaying = null;
              a.onloadedmetadata = null;
              a.pause();
              a.removeAttribute("src");
              a.load();
              activeAudioRef.current = null;
            }
            if (id !== requestIdRef.current) {
              safeResolve("cancelled");
              return;
            }
            if (!soundStarted) {
              tryFallbackToBrowser();
            } else {
              safeResolve("failed");
            }
          }
        };

        startServerEngine();
      });
    },
    [hardStop],
  );

  // Stop everything on unmount and revoke all cached object URLs
  useEffect(() => {
    const prefetchCache = prefetchCacheRef.current;
    const inFlightPrefetch = inFlightPrefetchRef.current;
    return () => {
      hardStop();
      // Revoke all prefetch cache URLs on unmount
      for (const entry of prefetchCache.values()) {
        if ("objectUrl" in entry && entry.objectUrl) {
          try {
            URL.revokeObjectURL(entry.objectUrl);
          } catch {
            // ignore
          }
        }
      }
      prefetchCache.clear();
      inFlightPrefetch.clear();
    };
  }, [hardStop]);

  return useMemo(
    () => ({
      phase,
      progress,
      speak,
      prefetch,
      cancel,
      isSpeaking,
    }),
    [phase, progress, speak, prefetch, cancel, isSpeaking],
  );
}

export const useBableSpeech = useMiraSpeech;
