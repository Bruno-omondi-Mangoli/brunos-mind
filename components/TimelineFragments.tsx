"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { PlanDay } from "@/lib/planner";

const SHAPES = [
  "polygon(0 6%, 96% 0, 100% 92%, 4% 100%)",
  "polygon(4% 0, 100% 5%, 95% 100%, 0 94%)",
  "polygon(0 0, 100% 8%, 97% 100%, 3% 93%)",
];

const TAG: Record<string, string> = {
  learn: "Learn",
  quiz: "Quiz",
  revisit: "Revisit",
  flashcards: "Cards",
  review: "Review",
  exam: "Exam",
};

const KIND_BG: Record<PlanDay["kind"], string> = {
  study: "bg-white/10",
  rest: "bg-white/5 text-white/50",
  final: "bg-amber-300/15",
  exam: "bg-emerald-300/20",
};

export default function TimelineFragments({ days }: { days: PlanDay[] }) {
  const reduce = useReducedMotion();

  return (
    <ol className="relative mt-8 flex flex-col gap-6 border-l border-white/15 pl-6">
      {days.map((d, i) => (
        <motion.li
          key={d.date}
          initial={reduce ? false : { opacity: 0, x: i % 2 ? 24 : -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: Math.min(i, 12) * 0.05, duration: 0.4 }}
          className="relative"
        >
          <span aria-hidden="true" className="absolute -left-[31px] top-5 h-3 w-3 rounded-full bg-cyan-300" />
          <motion.div
            animate={reduce ? undefined : { y: [0, -3, 0] }}
            transition={{ duration: 5 + (i % 3), repeat: Infinity, ease: "easeInOut" }}
            style={{ clipPath: SHAPES[i % 3], marginLeft: (i % 2) * 16 }}
            className={"px-6 py-5 " + KIND_BG[d.kind]}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">{d.label}</h3>
              <span className="font-mono text-xs uppercase tracking-widest text-white/50">
                {d.kind === "rest"
                  ? "Rest day"
                  : d.kind === "exam"
                  ? "Exam day"
                  : `${d.minutes} min${d.kind === "final" ? " | Final review" : ""}`}
              </span>
            </div>
            {d.kind === "rest" ? (
              <p className="mt-2 text-sm text-white/50">No study. Rest helps memory.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {d.tasks.map((t, k) => (
                  <li key={k} className="flex items-start justify-between gap-3">
                    <span>
                      <span className="mr-2 font-mono text-xs uppercase tracking-widest text-cyan-300">
                        {TAG[t.type]}
                      </span>
                      {t.href ? (
                        <Link href={t.href} className="hover:underline">
                          {t.title}
                        </Link>
                      ) : (
                        t.title
                      )}
                    </span>
                    {t.minutes > 0 && <span className="shrink-0 text-white/50">{t.minutes} min</span>}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </motion.li>
      ))}
    </ol>
  );
}