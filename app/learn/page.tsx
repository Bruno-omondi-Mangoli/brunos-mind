"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";

type Area = { id: string; title: string; weight_percent: number };
type Concept = { id: string; title: string; skill_area_id: string };
type Prog = { concept_id: string; score: number; max_score: number };

const BLURB: Record<string, string> = {
  cloud_concepts: "Why the cloud exists, how it is paid for, and who is responsible for what.",
  architecture_services: "Where Azure lives, what you can run on it, how data is stored and how people sign in.",
  management_governance: "How to control cost, enforce rules, and manage and monitor everything.",
};

export default function LearnPage() {
  const { userId, ready } = useProfile();
  const [areas, setAreas] = useState<Area[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [progress, setProgress] = useState<Record<string, Prog>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const [ar, cs, lp] = await Promise.all([
        supabase.from("skill_areas").select("id, title, weight_percent, sort_order").order("sort_order"),
        supabase.from("concepts").select("id, title, skill_area_id").order("sort_order"),
        userId
          ? supabase.from("lesson_progress").select("concept_id, score, max_score").eq("user_id", userId)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (cancelled) return;
      const err = ar.error ?? cs.error;
      if (err) {
        setError(err.message);
        return;
      }
      const map: Record<string, Prog> = {};
      ((lp.data ?? []) as Prog[]).forEach((p) => {
        map[p.concept_id] = p;
      });
      setAreas((ar.data ?? []) as Area[]);
      setConcepts((cs.data ?? []) as Concept[]);
      setProgress(map);
      setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ready, userId]);

  if (error) return <p className="p-8 text-rose-300">Could not load the course: {error}</p>;
  if (!ready || !loaded) return <p className="p-8 text-white/60">Loading the course...</p>;

  const done = concepts.filter((c) => progress[c.id]).length;
  const nextUp = concepts.find((c) => !progress[c.id]);

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">The course</h1>
      <p className="mt-2 text-white/70">
        Follow the units in order. Each concept takes about 10 to 15 minutes: a story from your world, the
        meaning in plain and exam words, a study note, a quick check, and a chat with your tutor.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <p className="font-mono text-xs uppercase tracking-widest text-white/60">
          {done} of {concepts.length} concepts complete
        </p>
        {nextUp ? (
          <Link
            href={`/learn/${nextUp.id}`}
            className="rounded bg-cyan-400 px-5 py-2 text-sm font-semibold text-black"
          >
            {done === 0 ? "Start with " : "Continue with "}
            {nextUp.title}
          </Link>
        ) : (
          <span className="text-emerald-300">Course complete. Take a quiz and review your flashcards.</span>
        )}
      </div>

      {areas.map((a, n) => {
        const list = concepts.filter((c) => c.skill_area_id === a.id);
        const d = list.filter((c) => progress[c.id]).length;
        const pct = list.length ? Math.round((d / list.length) * 100) : 0;
        return (
          <div key={a.id} className="mt-10">
            <p className="font-mono text-xs uppercase tracking-widest text-cyan-300">
              Unit {n + 1} | {a.weight_percent} percent of the exam (VERIFY)
            </p>
            <h2 className="mt-1 text-2xl font-semibold">{a.title}</h2>
            <p className="mt-1 text-sm text-white/60">{BLURB[a.id] ?? ""}</p>
            <div
              className="mt-3 h-2 overflow-hidden rounded bg-white/10"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${a.title} progress`}
            >
              <div className="h-full bg-emerald-300" style={{ width: `${pct}%` }} />
            </div>
            <ol className="mt-4 divide-y divide-white/10 rounded border border-white/10">
              {list.map((c, i) => {
                const p = progress[c.id];
                return (
                  <li key={c.id}>
                    <Link
                      href={`/learn/${c.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5"
                    >
                      <span>
                        <span className="mr-3 font-mono text-xs text-white/60">{i + 1}</span>
                        {c.title}
                      </span>
                      <span className={p ? "text-xs text-emerald-300" : "text-xs text-white/60"}>
                        {p ? `Done${p.max_score ? ` | check ${p.score}/${p.max_score}` : ""}` : "Not started"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </section>
  );
}