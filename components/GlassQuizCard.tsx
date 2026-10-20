"use client";

import { motion, useReducedMotion, type TargetAndTransition } from "framer-motion";

export type QuizOption = { id: string; text: string; correct: boolean; explanation: string };

type Props = {
  stem: string;
  options: QuizOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const CRACKS = [
  "M62 30 L48 42 L52 55 L38 70 L40 100",
  "M62 30 L75 38 L72 52 L88 64 L84 100",
  "M62 30 L58 12 L66 0",
  "M48 42 L30 38 L12 46",
  "M72 52 L96 50",
];

export default function GlassQuizCard({ stem, options, selectedId, onSelect }: Props) {
  const reduce = useReducedMotion();
  const revealed = selectedId !== null;
  const chosen = options.find((o) => o.id === selectedId);
  const state: "idle" | "right" | "wrong" = !revealed ? "idle" : chosen?.correct ? "right" : "wrong";

  const animate: TargetAndTransition =
    state === "wrong"
      ? { x: reduce ? 0 : [0, -8, 8, -6, 6, 0], boxShadow: "0 0 0px rgba(0,0,0,0)" }
      : state === "right"
      ? { x: 0, boxShadow: "0 0 48px rgba(34,211,238,0.5)" }
      : { x: 0, boxShadow: "0 0 0px rgba(0,0,0,0)" };

  const borderClass =
    state === "wrong"
      ? "border-rose-400/60"
      : state === "right"
      ? "border-cyan-300/70"
      : "border-white/20";

  function optionClass(o: QuizOption): string {
    const base =
      "relative w-full rounded border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ";
    if (!revealed) return base + "border-white/20 bg-white/5 hover:bg-white/10";
    if (o.correct) return base + "border-emerald-300 bg-emerald-300/15";
    if (o.id === selectedId) return base + "border-rose-400 bg-rose-400/15";
    return base + "border-white/10 bg-white/5 opacity-60";
  }

  return (
    <motion.section
      initial={false}
      animate={animate}
      transition={{ duration: 0.4 }}
      className={
        "relative overflow-hidden rounded-lg border bg-white/5 p-6 backdrop-blur-xl " + borderClass
      }
    >
      <h2 className="text-xl font-semibold leading-snug">{stem}</h2>

      <div role="group" aria-label="Answer options" className="mt-5 flex flex-col gap-3">
        {options.map((o, i) => (
          <button
            key={o.id}
            type="button"
            disabled={revealed}
            onClick={() => onSelect(o.id)}
            className={optionClass(o)}
          >
            <span className="flex items-start gap-3">
              <span className="font-mono text-sm text-white/50">{i + 1}</span>
              <span className="flex-1">
                {o.text}
                {revealed && o.correct && (
                  <span className="ml-2 font-mono text-xs uppercase text-emerald-300">
                    Correct answer
                  </span>
                )}
                {revealed && !o.correct && o.id === selectedId && (
                  <span className="ml-2 font-mono text-xs uppercase text-rose-300">
                    Your answer
                  </span>
                )}
              </span>
            </span>
            {revealed && (o.correct || o.id === selectedId) && (
              <span className="mt-2 block pl-6 text-sm text-white/70">{o.explanation}</span>
            )}
          </button>
        ))}
      </div>

      {state === "wrong" && (
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          {CRACKS.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              fill="none"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: reduce ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
            />
          ))}
        </svg>
      )}

      {state === "right" && !reduce && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      )}
    </motion.section>
  );
}