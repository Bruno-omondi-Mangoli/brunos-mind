"use client";

import { useVisuals } from "@/components/VisualsProvider";

export default function PowerToggle() {
  const { lowPower, setLowPower } = useVisuals();
  return (
    <button
      type="button"
      aria-pressed={lowPower}
      onClick={() => setLowPower(!lowPower)}
      title="Turns off the animated background to save battery and data"
      className={
        "rounded border px-3 py-1 text-xs " +
        (lowPower
          ? "border-amber-300 bg-amber-300 text-black"
          : "border-white/30 text-white/75 hover:bg-white/10")
      }
    >
      Low power: {lowPower ? "on" : "off"}
    </button>
  );
}