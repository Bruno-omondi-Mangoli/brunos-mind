"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { nextState, type CardState } from "@/lib/leitner";
import GlassQuizCard, { type QuizOption } from "@/components/GlassQuizCard";
import LangToggle from "@/components/LangToggle";

type Question = {
  id: string;
  concept_id: string;
  stem: string;
  options: QuizOption[];
  difficulty: number;
};
type Concept = { id: string; title: string; skill_area_id: string };
type Area = { id: string; title: string; sort_order: number };
type Explanation = {
  concept_id: string;
  world_id: string;
  lang: string;
  analogy: string;
  plain: string;
  exam: string;
};
type Level = "analogy" | "plain" | "exam";

const LEVEL_LABEL: Record<Level, string> = {
  analogy: "Analogy",
  plain: "Plain",
  exam: "Exam wording",
};

const TORN =
  "polygon(0 4%, 6% 0, 14% 3%, 22% 0, 31% 4%, 40% 1%, 50% 4%, 60% 0, 70% 3%, 80% 0, 90% 4%, 100% 1%, 100% 100%, 0 100%)";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(questions: Question[], concepts: Concept[], area: string): Question[] {
  const areaOf = new Map(concepts.map((c) => [c.id, c.skill_area_id]));
  const list = questions.filter((q) => area === "all" || areaOf.get(q.concept_id) === area);
  return shuffle(list).map((q) => ({ ...q, options: shuffle(q.options) }));
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

export default function QuizPage() {
  const { userId, worldId, lang, setLang, ready } = useProfile();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [deck, setDeck] = useState<Question[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [area, setArea] = useState("all");
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [level, setLevel] = useState<Level>("plain");
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [saveNote, setSaveNote] = useState("");

  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const [qs, cs, ar, es] = await Promise.all([
        supabase.from("questions").select("id, concept_id, stem, options, difficulty"),
        supabase.from("concepts").select("id, title, skill_area_id"),
        supabase.from("skill_areas").select("id, title, sort_order").order("sort_order"),
        supabase
          .from("concept_explanations")
          .select("concept_id, world_id, lang, analogy, plain, exam"),
      ]);
      if (cancelled) return;
      const err = qs.error ?? cs.error ?? ar.error ?? es.error;
      if (err) {
        setLoadError(err.message);
        return;
      }
      const qList = (qs.data ?? []) as Question[];
      const cList = (cs.data ?? []) as Concept[];
      setQuestions(qList);
      setConcepts(cList);
      setAreas((ar.data ?? []) as Area[]);
      setExplanations((es.data ?? []) as Explanation[]);
      setDeck(buildDeck(qList, cList, "all"));
      setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const q = deck[index];

  const handleSelect = useCallback(
    async (id: string) => {
      if (!q || selectedId) return;
      const opt = q.options.find((o) => o.id === id);
      if (!opt) return;
      setSelectedId(id);
      setLevel(opt.correct ? "plain" : "analogy");
      if (opt.correct) setScore((s) => s + 1);
      else setMissed((m) => [...m, q.concept_id]);

      if (!userId) {
        setSaveNote("Progress not saved (no session).");
        return;
      }
      const supabase = createClient();
      const a = await supabase.from("attempts").insert({
        question_id: q.id,
        concept_id: q.concept_id,
        chosen_option: id,
        is_correct: opt.correct,
      });
      const prev = await supabase
        .from("card_states")
        .select("box, lapses, streak, due_at")
        .eq("user_id", userId)
        .eq("concept_id", q.concept_id)
        .maybeSingle();
      const prevState: CardState | null = prev.data
        ? {
            box: prev.data.box as number,
            lapses: prev.data.lapses as number,
            streak: prev.data.streak as number,
            dueAt: new Date(prev.data.due_at as string),
          }
        : null;
      const next = nextState(prevState, opt.correct);
      const c = await supabase.from("card_states").upsert(
        {
          user_id: userId,
          concept_id: q.concept_id,
          box: next.box,
          lapses: next.lapses,
          streak: next.streak,
          due_at: next.dueAt.toISOString(),
        },
        { onConflict: "user_id,concept_id" }
      );
      if (a.error || c.error) {
        setSaveNote("Could not save progress: " + (a.error?.message ?? c.error?.message));
      }
    },
    [q, selectedId, userId]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!q || selectedId) return;
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) handleSelect(q.options[n - 1].id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, selectedId, handleSelect]);

  useEffect(() => {
    if (selectedId) nextRef.current?.focus();
  }, [selectedId]);

  function goNext() {
    setIndex((i) => i + 1);
    setSelectedId(null);
    setSaveNote("");
  }

  function restart(nextArea: string) {
    setArea(nextArea);
    setDeck(buildDeck(questions, concepts, nextArea));
    setIndex(0);
    setSelectedId(null);
    setScore(0);
    setMissed([]);
    setSaveNote("");
  }

  const conceptTitle = (id: string) => concepts.find((c) => c.id === id)?.title ?? id;
  const areaTitle = (conceptId: string) => {
    const c = concepts.find((x) => x.id === conceptId);
    return areas.find((a) => a.id === c?.skill_area_id)?.title ?? "";
  };

  if (loadError) {
    return <p className="p-8 text-rose-300">Could not load the quiz: {loadError}</p>;
  }
  if (!loaded || !ready) {
    return <p className="p-8 text-white/60">Loading questions...</p>;
  }

  const finished = deck.length > 0 && index >= deck.length;
  const picked = q ? pickExplanation(explanations, q.concept_id, worldId, lang) : null;
  const uniqueMissed = Array.from(new Set(missed));

  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Quiz</h1>
        <LangToggle lang={lang} onChange={setLang} />
      </div>

      <div role="group" aria-label="Topic filter" className="mt-5 flex flex-wrap gap-2 text-sm">
        {[{ id: "all", title: "All topics" }, ...areas].map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={area === a.id}
            onClick={() => restart(a.id)}
            className={
              "rounded border px-3 py-1 " +
              (area === a.id
                ? "border-cyan-300 bg-cyan-300 text-black"
                : "border-white/20 text-white/70 hover:bg-white/10")
            }
          >
            {a.title}
          </button>
        ))}
      </div>

      {deck.length === 0 && <p className="mt-8 text-white/60">No questions for this topic yet.</p>}

      {q && !finished && (
        <div className="mt-8">
          <div className="mb-3 flex justify-between font-mono text-xs uppercase tracking-widest text-white/50">
            <span>
              Question {index + 1} of {deck.length}
            </span>
            <span>Score {score}</span>
          </div>
          <p className="mb-2 text-sm text-white/50">
            {selectedId ? conceptTitle(q.concept_id) : areaTitle(q.concept_id)}
          </p>

          <GlassQuizCard
            key={q.id}
            stem={q.stem}
            options={q.options}
            selectedId={selectedId}
            onSelect={handleSelect}
          />

          {selectedId && picked?.exp && (
            <div className="mt-6">
              <div role="group" aria-label="Explanation level" className="mb-2 flex gap-2 text-sm">
                {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={level === l}
                    onClick={() => setLevel(l)}
                    className={
                      "rounded border px-3 py-1 " +
                      (level === l
                        ? "border-amber-200 bg-amber-200 text-black"
                        : "border-white/20 text-white/70 hover:bg-white/10")
                    }
                  >
                    {LEVEL_LABEL[l]}
                  </button>
                ))}
              </div>
              <div
                className="bg-amber-100 px-6 pb-6 pt-8 text-neutral-900"
                style={{ clipPath: TORN }}
              >
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-600">
                  {conceptTitle(q.concept_id)}
                </p>
                <p className="mt-2 text-lg leading-relaxed">{picked.exp[level]}</p>
              </div>
              {!picked.exact && (
                <p className="mt-2 text-xs text-white/50">
                  This world is not written yet, showing the Matatu version.
                </p>
              )}
            </div>
          )}

          {selectedId && (
            <div className="mt-6 flex items-center gap-4">
              <button
                ref={nextRef}
                type="button"
                onClick={goNext}
                className="rounded bg-cyan-400 px-5 py-2 text-sm font-semibold text-black"
              >
                {index + 1 >= deck.length ? "See results" : "Next question"}
              </button>
              {saveNote && <span className="text-xs text-amber-300">{saveNote}</span>}
            </div>
          )}
          {!selectedId && (
            <p className="mt-4 text-xs text-white/40">Tip: press 1 to 4 to answer.</p>
          )}
        </div>
      )}

      {finished && (
        <div className="mt-8 rounded-lg border border-white/20 bg-white/5 p-6 backdrop-blur-xl">
          <h2 className="text-2xl font-semibold">
            You scored {score} of {deck.length}
          </h2>
          {uniqueMissed.length > 0 ? (
            <>
              <p className="mt-4 text-sm text-white/70">Concepts to revisit:</p>
              <ul className="mt-2 list-disc pl-6 text-sm">
                {uniqueMissed.map((id) => (
                  <li key={id}>{conceptTitle(id)}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-4 text-sm text-white/70">No misses. Strong round.</p>
          )}
          <button
            type="button"
            onClick={() => restart(area)}
            className="mt-6 rounded bg-cyan-400 px-5 py-2 text-sm font-semibold text-black"
          >
            Play again
          </button>
        </div>
      )}
    </section>
  );
}