"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useVisuals } from "@/components/VisualsProvider";
import { HINTS, WORDS } from "@/data/liveWords";

type Item = { id: number; text: string; left: number; top: number; hint: boolean };

export default function LiveWords() {
  const { lowPower, reduced, nodes, pathname } = useVisuals();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (lowPower || reduced) {
      setItems([]);
      return;
    }
    let seq = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const slug = pathname.startsWith("/analogy/") ? pathname.split("/")[2] : "";
    const area = slug ? nodes.find((n) => n.id === slug)?.areaId : undefined;
    const all = Object.values(WORDS).flat();
    const focused = area && WORDS[area] ? WORDS[area] : all;

    const spawn = () => {
      if (document.hidden) return;
      const hint = Math.random() < 0.2;
      const pool = hint ? HINTS : Math.random() < 0.7 ? focused : all;
      const text = pool[Math.floor(Math.random() * pool.length)];
      const left = Math.random() < 0.5 ? 2 + Math.random() * 16 : 74 + Math.random() * 18;
      const item: Item = { id: ++seq, text, left, top: 15 + Math.random() * 70, hint };
      setItems((prev) => [...prev.slice(-5), item]);
      timers.push(setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== item.id)), 7000));
    };

    const iv = setInterval(spawn, 2200);
    spawn();
    return () => {
      clearInterval(iv);
      timers.forEach(clearTimeout);
    };
  }, [lowPower, reduced, pathname, nodes]);

  if (lowPower || reduced) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {items.map((it) => (
        <motion.span
          key={it.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: [0, 0.5, 0.5, 0], y: -48 }}
          transition={{ duration: 7, times: [0, 0.15, 0.8, 1], ease: "easeInOut" }}
          style={{ left: `${it.left}%`, top: `${it.top}%` }}
          className={
            "absolute whitespace-nowrap font-mono text-cyan-200 " +
            (it.hint ? "text-xs italic" : "text-sm uppercase tracking-widest")
          }
        >
          {it.text}
        </motion.span>
      ))}
    </div>
  );
}