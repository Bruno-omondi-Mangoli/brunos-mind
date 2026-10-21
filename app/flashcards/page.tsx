"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { nextState, priority, type CardState } from "@/lib/leitner";
import ShardFlashcard from "@/components/ShardFlashcard";
import LangToggle from "@/components/LangToggle";

type Concept = { id: string; title: string; skill_area_id: string };
type Area = { id: string; title: string };
type Explanation = {
  concept_id: string;
  world_id: string;
  lang: string;
  analogy: string;
  plain: string;
  exam: string;
};
type States = Record<string, CardState>;

const SESSION = 15;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function when(d: Date): string {
  const mins = Math.max(1, Math.round((d.getTime() - Date.now()) / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} days`;
}

function pickExplanation(
  list: Explanation[],
  conceptId: string,
  world: string,
  lang: string
): { exp: Explanation | null; exact: boolean } {
  const exact = list.find(
    (e) => e.concept_id === conceptId && e.world_id === world && e.lang === lang
  );
  if (exact) return { exp: exact, exact: true };
  const fallback =
    list.find((e) => e.concept_id === conceptId && e.world_id === "matatu" && e.lang === lang) ??
    list.find((e) => e.concept_id === conceptId && e.world_id === "matatu" && e.lang === "en") ??
    null;
  return { exp: fallback, exact: false };
}

export default function FlashcardsPage() {
  const { userId, worldId, lang, setLang, ready } = useProfile();

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [remember, setRemember] = useState<Record<string, string>>({});
  const [states, setStates] = useState<States>({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [area, setArea] = useState("all");
  const [round, setRound] = useState(0);
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knewCount, setKnewCount] = useState(0);
  const [info, setInfo] = useState("");
  const [note, setNote] = useState("");

  const statesRef = useRef<States>({});
  const requeued = useRef<Set<string>>(new Set());
  const cardRef = useRef<HTMLButtonElement>(null);

  const commit = useCallback((next: States) => {
    statesRef.current = next;
    setStates(next);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const [cs, ar, es, ls] = await Promise.all([
        supabase.from("concepts").select("id, title, skill_area_id").order("sort_order"),
        supabase.from("skill_areas").select("id, title").order("sort_order"),
        supabase
          .from("concept_explanations")
          .select("concept_id, world_id, lang, analogy, plain, exam"),
        supabase.from("concept_lessons").select("concept_id, remember").eq("lang", "en"),
      ]);
      if (cancelled) return;
      const err = cs.error ?? ar.error ?? es.error;
      if (err) {
        setLoadError(err.message);
        return;
      }

      const map: States = {};
      if (userId) {
        const st = await supabase
          .from("card_states")
          .select("concept_id, box, lapses, streak, due_at")
          .eq("user_id", userId);
        (st.data ?? []).forEach((r) => {
          map[r.concept_id as string] = {
            box: r.box as number,
            lapses: r.lapses as number,
            streak: r.streak as number,
            dueAt: new Date(r.due_at as string),
          };
        });
      }
      if (cancelled) return;

      const rem: Record<string, string> = {};
      (ls.data ?? []).forEach((r) => {
        rem[r.concept_id as string] = r.remember as string;
      });

      setConcepts((cs.data ?? []) as Concept[]);
      setAreas((ar.data ?? []) as Area[]);
      setExplanations((es.data ?? []) as Explanation[]);
      setRemember(rem);
      commit(map);
      setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ready, userId, commit]);

  const startSession = useCallback(
    (areaId: string) => {
      const now = new Date();
      const st = statesRef.current;
      const pool = concepts.filter((c) => areaId === "all" || c.skill_area_id === areaId);
      const due = pool
        .filter((c) => st[c.id] && st[c.id].dueAt.getTime() <= now.getTime())
        .sort((a, b) => priority(st[b.id], now) - priority(st[a.id], now));
      const fresh = shuffle(pool.filter((c) => !st[c.id]));
      let ids = [...due, ...fresh].slice(0, SESSION).map((c) => c.id);
      if (ids.length === 0) {
        ids = pool
          .filter((c) => st[c.id])
          .sort((a, b) => st[a.id].dueAt.getTime() - st[b.id].dueAt.getTime())
          .slice(0, SESSION)
          .map((c) => c.id);
      }
      requeued.current = new Set();
      setQueue(ids);
      setIndex(0);
      setFlipped(false);
      setKnewCount(0);
      setInfo("");
      setNote("");
    },
    [concepts]
  );

  useEffect(() => {
    if (loaded) startSession(area);
  }, [loaded, area, round, startSession]);

  const rate = useCallback(
    async (knew: boolean) => {
      const id = queue[index];
      if (!id) return;
      const prev = statesRef.current[id] ?? null;
      const next = nextState(prev, knew);
      commit({ ...statesRef.current, [id]: next });

      if (knew) setKnewCount((k) => k + 1);
      else if (!requeued.current.has(id)) {
        requeued.current.add(id);
        setQueue((q) => [...q, id]);
      }
      const title = concepts.find((c) => c.id === id)?.title ?? id;
      setInfo(`${title}: next review in ${when(next.dueAt)}`);
      setIndex((i) => i + 1);
      setFlipped(false);
      setNote("");

      if (!userId) {
        setNote("Progress not saved (no session).");
        return;
      }
      const res = await createClient()
        .from("card_states")
        .upsert(
          {
            user_id: userId,
            concept_id: id,
            box: next.box,
            lapses: next.lapses,
            streak: next.streak,
            due_at: next.dueAt.toISOString(),
          },
          { onConflict: "user_id,concept_id" }
        );
      if (res.error) setNote("Could not save progress: " + res.error.message);
    },
    [queue, index, concepts, userId, commit]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!flipped) return;
      if (e.key === "1") rate(false);
      if (e.key === "2") rate(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, rate]);

  useEffect(() => {
    if (loaded) cardRef.current?.focus();
  }, [index, loaded, queue.length]);

  if (loadError) return <p className="p-8 text-rose-300">Could not load flashcards: {loadError}</p>;
  if (!loaded || !ready) return <p className="p-8 text-white/60">Loading flashcards...</p>;

  const nowMs = Date.now();
  const allStates = Object.values(states);
  const dueNow = allStates.filter((s) => s.dueAt.getTime() <= nowMs).length;
  const newCount = concepts.filter((c) => !states[c.id]).length;
  const learned = allStates.filter((s) => s.box >= 4).length;

  const currentId = queue[index];
  const concept = concepts.find((c) => c.id === currentId);
  const finished = queue.length > 0 && index >= queue.length;
  const picked = concept ? pickExplanation(explanations, concept.id, worldId, lang) : null;
  const state = concept ? states[concept.id] : undefined;
  const areaTitle = (aid: string) => areas.find((a) => a.id === aid)?.title ?? "";

  const chip = (active: boolean) =>
    "rounded border px-3 py-1 " +
    (active
      ? "border-cyan-300 bg-cyan-300 text-black"
      : "border-white/20 text-white/70 hover:bg-white/10");

  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Flashcards</h1>
        <LangToggle lang={lang} onChange={setLang} />
      </div>

      <p className="mt-3 font-mono text-xs uppercase tracking-widest text-white/50">
        Due now {dueNow} | New {newCount} | Learned {learned}
      </p>

      <div role="group" aria-label="Topic filter" className="mt-4 flex flex-wrap gap-2 text-sm">
        {[{ id: "all", title: "All topics" }, ...areas].map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={area === a.id}
            onClick={() => setArea(a.id)}
            className={chip(area === a.id)}
          >
            {a.title}
          </button>
        ))}
      </div>

      {queue.length === 0 && (
        <p className="mt-8 text-white/60">No cards in this topic yet.</p>
      )}

      {concept && !finished && (
        <div className="mt-8">
          <div className="mb-4 flex justify-between font-mono text-xs uppercase tracking-widest text-white/50">
            <span>
              Card {index + 1} of {queue.length}
            </span>
            <span>Box {state?.box ?? 1} of 5</span>
          </div>

          <ShardFlashcard
            buttonRef={cardRef}
            flipped={flipped}
            onFlip={() => setFlipped((f) => !f)}
            front={
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-cyan-300">
                  {areaTitle(concept.skill_area_id)}
                </p>
                <h2 className="mt-4 text-3xl font-bold leading-tight">{concept.title}</h2>
                <p className="mt-6 text-white/60">
                  Say it in your own words first. Then press the card to check.
                </p>
              </div>
            }
            back={
              picked?.exp ? (
                <div className="space-y-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-cyan-300">
                      Analogy
                    </p>
                    <p className="mt-1 leading-relaxed">{picked.exp.analogy}</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-cyan-300">Plain</p>
                    <p className="mt-1 leading-relaxed">{picked.exp.plain}</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-cyan-300">
                      Exam wording
                    </p>
                    <p className="mt-1 leading-relaxed">{picked.exp.exam}</p>
                  </div>
                  {remember[concept.id] && (
                    <p className="border-t border-white/20 pt-3 text-sm text-amber-200">
                      Remember: {remember[concept.id]}
                    </p>
                  )}
                  {!picked.exact && (
                    <p className="text-xs text-white/50">
                      This world is not written yet, showing the Matatu version.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-white/70">
                  No explanation written for this concept yet. Open the concept page to write it.
                </p>
              )
            }
          />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!flipped ? (
              <p className="text-sm text-white/50">
                Press the card or hit Enter to flip. Then rate yourself.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => rate(false)}
                  className="rounded border border-rose-300 px-5 py-2 text-sm text-rose-300"
                >
                  Missed it (1)
                </button>
                <button
                  type="button"
                  onClick={() => rate(true)}
                  className="rounded bg-emerald-300 px-5 py-2 text-sm font-semibold text-black"
                >
                  Knew it (2)
                </button>
              </>
            )}
            <Link
              href={`/analogy/${concept.id}`}
              className="ml-auto text-sm text-cyan-300 hover:underline"
            >
              Open study note
            </Link>
          </div>
        </div>
      )}

      {finished && (
        <div className="mt-8 rounded-lg border border-white/20 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold">Session complete</h2>
          <p className="mt-3 text-white/70">
            You knew {knewCount} of {index} reviews. Missed cards come back sooner.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setRound((r) => r + 1)}
              className="rounded bg-cyan-400 px-5 py-2 text-sm font-semibold text-black"
            >
              Start another session
            </button>
            <Link href="/quiz" className="rounded border border-white/30 px-5 py-2 text-sm">
              Take a quiz
            </Link>
          </div>
        </div>
      )}

      {info && !finished && <p className="mt-4 text-xs text-white/50">{info}</p>}
      {note && <p className="mt-2 text-xs text-amber-300">{note}</p>}
    </section>
  );
}