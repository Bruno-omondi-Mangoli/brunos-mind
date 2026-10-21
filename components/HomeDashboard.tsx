"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { loadMastery } from "@/lib/loadMastery";
import WorldPicker, { type World } from "@/components/WorldPicker";
import LangToggle from "@/components/LangToggle";
import Gauge from "@/components/Gauge";

type Progress = {
  overall: number;
  done: number;
  total: number;
  due: number;
  nextId: string | null;
  nextTitle: string | null;
};

export default function HomeDashboard() {
  const { userId, worldId, lang, setWorld, setLang, ready } = useProfile();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    createClient()
      .from("worlds")
      .select("id, name, description")
      .order("sort_order")
      .then(({ data }) => setWorlds((data ?? []) as World[]));
  }, []);

  useEffect(() => {
    if (!ready || !userId) return;
    const uid = userId;
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      try {
        const [m, lp, cs] = await Promise.all([
          loadMastery(supabase, uid),
          supabase.from("lesson_progress").select("concept_id").eq("user_id", uid),
          supabase.from("card_states").select("due_at").eq("user_id", uid),
        ]);
        if (cancelled) return;
        const finished = new Set((lp.data ?? []).map((r) => r.concept_id as string));
        const nowMs = Date.now();
        const next = m.concepts.find((c) => !finished.has(c.id));
        setProgress({
          overall: m.overall,
          done: finished.size,
          total: m.concepts.length,
          due: (cs.data ?? []).filter((r) => new Date(r.due_at as string).getTime() <= nowMs).length,
          nextId: next?.id ?? null,
          nextTitle: next?.title ?? null,
        });
      } catch {
        if (!cancelled) setProgress(null);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ready, userId]);

  return (
    <div className="mx-auto mt-12 grid max-w-5xl gap-6 px-6 md:grid-cols-[3fr_2fr]">
      <div className="rounded-lg border border-white/20 bg-white/5 p-6 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Pick your world</h2>
          <LangToggle lang={lang} onChange={setLang} />
        </div>
        <p className="mt-1 text-sm text-white/60">
          Every concept, quiz explanation and tutor answer is retold in the world you choose.
        </p>
        <div className="mt-4">
          <WorldPicker worlds={worlds} value={worldId} onChange={setWorld} />
        </div>
      </div>

      <div className="rounded-lg border border-white/20 bg-white/5 p-6 backdrop-blur-xl">
        <h2 className="text-xl font-semibold">Your progress</h2>
        {progress ? (
          <>
            <div className="mt-2 flex justify-center">
              <Gauge value={progress.overall} label="Readiness estimate" />
            </div>
            <p className="mt-2 text-center text-sm text-white/70">
              {progress.done} of {progress.total} concepts complete | {progress.due} cards due
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {progress.nextId ? (
                <Link
                  href={`/learn/${progress.nextId}`}
                  className="rounded bg-cyan-400 px-4 py-2 text-center text-sm font-semibold text-black"
                >
                  {progress.done === 0 ? "Start with " : "Continue with "}
                  {progress.nextTitle}
                </Link>
              ) : (
                <p className="text-center text-sm text-emerald-300">Course complete.</p>
              )}
              {progress.due > 0 && (
                <Link href="/flashcards" className="rounded border border-white/30 px-4 py-2 text-center text-sm">
                  Review {progress.due} due cards
                </Link>
              )}
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-white/60">Reading your progress...</p>
        )}
      </div>
    </div>
  );
}