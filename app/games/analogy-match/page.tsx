"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import LangToggle from "@/components/LangToggle";

type Card = { id: string; title: string; analogy: string; plain: string };

const N = 6;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function AnalogyMatchPage() {
  const { userId, worldId, lang, setLang, ready } = useProfile();
  const reduce = useReducedMotion();

  const [cards, setCards] = useState<Card[]>([]);
  const [left, setLeft] = useState<string[]>([]);
  const [right, setRight] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null);
  const [hint, setHint] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const savedRef = useRef(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    async function deal() {
      setLoading(true);
      const supabase = createClient();
      const [cs, es] = await Promise.all([
        supabase.from("concepts").select("id, title"),
        supabase
          .from("concept_explanations")
          .select("concept_id, analogy, plain")
          .eq("world_id", worldId)
          .eq("lang", lang),
      ]);
      if (cancelled) return;
      const err = cs.error ?? es.error;
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      const titles = new Map((cs.data ?? []).map((c) => [c.id as string, c.title as string]));
      const pool: Card[] = [];
      (es.data ?? []).forEach((e) => {
        const title = titles.get(e.concept_id as string);
        if (title) {
          pool.push({
            id: e.concept_id as string,
            title,
            analogy: e.analogy as string,
            plain: e.plain as string,
          });
        }
      });
      const chosen = shuffle(pool).slice(0, N);
      setCards(chosen);
      setLeft(shuffle(chosen.map((c) => c.id)));
      setRight(shuffle(chosen.map((c) => c.id)));
      setSelected(null);
      setMatched([]);
      setMistakes(0);
      setFlash(null);
      setHint("");
      setSaveNote("");
      savedRef.current = false;
      setLoading(false);
    }
    deal();
    return () => {
      cancelled = true;
    };
  }, [ready, worldId, lang, round]);

  const done = cards.length > 0 && matched.length === cards.length;
  const score = Math.max(0, cards.length - mistakes);

  useEffect(() => {
    if (!done || savedRef.current) return;
    savedRef.current = true;
    if (!userId) {
      setSaveNote("Score not saved (no session).");
      return;
    }
    createClient()
      .from("game_sessions")
      .insert({
        game: "analogy_match",
        concept_ids: cards.map((c) => c.id),
        score,
        max_score: cards.length,
      })
      .then(({ error: e }) => {
        if (e) setSaveNote("Could not save score: " + e.message);
      });
  }, [done, userId, cards, score]);

  const byId = (id: string) => cards.find((c) => c.id === id);

  function pickLeft(id: string) {
    if (matched.includes(id)) return;
    setSelected(id);
    setFlash(null);
    setHint("");
  }

  function pickRight(id: string) {
    if (matched.includes(id)) return;
    if (!selected) {
      setHint("Pick a concept on the left first.");
      return;
    }
    setHint("");
    if (selected === id) {
      setMatched((m) => [...m, id]);
    } else {
      setMistakes((m) => m + 1);
      setFlash({ id, n: Date.now() });
    }
    setSelected(null);
  }

  if (error) return <p className="p-8 text-rose-300">Could not load the game: {error}</p>;
  if (!ready || loading) return <p className="p-8 text-white/60">Dealing cards...</p>;

  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/games" className="text-sm text-white/60 hover:text-white">
        Back to games
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Analogy Match</h1>
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <p className="mt-2 text-white/60">
        Pick a concept, then pick the story that explains it. Wrong picks cost a point.
      </p>

      {cards.length < 4 && (
        <p className="mt-8 text-white/70">
          Not enough analogies written in this world and language yet.{" "}
          <Link href="/analogy" className="text-cyan-300 hover:underline">
            Write them on the Analogies page
          </Link>
          .
        </p>
      )}

      {cards.length >= 4 && !done && (
        <>
          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-white/50">
            Matched {matched.length} of {cards.length} | Mistakes {mistakes}
          </p>
          <div className="mt-4 grid gap-6 md:grid-cols-[1fr_2fr]">
            <div role="group" aria-label="Concepts" className="flex flex-col gap-3">
              {left.map((id) => {
                const c = byId(id);
                if (!c) return null;
                const isMatched = matched.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={isMatched}
                    aria-pressed={selected === id}
                    onClick={() => pickLeft(id)}
                    className={
                      "rounded border px-4 py-3 text-left text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 " +
                      (isMatched
                        ? "border-emerald-300/60 bg-emerald-300/10 text-white/50"
                        : selected === id
                        ? "border-cyan-300 bg-cyan-300/20"
                        : "border-white/20 bg-white/5 hover:bg-white/10")
                    }
                  >
                    {c.title}
                    {isMatched && (
                      <span className="ml-2 font-mono text-xs uppercase text-emerald-300">Matched</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div role="group" aria-label="Stories" className="flex flex-col gap-3">
              {right.map((id) => {
                const c = byId(id);
                if (!c) return null;
                const isMatched = matched.includes(id);
                const flashing = flash?.id === id;
                return (
                  <motion.button
                    key={`${id}-${flashing ? flash.n : 0}`}
                    type="button"
                    disabled={isMatched}
                    onClick={() => pickRight(id)}
                    initial={{ x: 0 }}
                    animate={{ x: flashing && !reduce ? [0, -8, 8, -6, 6, 0] : 0 }}
                    transition={{ duration: 0.4 }}
                    className={
                      "rounded border px-4 py-3 text-left text-sm leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 " +
                      (isMatched
                        ? "border-emerald-300/60 bg-emerald-300/10 text-white/50"
                        : flashing
                        ? "border-rose-400 bg-rose-400/15"
                        : "border-white/20 bg-white/5 hover:bg-white/10")
                    }
                  >
                    {c.analogy}
                  </motion.button>
                );
              })}
            </div>
          </div>
          {hint && <p className="mt-4 text-sm text-amber-300">{hint}</p>}
        </>
      )}

      {done && (
        <div className="mt-8 rounded-lg border border-white/20 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold">
            You scored {score} of {cards.length}
          </h2>
          <p className="mt-2 text-sm text-white/60">What each one means, in one line:</p>
          <ul className="mt-3 space-y-3 text-sm">
            {cards.map((c) => (
              <li key={c.id}>
                <Link href={`/analogy/${c.id}`} className="font-semibold text-cyan-300 hover:underline">
                  {c.title}
                </Link>
                <span className="block text-white/80">{c.plain}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setRound((r) => r + 1)}
              className="rounded bg-cyan-400 px-5 py-2 text-sm font-semibold text-black"
            >
              Deal a new round
            </button>
            <Link href="/games" className="rounded border border-white/30 px-5 py-2 text-sm">
              All games
            </Link>
          </div>
          {saveNote && <p className="mt-3 text-xs text-amber-300">{saveNote}</p>}
        </div>
      )}
    </section>
  );
}