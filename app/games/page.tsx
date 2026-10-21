"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";

type Game = { id: string; href: string; title: string; blurb: string; ready: boolean };
type Stat = { plays: number; best: number };

const GAMES: Game[] = [
  {
    id: "analogy_match",
    href: "/games/analogy-match",
    title: "Analogy Match",
    blurb: "Match each Azure concept to the everyday story that explains it.",
    ready: true,
  },
  {
    id: "layer_sort",
    href: "/games/layer-sort",
    title: "Layer Sort",
    blurb: "Decide who manages what in IaaS, PaaS and SaaS.",
    ready: true,
  },
  {
    id: "outage_survivor",
    href: "/games",
    title: "Outage Survivor",
    blurb: "A datacenter loses power. Which setup keeps the app alive?",
    ready: false,
  },
];

export default function GamesPage() {
  const { userId, ready } = useProfile();
  const [stats, setStats] = useState<Record<string, Stat>>({});

  useEffect(() => {
    if (!ready || !userId) return;
    createClient()
      .from("game_sessions")
      .select("game, score, max_score")
      .then(({ data }) => {
        const next: Record<string, Stat> = {};
        (data ?? []).forEach((r) => {
          const g = r.game as string;
          const pct = Math.round(((r.score as number) / Math.max(1, r.max_score as number)) * 100);
          const cur = next[g] ?? { plays: 0, best: 0 };
          next[g] = { plays: cur.plays + 1, best: Math.max(cur.best, pct) };
        });
        setStats(next);
      });
  }, [ready, userId]);

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">Games</h1>
      <p className="mt-2 text-white/60">Short rounds that make the concepts stick.</p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {GAMES.map((g) => {
          const s = stats[g.id];
          const body = (
            <>
              <h2 className="text-xl font-semibold">{g.title}</h2>
              <p className="mt-2 text-sm text-white/70">{g.blurb}</p>
              <p className="mt-4 font-mono text-xs uppercase tracking-widest text-white/50">
                {!g.ready ? "Coming soon" : s ? `Best ${s.best} percent | Plays ${s.plays}` : "Not played yet"}
              </p>
            </>
          );
          return (
            <li key={g.id}>
              {g.ready ? (
                <Link
                  href={g.href}
                  className="block rounded-lg border border-white/20 bg-white/5 p-5 hover:bg-white/10"
                >
                  {body}
                </Link>
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/5 p-5 opacity-60">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}