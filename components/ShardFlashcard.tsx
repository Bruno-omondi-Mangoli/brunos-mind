"use client";

import type { ReactNode, Ref } from "react";
import { motion, useReducedMotion } from "framer-motion";

const JAGGED = "polygon(0 3%, 7% 0, 100% 0, 100% 94%, 93% 100%, 0 100%)";
const SHARD_A = "polygon(8% 0, 100% 6%, 92% 100%, 0 92%)";
const SHARD_B = "polygon(0 8%, 94% 0, 100% 90%, 6% 100%)";

type Props = {
  flipped: boolean;
  onFlip: () => void;
  front: ReactNode;
  back: ReactNode;
  buttonRef?: Ref<HTMLButtonElement>;
};

export default function ShardFlashcard({ flipped, onFlip, front, back, buttonRef }: Props) {
  const reduce = useReducedMotion();
  const face = "col-start-1 row-start-1 bg-zinc-900/90 px-8 py-10";

  return (
    <div className="relative mx-auto w-full max-w-xl" style={{ perspective: 1400 }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -rotate-2 translate-x-3 translate-y-3 bg-cyan-300/20"
        style={{ clipPath: SHARD_A }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-3 translate-y-2 rotate-1 bg-fuchsia-300/15"
        style={{ clipPath: SHARD_B }}
      />
      <button
        ref={buttonRef}
        type="button"
        onClick={onFlip}
        aria-label={flipped ? "Show the front of the card" : "Show the answer"}
        className="relative block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        <motion.div
          initial={false}
          animate={{ rotateY: flipped && !reduce ? 180 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
          className="grid min-h-[22rem]"
        >
          <div
            aria-hidden={flipped}
            className={face}
            style={{
              clipPath: JAGGED,
              backfaceVisibility: "hidden",
              opacity: reduce && flipped ? 0 : 1,
            }}
          >
            {front}
          </div>
          <div
            aria-hidden={!flipped}
            className={face}
            style={{
              clipPath: JAGGED,
              backfaceVisibility: "hidden",
              transform: reduce ? "none" : "rotateY(180deg)",
              opacity: reduce && !flipped ? 0 : 1,
            }}
          >
            {back}
          </div>
        </motion.div>
      </button>
    </div>
  );
}