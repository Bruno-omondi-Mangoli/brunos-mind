"use client";

import { motion, useReducedMotion } from "framer-motion";

const TORN =
  "polygon(0 4%, 6% 0, 14% 3%, 22% 0, 31% 4%, 40% 1%, 50% 4%, 60% 0, 70% 3%, 80% 0, 90% 4%, 100% 1%, 100% 100%, 0 100%)";
const TONES = ["bg-amber-100", "bg-stone-200", "bg-zinc-100"];
const TILTS = [-1.2, 0.8, -0.5];

export default function TornPaperStory({
  label,
  text,
  index,
}: {
  label: string;
  text: string;
  index: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, rotateX: -80, y: -16 }}
      animate={{ opacity: 1, rotateX: 0, y: 0, rotate: TILTS[index % 3] }}
      transition={{ duration: 0.6, delay: reduce ? 0 : index * 0.35 }}
      style={{
        transformOrigin: "top center",
        clipPath: TORN,
        marginTop: index === 0 ? 0 : -14,
      }}
      className={TONES[index % 3] + " relative px-6 pb-8 pt-10 text-neutral-900 shadow-lg"}
    >
      <p className="font-mono text-xs uppercase tracking-widest text-neutral-600">{label}</p>
      <p className="mt-2 text-lg leading-relaxed">{text}</p>
    </motion.article>
  );
}