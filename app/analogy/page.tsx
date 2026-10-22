"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import WorldPicker, { type World } from "@/components/WorldPicker";
import LangToggle from "@/components/LangToggle";

type Concept = { id: string; title: string; skill_area_id: string; sort_order: number };
type Area = { id: string; title: string; sort_order: number };
type Presence = { concept_id: string; world_id: string; lang: string };

export default function AnalogyIndexPage() {
  const { worldId, lang, setWorld, setLang, ready } = useProfile();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPresence = useCallback(async () => {
    const { data, error: err } = await createClient()
      .from("concept_explanations")
      .select("concept_id, world_id, lang");
    if (err) {
      setError(err.message);
      return;
    }
    setPresence((data ?? []) as Presence[]);
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [w, c, a] = await Promise.all([
        supabase.from("worlds").select("id, name, description").order("sort_order"),
        supabase.from("concepts").select("id, title, skill_area_id, sort_order").order("sort_order"),
        supabase.from("skill_areas").select("id, title, sort_order").order("sort_order"),
      ]);
      const err = w.error ?? c.error ?? a.error;
      if (err) {
        setError(err.message);
        return;
      }
      setWorlds((w.data ?? []) as World[]);
      setConcepts((c.data ?? []) as Concept[]);
      setAreas((a.data ?? []) as Area[]);
      await loadPresence();
      setLoaded(true);
    }
    load();
  }, [loadPresence]);

  const has = (conceptId: string, l: string) =>
    presence.some((p) => p.concept_id === conceptId && p.world_id === worldId && p.lang === l);

  async function prepareWorld() {
    setBusy(true);
    setError("");
    const todo = concepts.filter((c) => !has(c.id, "en") || !has(c.id, "sw"));
    for (let i = 0; i < todo.length; i++) {
      setProgress(`Writing ${i + 1} of ${todo.length}: ${todo[i].title}`);
      const res = await fetch("/api/ai/analogy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId: todo[i].id, worldId }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({ error: "Request failed" }))) as { error?: string };
        setError(`${todo[i].title}: ${j.error ?? res.status}`);
        break;
      }
    }
    await loadPresence();
    setProgress("");
    setBusy(false);
  }

  if (!loaded || !ready) {
    return <p className="p-8 text-white/60">{error ? "Error: " + error : "Loading..."}</p>;
  }

  const missing = concepts.filter((c) => !has(c.id, "en") || !has(c.id, "sw")).length;

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Analogy Engine</h1>
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <p className="mt-2 text-white/60">Pick your world. Every concept is retold in it.</p>

      <div className="mt-6">
        <WorldPicker worlds={worlds} value={worldId} onChange={setWorld} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={busy || missing === 0}
          onClick={prepareWorld}
          className="rounded bg-cyan-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          {missing === 0 ? "This world is ready" : `Write ${missing} missing in this world`}
        </button>
        {progress && <span className="text-sm text-white/70">{progress}</span>}
      </div>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      {areas.map((a) => (
        <div key={a.id} className="mt-8">
          <h2 className="font-mono text-xs uppercase tracking-widest text-white/50">{a.title}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {concepts
              .filter((c) => c.skill_area_id === a.id)
              .map((c) => {
                const ok = has(c.id, lang);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/analogy/${c.id}`}
                      className="flex items-center justify-between rounded border border-white/15 bg-white/5 px-4 py-3 hover:bg-white/10"
                    >
                      <span>{c.title}</span>
                      <span className={ok ? "text-xs text-emerald-300" : "text-xs text-white/60"}>
                        {ok ? "Ready" : "Not written"}
                      </span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </section>
  );
}