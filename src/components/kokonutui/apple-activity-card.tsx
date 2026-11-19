"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { scoreTone } from "@/lib/score-tone";

export interface ActivityData {
  label: string;
  color: string;
  colorEnd: string;
  size: number;
  /** Can go past `target`: the ring keeps going for another lap. */
  current: number;
  target: number;
  unit?: string;
  description?: string;
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const STROKE = 14;
const STAGGER = 0.18;
const DRAW_S = 1.2;
const OVER_S = 0.6;
const MAX_LAPS = 3;

/** Progress in laps (1 = goal), capped so a huge value stays legible. */
const ratioOf = (data: ActivityData) =>
  data.target > 0 ? Math.min(Math.max(data.current / data.target, 0), MAX_LAPS) : 0;

/** Duration of one ring's draw; its count-up runs on the same clock. */
const drawSeconds = (ratio: number) => DRAW_S + OVER_S * Math.min(Math.max(ratio - 1, 0), 1);

interface RingNodes {
  base: SVGCircleElement | null;
  lap: SVGCircleElement | null;
  cap: SVGGElement | null;
  pulse: SVGCircleElement | null;
  count: HTMLSpanElement | null;
}

function paintRing(
  nodes: RingNodes,
  data: Pick<ActivityData, "size" | "current" | "target">,
  p: number,
) {
  const r = (data.size - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const first = Math.min(p, 1);
  const over = Math.max(p - 1, 0);

  if (nodes.base) {
    nodes.base.style.strokeDashoffset = `${c * (1 - first)}`;
  }
  if (nodes.lap) {
    nodes.lap.style.strokeDashoffset = `${c * (1 - over)}`;
  }
  if (nodes.cap) {
    if (p > 1.01) {
      const a = (over * 360 - 90) * (Math.PI / 180);
      const cx = data.size / 2 + r * Math.cos(a);
      const cy = data.size / 2 + r * Math.sin(a);
      nodes.cap.style.opacity = "1";
      nodes.cap.setAttribute("transform", `translate(${cx}, ${cy})`);
    } else {
      nodes.cap.style.opacity = "0";
    }
  }
  if (nodes.count) {
    const target = data.target || 100;
    // p represents progress in units of target (ratio = current / target).
    // Multiplying p * target gives the real count up to data.current!
    const val = Math.min(data.current, Math.max(0, Math.round(p * target)));
    nodes.count.textContent = `${val}`;
  }
}

export interface AppleActivityCardProps {
  title?: string;
  titleAs?: "h2" | "h3" | "h4";
  overallScore?: number;
  activities: ActivityData[];
  className?: string;
}

export function AppleActivityCard({
  title,
  titleAs = "h3",
  overallScore,
  activities,
  className,
}: AppleActivityCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });
  const shouldReduceMotion = useReducedMotion();
  const id = useId();

  const ringRefs = useRef<RingNodes[]>([]);

  // Find max diameter to bound the SVG canvas
  const maxSize = Math.max(...activities.map((a) => a.size), 220);

  // Stable key so animation only re-runs when activity values change, not on every render
  const activitiesKey = activities.map((a) => `${a.label}:${a.current}:${a.target}`).join("|");

  useEffect(() => {
    if (!isInView) return;
    const animControls: Array<{ stop: () => void }> = [];

    activities.forEach((activity, idx) => {
      const ratio = ratioOf(activity);
      const nodes = ringRefs.current[idx];
      if (!nodes) return;

      if (shouldReduceMotion) {
        paintRing(nodes, activity, ratio);
        return;
      }

      // Initial state
      paintRing(nodes, activity, 0);

      const delay = idx * STAGGER;
      const duration = drawSeconds(ratio);

      const controls = animate(0, ratio, {
        duration,
        delay,
        ease: EASE_OUT,
        onUpdate: (latest) => {
          paintRing(nodes, activity, latest);
        },
      });

      animControls.push(controls);
    });

    return () => {
      animControls.forEach((c) => c.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView, activitiesKey, shouldReduceMotion]);

  const TitleTag = titleAs;

  return (
    <div
      ref={containerRef}
      className={cn(
        "rounded-[24px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-8",
        className,
      )}
    >
      {/* Left: Concentric Activity Rings & Center Score */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={maxSize}
          height={maxSize}
          viewBox={`0 0 ${maxSize} ${maxSize}`}
          className="transform -rotate-90"
        >
          <defs>
            {activities.map((act, idx) => (
              <linearGradient
                key={`grad-${idx}`}
                id={`${id}-grad-${idx}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={act.color} />
                <stop offset="100%" stopColor={act.colorEnd} />
              </linearGradient>
            ))}
          </defs>

          {activities.map((act, idx) => {
            const r = (act.size - STROKE) / 2;
            const c = 2 * Math.PI * r;
            const cx = maxSize / 2;
            const cy = maxSize / 2;

            if (!ringRefs.current[idx]) {
              ringRefs.current[idx] = {
                base: null,
                lap: null,
                cap: null,
                pulse: null,
                count: null,
              };
            }

            return (
              <g key={`ring-${idx}`}>
                {/* Background track (monochrome faint hairline wash) */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth={STROKE}
                />

                {/* Primary Draw Arc */}
                <circle
                  ref={(el) => {
                    if (ringRefs.current[idx]) ringRefs.current[idx].base = el;
                  }}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={`url(#${id}-grad-${idx})`}
                  strokeWidth={STROKE}
                  strokeDasharray={c}
                  strokeDashoffset={c}
                  strokeLinecap="round"
                />

                {/* Overlap Lap Arc */}
                <circle
                  ref={(el) => {
                    if (ringRefs.current[idx]) ringRefs.current[idx].lap = el;
                  }}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={`url(#${id}-grad-${idx})`}
                  strokeWidth={STROKE}
                  strokeDasharray={c}
                  strokeDashoffset={c}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>

        {/* Center Overall Score Display */}
        {overallScore !== undefined && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
            <span
              className="text-[32px] sm:text-[36px] font-[700] tracking-tight tabular leading-none"
              style={{ color: scoreTone(overallScore).solid }}
            >
              {overallScore}
            </span>
            <span className="text-[11px] font-[500] text-[#707070] mt-1 tabular">/ 100</span>
          </div>
        )}
      </div>

      {/* Right: Legend & Metric Breakdown (3-row layout, monochrome ladder) */}
      <div className="flex-1 w-full space-y-4">
        {title && (
          <TitleTag className="text-[20px] sm:text-[22px] font-[650] text-[#f5f5f5] tracking-tight">
            {title}
          </TitleTag>
        )}

        <div className="space-y-3.5 divide-y divide-[rgba(255,255,255,0.06)]">
          {activities.map((act, idx) => (
            <div
              key={act.label}
              className={cn("flex items-center justify-between gap-4", idx > 0 && "pt-3.5")}
            >
              <div className="flex items-center gap-3">
                {/* Ring indicator swatch matching ring color */}
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: act.color }}
                />
                <div>
                  <span className="text-[14px] font-[600] text-[#f5f5f5] block">{act.label}</span>
                  {act.description && (
                    <span className="text-[12px] text-[#8a8a8a] block leading-tight">
                      {act.description}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  ref={(el) => {
                    if (ringRefs.current[idx]) ringRefs.current[idx].count = el;
                  }}
                  className="text-[16px] font-[650] tabular"
                  style={{ color: act.color }}
                >
                  {act.current}
                </span>
                <span className="text-[12px] text-[#707070] font-[450] ml-1">
                  / {act.target}
                  {act.unit ? ` ${act.unit}` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Tiny Score Tier Legend */}
        <div className="flex items-center gap-4 text-[11px] font-[450] text-[#707070] pt-2 border-t border-[rgba(255,255,255,0.06)] flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#4ade80" }} />
            <span>Strong ≥ 75</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#facc15" }} />
            <span>Moderate 50–74</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#f87171" }} />
            <span>Developing &lt; 50</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default AppleActivityCard;
