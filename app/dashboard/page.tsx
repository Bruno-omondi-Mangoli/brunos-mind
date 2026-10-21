"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { loadDemoLearner } from "@/lib/demo";
import { readiness, scoreLabel, type ConceptStats } from "@/lib/readiness";
import Gauge from "@/components/Gauge";

type Computed = {
  result: ReturnType<typeof readiness>;
  areas: { id: string; title: string; weight: number }[];
  concepts: { id: string; title: string; areaId: string }[];
  recent: Record<string, boolean[]>;
  totals: { attempts: number; accuracy: number; due: number; games: number };
};

export default function DashboardPage() {
  const { userId, ready } = useProfile();
  const [data, setData] = useState<Computed | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    const [ar, cs, at, st, gs] = await Promise.all([
      supabase.from("skill_areas").select("id, title, weight_percent, sort_order").order("sort_order"),
      supabase.from("concepts").select("id, title, skill_area_id").order("sort_order"),
      supabase
        .from("attempts")
        .select("concept_id, is_correct, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      supabase.from("card_states").select("concept_id, box, due_at").eq("user_id", userId),
      supabase.from("game_sessions").select("concept_ids, score, max_score").eq("user_id", userId),
    ]);
    const err = ar.error ?? cs.error ?? at.error ?? st.error ?? gs.error;
    if (err) {
      setError(err.message);
      return;
    }

    const areas = (ar.data ?? []).map((a) => ({
      id: a.id as string,
      title: a.title as string,
      weight: Number(a.weight_percent),
    }));
    const concepts = (cs.data ?? []).map((c) => ({
      id: c.id as string,
      title: c.title as string,
      areaId: c.skill_area_id as string,
    }));

    const recent: Record<string, boolean[]> = {};
    (at.data ?? []).forEach((r) => {
      const id = r.concept_id as string;
      (recent[id] ??= []).push(r.is_correct as boolean);
    });

    const boxes: Record<string, number> = {};
    const nowMs = Date.now();
    let due = 0;
    (st.data ?? []).forEach((r) => {
      boxes[r.concept_id as string] = r.box as number;
      if (new Date(r.due_at as string).getTime() <= nowMs) due += 1;
    });

    const gameSum: Record<string, number> = {};
    const gameCnt: Record<string, number> = {};
    (gs.data ?? []).forEach((r) => {
      const ratio = (r.score as number) / Math.max(1, r.max_score as number);
      ((r.concept_ids ?? []) as string[]).forEach((id) => {
        gameSum[id] = (gameSum[id] ?? 0) + ratio;
        gameCnt[id] = (gameCnt[id] ?? 0) + 1;
      });
    });

    const stats: ConceptStats[] = concepts.map((c) => ({
      conceptId: c.id,
      areaId: c.areaId,
      recent: (recent[c.id] ?? []).slice(-5),
      box: boxes[c.id] ?? 1,
      gameRatio: gameCnt[c.id] ? gameSum[c.id] / gameCnt[c.id] : null,
    }));

    const result = readiness(
      areas.map((a) => ({
        id: a.id,
        weight: a.weight,
        totalConcepts: concepts.filter((c) => c.areaId === a.id).length,
      })),
      stats
    );

    const attemptRows = at.data ?? [];
    const correct = attemptRows.filter((r) => r.is_correct).length;
    setData({
      result,
      areas,
      concepts,
      recent,
      totals: {
        attempts: attemptRows.length,
        accuracy: attemptRows.length ? Math.round((correct / attemptRows.length) * 100) : 0,
        due,
        games: (gs.data ?? []).length,
      },
    });
  }, [userId]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  async function onDemo() {
    setBusy(true);
    setMessage("Loading...");
    const msg = await loadDemoLearner(createClient());
    setMessage(msg);
    await load();
    setBusy(false);
  }

  if (error) return <p className="p-8 text-rose-300">Could not load the dashboard: {error}</p>;
  if (!ready || !data) return <p className="p-8 text-white/60">Reading the instruments...</p>;

  const { result, areas, concepts, recent, totals } = data;
  const weakest = concepts
    .filter((c) => (recent[c.id] ?? []).length > 0)
    .map((c) => ({ ...c, m: result.mastery[c.id] ?? 0 }))
    .sort((a, b) => a.m - b.m)
    .slice(0, 6);

  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold">Readiness</h1>
      <p className="mt-2 text-sm text-white/60">
        An estimate from your quiz answers, flashcard boxes and games. It is not a prediction of your exam
        result.
      </p>

      <div className="mt-8 grid items-center gap-8 md:grid-cols-[auto_1fr]">
        <Gauge value={result.overall} label="Overall readiness" sub={scoreLabel(result.overall)} size="lg" />
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-white/50">
            Coverage {Math.round(result.coverage * 100)} percent of concepts attempted
          </p>
          {result.lowConfidence && (
            <p className="mt-3 text-sm text-amber-300">
              Low confidence: you have answered questions on fewer than half of the concepts. Take more quizzes
              to make this number meaningful.
            </p>
          )}
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-white/50">Answers</dt>
              <dd className="text-2xl font-bold">{totals.attempts}</dd>
            </div>
            <div>
              <dt className="text-white/50">Accuracy</dt>
              <dd className="text-2xl font-bold">{totals.accuracy}%</dd>
            </div>
            <div>
              <dt className="text-white/50">Cards due</dt>
              <dd className="text-2xl font-bold">{totals.due}</dd>
            </div>
            <div>
              <dt className="text-white/50">Games played</dt>
              <dd className="text-2xl font-bold">{totals.games}</dd>
            </div>
          </dl>
        </div>
      </div>

      <h2 className="mt-12 font-mono text-xs uppercase tracking-widest text-white/50">By skill area</h2>
      <div className="mt-4 grid gap-8 sm:grid-cols-3">
        {areas.map((a) => {
          const r = result.areas.find((x) => x.id === a.id);
          return (
            <Gauge
              key={a.id}
              value={(r?.score ?? 0) * 100}
              label={a.title}
              sub={`Weight ${a.weight} percent | ${r?.attempted ?? 0} of ${r?.total ?? 0} tried`}
            />
          );
        })}
      </div>
      <p className="mt-4 text-xs text-white/40">
        Skill area weights come from the database. VERIFY them against the AZ-900 study guide on Microsoft
        Learn.
      </p>

      <h2 className="mt-12 font-mono text-xs uppercase tracking-widest text-white/50">Weakest concepts</h2>
      {weakest.length === 0 ? (
        <p className="mt-3 text-white/70">
          No answers yet.{" "}
          <Link href="/quiz" className="text-cyan-300 hover:underline">
            Take a quiz
          </Link>{" "}
          or load the demo learner below.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-white/10 rounded border border-white/10">
          {weakest.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <Link href={`/analogy/${c.id}`} className="font-semibold text-cyan-300 hover:underline">
                {c.title}
              </Link>
              <span className="flex items-center gap-3 text-sm text-white/60">
                <span className="flex gap-1" aria-label="Recent answers">
                  {(recent[c.id] ?? []).slice(-5).map((ok, i) => (
                    <span
                      key={i}
                      className={"inline-block h-2.5 w-2.5 rounded-full " + (ok ? "bg-emerald-300" : "bg-rose-400")}
                    />
                  ))}
                </span>
                <span>{Math.round(c.m * 100)} percent</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onDemo}
          className="rounded bg-cyan-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          Load demo learner
        </button>
        <button type="button" onClick={load} className="rounded border border-white/30 px-4 py-2 text-sm">
          Refresh
        </button>
        {message && <span className="text-sm text-white/70">{message}</span>}
      </div>
    </section>
  );
}