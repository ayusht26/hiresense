import { useEffect, useRef } from "react";

export type WaveformState = "idle" | "speaking" | "listening" | "thinking";

interface MiraWaveformProps {
  state: WaveformState;
  audioLevel?: number; // 0 to 100
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MiraWaveform({
  state,
  audioLevel = 0,
  size = "md",
  className = "",
}: MiraWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Number of bars
      const barCount = size === "sm" ? 24 : size === "lg" ? 48 : 36;
      const spacing = width / barCount;
      const barWidth = Math.max(2, spacing * 0.45);

      phase += state === "speaking" ? 0.08 : state === "listening" ? 0.12 : 0.03;

      for (let i = 0; i < barCount; i++) {
        const x = i * spacing + spacing / 2;
        const normalizedIndex = (i - barCount / 2) / (barCount / 2);
        // Envelope curve (higher in center, lower at edges)
        const envelope = Math.cos(normalizedIndex * Math.PI * 0.5);

        let amplitude = 6;

        if (state === "speaking") {
          // Dynamic harmonic motion
          const wave1 = Math.sin(phase + i * 0.35);
          const wave2 = Math.cos(phase * 0.8 + i * 0.2);
          amplitude = Math.max(6, Math.abs(wave1 * 24 + wave2 * 12) * envelope + 8);
        } else if (state === "listening") {
          // Reactive to mic audioLevel
          const dynamicBoost = (audioLevel / 100) * 36;
          const noise = Math.sin(phase * 2 + i * 0.6) * 8;
          amplitude = Math.max(5, (dynamicBoost + Math.abs(noise)) * envelope + 6);
        } else if (state === "thinking") {
          // Smooth pulsing ripple
          const ripple = Math.sin(phase * 1.5 - i * 0.3);
          amplitude = Math.max(4, Math.abs(ripple) * 16 * envelope + 6);
        } else {
          // Idle breathing
          amplitude = Math.max(4, (Math.sin(phase + i * 0.2) * 5 + 6) * envelope);
        }

        const barHeight = Math.min(height * 0.85, amplitude);
        const yTop = centerY - barHeight / 2;

        // Color based on state & position (strictly dark monochrome gallery palette)
        ctx.fillStyle =
          state === "speaking"
            ? `rgba(245, 245, 245, ${0.4 + 0.6 * envelope})`
            : state === "listening"
            ? `rgba(96, 165, 250, ${0.45 + 0.55 * envelope})` // soft blue tint for active listening
            : state === "thinking"
            ? `rgba(212, 212, 212, ${0.35 + 0.5 * envelope})`
            : `rgba(138, 138, 138, ${0.25 + 0.35 * envelope})`;

        ctx.beginPath();
        ctx.roundRect(x - barWidth / 2, yTop, barWidth, barHeight, barWidth / 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, audioLevel, size]);

  const dims =
    size === "sm"
      ? { width: 140, height: 40 }
      : size === "lg"
      ? { width: 340, height: 80 }
      : { width: 240, height: 56 };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={dims.width}
        height={dims.height}
        className="w-full h-full block"
      />
    </div>
  );
}
