"use client";

import { useEffect, useRef } from "react";
import { useVisuals } from "@/components/VisualsProvider";
import { PULSE_EVENT, THINK_EVENT, type PulseDetail } from "@/lib/neuralBus";

type N = { id: string; area: number; bx: number; by: number; phase: number; speed: number; m: number };
type Pulse = { node: number; t0: number; rgb: string };

const LIFE = 1600;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tone(m: number): string {
  if (m < 0.05) return "148,163,184";
  if (m < 0.4) return "251,113,133";
  if (m < 0.7) return "252,211,77";
  return "120,160,190";
}

export default function NeuralBackground() {
  const { lowPower, reduced, nodes, areaIds } = useVisuals();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || lowPower || nodes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const anchors = [0.18, 0.5, 0.82];
    const list: N[] = nodes.map((n) => {
      const r = rng(hash(n.id));
      const a = Math.max(0, areaIds.indexOf(n.areaId));
      const ax = anchors[a % anchors.length];
      return {
        id: n.id,
        area: a,
        bx: Math.min(0.96, Math.max(0.04, ax + (r() - 0.5) * 0.3)),
        by: Math.min(0.94, Math.max(0.06, 0.5 + (r() - 0.5) * 0.85)),
        phase: r() * 6.28,
        speed: 0.15 + r() * 0.25,
        m: n.mastery,
      };
    });

    const edges: [number, number][] = [];
    const seen = new Set<string>();
    const add = (a: number, b: number) => {
      if (a === b) return;
      const k = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (seen.has(k)) return;
      seen.add(k);
      edges.push([a, b]);
    };
    list.forEach((n, i) => {
      list
        .map((o, j) => ({
          j,
          d: o.area === n.area && j !== i ? (o.bx - n.bx) ** 2 + (o.by - n.by) ** 2 : Infinity,
        }))
        .filter((x) => x.d !== Infinity)
        .sort((p, q) => p.d - q.d)
        .slice(0, 2)
        .forEach((x) => add(i, x.j));
    });
    const rr = rng(7);
    for (let k = 0; k < Math.floor(list.length / 4); k++) {
      add(Math.floor(rr() * list.length), Math.floor(rr() * list.length));
    }

    const pulses: Pulse[] = [];
    const addPulse = (node: number, rgb: string) => {
      pulses.push({ node, t0: performance.now(), rgb });
      if (pulses.length > 24) pulses.shift();
    };

    const onPulse = (e: Event) => {
      const d = (e as CustomEvent<PulseDetail>).detail;
      let idx = list.findIndex((n) => n.id === d.conceptId);
      if (idx < 0) idx = Math.floor(Math.random() * list.length);
      addPulse(idx, d.kind === "right" ? "110,231,183" : "251,113,133");
    };
    let thinking = false;
    const onThink = (e: Event) => {
      thinking = (e as CustomEvent<{ on: boolean }>).detail.on;
    };
    window.addEventListener(PULSE_EVENT, onPulse);
    window.addEventListener(THINK_EVENT, onThink);

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      while (pulses.length && t - pulses[0].t0 > LIFE) pulses.shift();
      const sec = t / 1000;
      const pos = list.map((n) => ({
        x: n.bx * w + (reduced ? 0 : Math.sin(sec * n.speed + n.phase) * 14),
        y: n.by * h + (reduced ? 0 : Math.cos(sec * n.speed * 0.8 + n.phase) * 14),
      }));
      const glow: number[] = new Array(list.length).fill(0);
      for (const p of pulses) {
        glow[p.node] = Math.max(glow[p.node], 1 - (t - p.t0) / LIFE);
      }

      for (const [a, b] of edges) {
        const g = Math.max(glow[a], glow[b]);
        ctx.strokeStyle = `rgba(148,163,184,${0.1 + 0.6 * g})`;
        ctx.lineWidth = 1 + g;
        ctx.beginPath();
        ctx.moveTo(pos[a].x, pos[a].y);
        ctx.lineTo(pos[b].x, pos[b].y);
        ctx.stroke();
      }

      list.forEach((n, i) => {
        const rgb = tone(n.m);
        const alpha = n.m < 0.05 ? 0.35 : 0.45 + 0.55 * n.m;
        const r = 2.5 + 4 * n.m + 5 * glow[i];
        ctx.fillStyle = `rgba(${rgb},${alpha * 0.18})`;
        ctx.beginPath();
        ctx.arc(pos[i].x, pos[i].y, r * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${rgb},${alpha})`;
        ctx.beginPath();
        ctx.arc(pos[i].x, pos[i].y, r, 0, Math.PI * 2);
        ctx.fill();
      });

      for (const p of pulses) {
        const k = (t - p.t0) / LIFE;
        ctx.strokeStyle = `rgba(${p.rgb},${1 - k})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos[p.node].x, pos[p.node].y, 6 + 40 * k, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    let raf = 0;
    let last = 0;
    let nextThink = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || t - last < 33) return;
      last = t;
      if (thinking && t > nextThink) {
        addPulse(Math.floor(Math.random() * list.length), "120,160,190");
        nextThink = t + 350;
      }
      draw(t);
    };

    if (reduced) draw(performance.now());
    else raf = requestAnimationFrame(loop);

    const onResize = () => {
      resize();
      if (reduced) draw(performance.now());
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener(PULSE_EVENT, onPulse);
      window.removeEventListener(THINK_EVENT, onThink);
    };
  }, [nodes, areaIds, lowPower, reduced]);

  if (lowPower) return null;

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-20"
    />
  );
}