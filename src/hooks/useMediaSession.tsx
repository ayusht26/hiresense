import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export type MediaPermissionState = "idle" | "checking" | "prompt" | "granted" | "denied" | "error";

export type MediaErrorType =
  | "NotAllowedError"
  | "NotFoundError"
  | "NotReadableError"
  | "OverconstrainedError"
  | "SecurityError"
  | "UnknownError";

export interface ProctoringEvent {
  id: string;
  type: "TECHNICAL" | "OBSERVABLE";
  timestamp: string;
  description: string;
}

export interface MediaSessionContextValue {
  stream: MediaStream | null;
  isAcquired: boolean;
  permissionState: MediaPermissionState;
  permissionStatus: MediaPermissionState;
  error: { type: MediaErrorType; message: string } | null;
  isAcquiring: boolean;
  hasCamera: boolean;
  hasMic: boolean;
  isCameraActive: boolean;
  isMicMuted: boolean;
  isCameraDisconnected: boolean;
  audioLevel: number; // 0..1, smoothed
  proctoringEvents: ProctoringEvent[];
  acquire: () => Promise<MediaStream | null>;
  release: () => void;
  toggleCamera: () => void;
  toggleMic: () => void;
  resumeAudioContext: () => Promise<void>;
  addProctoringEvent: (type: "TECHNICAL" | "OBSERVABLE", description: string) => void;
}

const MediaSessionContext = createContext<MediaSessionContextValue | null>(null);

export function MediaSessionProvider({ children }: { children: ReactNode }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionState, setPermissionState] = useState<MediaPermissionState>("idle");
  const [error, setError] = useState<{ type: MediaErrorType; message: string } | null>(null);
  const [isAcquiring, setIsAcquiring] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraDisconnected, setIsCameraDisconnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [proctoringEvents, setProctoringEvents] = useState<ProctoringEvent[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const acquiringPromiseRef = useRef<Promise<MediaStream | null>>(null);
  const hasRequestedStreamRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const smoothedLevelRef = useRef(0);

  const addProctoringEvent = useCallback(
    (type: "TECHNICAL" | "OBSERVABLE", description: string) => {
      const event: ProctoringEvent = {
        id: `pe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        timestamp: new Date().toISOString(),
        description,
      };
      setProctoringEvents((prev) => [...prev, event]);
    },
    [],
  );

  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    smoothedLevelRef.current = 0;
    setAudioLevel(0);
  }, []);

  const resumeAudioContext = useCallback(async () => {
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      try {
        await audioContextRef.current.resume();
      } catch (err) {
        console.warn("Could not resume AudioContext:", err);
      }
    }
  }, []);

  const setupAudioAnalyser = useCallback((mediaStream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(mediaStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        if (!analyserRef.current || !streamRef.current?.active) {
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(1, average / 128);

        // Smooth with fast attack, gradual release
        const attack = 0.3;
        const release = 0.1;
        const current = smoothedLevelRef.current;
        if (normalized > current) {
          smoothedLevelRef.current = current + (normalized - current) * attack;
        } else {
          smoothedLevelRef.current = current + (normalized - current) * release;
        }

        setAudioLevel(smoothedLevelRef.current);
        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.warn("Web Audio Analyser setup fallback:", err);
    }
  }, []);

  const release = useCallback(() => {
    cleanupAudio();
    hasRequestedStreamRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }

    setStream(null);
    setHasCamera(false);
    setHasMic(false);
    setIsAcquiring(false);
    acquiringPromiseRef.current = null;
  }, [cleanupAudio]);

  const acquire = useCallback(async (): Promise<MediaStream | null> => {
    hasRequestedStreamRef.current = true;
    // If stream is already active and healthy, return it directly without prompting
    if (streamRef.current && streamRef.current.active) {
      const vTracks = streamRef.current.getVideoTracks();
      const aTracks = streamRef.current.getAudioTracks();
      if (vTracks.length > 0 && aTracks.length > 0) {
        return streamRef.current;
      }
    }

    // If an acquisition is already in flight (e.g. StrictMode double-invoke), join the promise
    if (acquiringPromiseRef.current) {
      return acquiringPromiseRef.current;
    }

    const task = (async () => {
      setIsAcquiring(true);
      setError(null);

      // Check if mediaDevices API is available
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setError({
          type: "NotFoundError",
          message: "Media devices API is not supported in this browser environment.",
        });
        setPermissionState("error");
        setIsAcquiring(false);
        return null;
      }

      // Check permission queries if supported
      let isBothDenied = false;
      try {
        if ("permissions" in navigator && navigator.permissions.query) {
          const camQuery = await navigator.permissions
            .query({ name: "camera" as PermissionName })
            .catch(() => null);
          const micQuery = await navigator.permissions
            .query({ name: "microphone" as PermissionName })
            .catch(() => null);

          if (camQuery?.state === "denied" && micQuery?.state === "denied") {
            isBothDenied = true;
          }
        }
      } catch {
        // Ignore permission query failure on unsupported browsers
      }

      if (isBothDenied) {
        setPermissionState("denied");
        setError({
          type: "NotAllowedError",
          message:
            "Camera and microphone permissions are blocked in your browser settings. Please enable permissions in your browser address bar and click 'Try again'.",
        });
        setIsAcquiring(false);
        return null;
      }

      setPermissionState("prompt");

      let acquired: MediaStream | null = null;
      let acquiredAudioOnly = false;

      try {
        // Tier 1: Optimal video + audio constraints
        try {
          acquired = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch (tier1Err) {
          console.warn(
            "Optimal getUserMedia constraints failed, trying relaxed constraints:",
            tier1Err,
          );
          // Tier 2: Relaxed video + audio
          try {
            acquired = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
          } catch (tier2Err) {
            console.warn("Relaxed video+audio failed, falling back to audio-only:", tier2Err);
            // Tier 3 (Rule 3.4): Audio-only fallback if camera is unavailable or denied
            try {
              acquired = await navigator.mediaDevices.getUserMedia({
                audio: true,
              });
              acquiredAudioOnly = true;
            } catch (tier3Err) {
              console.warn("All media acquisition tiers failed:", tier3Err);
              throw tier3Err;
            }
          }
        }

        streamRef.current = acquired;
        setStream(acquired);
        setPermissionState("granted");
        const hasV = acquired.getVideoTracks().length > 0 && !acquiredAudioOnly;
        const hasA = acquired.getAudioTracks().length > 0;
        setHasCamera(hasV);
        setHasMic(hasA);
        setIsCameraActive(hasV);
        setIsMicMuted(false);
        setIsCameraDisconnected(false);

        // Attach track onended listener for unexpected disconnects
        acquired.getVideoTracks().forEach((vt) => {
          vt.onended = () => {
            setIsCameraDisconnected(true);
            addProctoringEvent("TECHNICAL", "Webcam hardware stream ended unexpectedly.");
          };
        });

        // Setup audio analysis if microphone track is present
        if (hasA) {
          setupAudioAnalyser(acquired);
        }

        return acquired;
      } catch (err: unknown) {
        console.warn("getUserMedia error:", err);
        const domErr = err as { name?: string; message?: string };
        const errType: MediaErrorType =
          domErr.name === "NotAllowedError"
            ? "NotAllowedError"
            : domErr.name === "NotFoundError"
              ? "NotFoundError"
              : domErr.name === "NotReadableError"
                ? "NotReadableError"
                : domErr.name === "OverconstrainedError"
                  ? "OverconstrainedError"
                  : domErr.name === "SecurityError"
                    ? "SecurityError"
                    : "UnknownError";

        let friendlyMessage = "Could not initialize your camera or microphone.";
        if (errType === "NotAllowedError") {
          friendlyMessage =
            "Camera or microphone access was blocked. To continue, click the permissions icon in your browser's address bar, enable camera & microphone, and tap 'Try again'.";
          setPermissionState("denied");
        } else if (errType === "NotFoundError") {
          friendlyMessage =
            "No webcam or microphone hardware detected on this device. You may still complete the interview using text.";
          setPermissionState("error");
        } else if (errType === "NotReadableError") {
          friendlyMessage =
            "Your camera or microphone is in use by another application. Please close other video tools and try again.";
          setPermissionState("error");
        } else {
          setPermissionState("error");
        }

        setError({ type: errType, message: friendlyMessage });
        addProctoringEvent("TECHNICAL", `Permission / hardware error: ${errType}`);
        return null;
      } finally {
        setIsAcquiring(false);
        acquiringPromiseRef.current = null;
      }
    })();

    acquiringPromiseRef.current = task;
    return task;
  }, [addProctoringEvent, setupAudioAnalyser]);

  const toggleCamera = useCallback(() => {
    if (!streamRef.current) return;
    const vTracks = streamRef.current.getVideoTracks();
    const nextState = !isCameraActive;
    vTracks.forEach((t) => {
      t.enabled = nextState;
    });
    setIsCameraActive(nextState);
    if (!nextState) {
      addProctoringEvent("TECHNICAL", "Candidate disabled webcam feed.");
    }
  }, [isCameraActive, addProctoringEvent]);

  const toggleMic = useCallback(() => {
    if (!streamRef.current) return;
    const aTracks = streamRef.current.getAudioTracks();
    const nextMuted = !isMicMuted;
    aTracks.forEach((t) => {
      t.enabled = !nextMuted;
    });
    setIsMicMuted(nextMuted);
  }, [isMicMuted]);

  // Clean up on provider unmount (when leaving the apply flow entirely)
  useEffect(() => {
    return () => {
      release();
    };
  }, [release]);

  // Listen for permission state changes (e.g. user toggling permissions in URL bar) and window focus
  useEffect(() => {
    let camStatus: PermissionStatus | null = null;
    let micStatus: PermissionStatus | null = null;

    const handlePermissionChange = () => {
      if (
        hasRequestedStreamRef.current &&
        (camStatus?.state === "granted" || micStatus?.state === "granted")
      ) {
        acquire().catch(() => {});
      }
    };

    if (
      typeof navigator !== "undefined" &&
      "permissions" in navigator &&
      navigator.permissions.query
    ) {
      navigator.permissions
        .query({ name: "camera" as PermissionName })
        .then((status) => {
          camStatus = status;
          status.onchange = handlePermissionChange;
        })
        .catch(() => {});

      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((status) => {
          micStatus = status;
          status.onchange = handlePermissionChange;
        })
        .catch(() => {});
    }

    const handleWindowFocus = () => {
      // Re-check and auto-acquire ONLY if user has already initiated media acquisition in interview
      if (
        hasRequestedStreamRef.current &&
        (!streamRef.current || !streamRef.current.active)
      ) {
        acquire().catch(() => {});
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleWindowFocus();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (camStatus) camStatus.onchange = null;
      if (micStatus) micStatus.onchange = null;
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [acquire]);

  // Handle hardware devicechange events
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.addEventListener) return;
    const handleDeviceChange = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVid = devices.some((d) => d.kind === "videoinput");
        const hasAud = devices.some((d) => d.kind === "audioinput");
        setHasCamera(hasVid);
        setHasMic(hasAud);
      } catch (e) {
        console.warn("devicechange inspect error:", e);
      }
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, []);

  const value = useMemo<MediaSessionContextValue>(
    () => ({
      stream,
      isAcquired: Boolean(stream && stream.active),
      permissionState,
      permissionStatus: permissionState,
      error,
      isAcquiring,
      hasCamera,
      hasMic,
      isCameraActive,
      isMicMuted,
      isCameraDisconnected,
      audioLevel,
      proctoringEvents,
      acquire,
      release,
      toggleCamera,
      toggleMic,
      resumeAudioContext,
      addProctoringEvent,
    }),
    [
      stream,
      permissionState,
      error,
      isAcquiring,
      hasCamera,
      hasMic,
      isCameraActive,
      isMicMuted,
      isCameraDisconnected,
      audioLevel,
      proctoringEvents,
      acquire,
      release,
      toggleCamera,
      toggleMic,
      resumeAudioContext,
      addProctoringEvent,
    ],
  );

  return <MediaSessionContext.Provider value={value}>{children}</MediaSessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMediaSession(): MediaSessionContextValue {
  const ctx = useContext(MediaSessionContext);
  if (!ctx) {
    throw new Error("useMediaSession must be used within a MediaSessionProvider");
  }
  return ctx;
}
