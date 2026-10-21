"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

const CX = 100;
const CY = 100;
const R = 78;
const START = -120;
const SWEEP = 240;

const STROKE = {
  rose: "stroke-rose-400",
  amber: "stroke-amber-300",
  emerald: "stroke-emerald-300",
} as const;

function pt(angle: number, r: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: CX + r * Math.sin(rad), y: CY - r * Math.cos(rad) };
}

function arc(from: number, to: number, r: number): string {
  const a = pt(from, r);
  const b = pt(to, r);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

function tone(v: number): keyof typeof STROKE {
  if (v < 40) return "rose";
  if (v < 70) return "amber";
  return "emerald";
}

export default function Gauge({
  value,
  label,
  sub,
  size = "md",
}: {
  value: number;
  label: string;
  sub?: string;
  size?: "md" | "lg";
}) {
  const reduce = useReducedMotion();
  const v = Math.min(100, Math.max(0, Math.round(value)));
  const [shown, setShown] = useState(reduce ? v : 0);

  useEffect(() => {
    const t = setTimeout(() => setShown(v), 60);
    return () => clearTimeout(t);
  }, [v]);

  const angle = START + (SWEEP * shown) / 100;
  const ease = reduce ? "none" : "1.1s cubic-bezier(0.2, 0.8, 0.2, 1)";
  const ticks = Array.from({ length: 11 }, (_, i) => i);

  return (
    <figure className="flex flex-col items-center">
      <svg
        viewBox="0 0 200 150"
        role="img"
        aria-label={`${label}: ${v} percent`}
        className={size === "lg" ? "w-72" : "w-44"}
      >
        <path
          d={arc(START, START + SWEEP, R)}
          fill="none"
          strokeWidth={10}
          strokeLinecap="round"
          className="stroke-white/10"
        />
        <path
          d={arc(START, START + SWEEP, R)}
          fill="none"
          strokeWidth={10}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${shown} 100`}
          className={STROKE[tone(v)]}
          style={{ transition: reduce ? "none" : "stroke-dasharray 1.1s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
        />
        {ticks.map((i) => {
          const a = START + i * 24;
          const major = i % 5 === 0;
          const p1 = pt(a, major ? R - 18 : R - 13);
          const p2 = pt(a, R - 7);
          return (
            <line
              key={i}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              strokeWidth={major ? 2 : 1}
              className="stroke-white/40"
            />
          );
        })}
        {[0, 5, 10].map((i) => {
          const p = pt(START + i * 24, R - 28);
          return (
            <text
              key={i}
              x={p.x}
              y={p.y + 3}
              textAnchor="middle"
              fontSize="9"
              className="fill-white/50"
            >
              {i * 10}
            </text>
          );
        })}
        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: reduce ? "none" : `transform ${ease}`,
          }}
        >
          <line x1={CX} y1={CY} x2={CX} y2={CY - (R - 20)} strokeWidth={3} strokeLinecap="round" className="stroke-white" />
        </g>
        <circle cx={CX} cy={CY} r={6} className="fill-white" />
        <text x={CX} y={140} textAnchor="middle" fontSize="26" fontWeight="700" className="fill-white">
          {v}
        </text>
      </svg>
      <figcaption className="mt-1 text-center">
        <span className="block font-semibold">{label}</span>
        {sub && <span className="block font-mono text-xs uppercase tracking-widest text-white/50">{sub}</span>}
      </figcaption>
    </figure>
  );
}