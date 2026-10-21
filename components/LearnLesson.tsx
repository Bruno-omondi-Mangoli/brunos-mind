"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { recordAnswer } from "@/lib/recordAnswer";
import LangToggle from "@/components/LangToggle";
import TornPaperStory from "@/components/TornPaperStory";
import GlassQuizCard, { type QuizOption } from "@/components/GlassQuizCard";
import ConceptTutor from "@/components/ConceptTutor";

type Concept = { id: string; title: string; official_summary: string; skill_area_id: string };
type Exp = { analogy: string; plain: string; exam: string };
type Lesson = { summary: string; key_points: string[]; exam_traps: string[]; remember: string };
type Question = { id: string; concept_id: string; stem: string; options: QuizOption[] };
type ExpState = "loading" | "ready" | "missing" | "generating";

const STEPS = ["Story", "Meaning", "Study note", "Quick check", "Ask the tutor"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function LearnLesson() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const { userId, worldId, lang, setLang, ready } = useProfile();

  const [concept, setConcept] = useState<Concept | null>(null);
  const [order, setOrder] = useState<Concept[]>([]);
  const [areaTitle, setAreaTitle] = useState("");
  const [worldName, setWorldName] = useState("");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exp, setExp] = useState<Exp | null>(null);
  const [expState, setExpState] = useState<ExpState>("loading");
  const [genError, setGenError] = useState("");
  const [step, setStep] = useState(0);
  const [qi, setQi] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [checkDone, setCheckDone] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    async function load() {
      setLoaded(false);
      setStep(0);
      setQi(0);
      setSelectedId(null);
      setScore(0);
      setCheckDone(false);
      setNote("");
      setError("");
      const supabase = createClient();
      const [c, list, qs, ls] = await Promise.all([
        supabase
          .from("concepts")
          .select("id, title, official_summary, skill_area_id")
          .eq("id", slug)
          .maybeSingle(),
        supabase
          .from("concepts")
          .select("id, title, official_summary, skill_area_id")
          .order("sort_order"),
        supabase.from("questions").select("id, concept_id, stem, options").eq("concept_id", slug),
        supabase
          .from("concept_lessons")
          .select("summary, key_points, exam_traps, remember")
          .eq("concept_id", slug)
          .eq("lang", "en")
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (!c.data) {
        setError("Concept not found.");
        setLoaded(true);
        return;
      }
      const found = c.data as Concept;
      const area = await supabase
        .from("skill_areas")
        .select("title")
        .eq("id", found.skill_area_id)
        .maybeSingle();
      if (cancelled) return;
      setConcept(found);
      setOrder((list.data ?? []) as Concept[]);
      setAreaTitle((area.data?.title as string) ?? "");
      setLesson((ls.data as Lesson | null) ?? null);
      setQuestions(
        shuffle((qs.data ?? []) as Question[])
          .slice(0, 3)
          .map((q) => ({ ...q, options: shuffle(q.options) }))
      );
      setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ready, slug]);

  const loadExp = useCallback(async () => {
    const supabase = createClient();
    const [e, w] = await Promise.all([
      supabase
        .from("concept_explanations")
        .select("analogy, plain, exam")
        .eq("concept_id", slug)
        .eq("world_id", worldId)
        .eq("lang", lang)
        .maybeSingle(),
      supabase.from("worlds").select("name").eq("id", worldId).maybeSingle(),
    ]);
    setWorldName((w.data?.name as string) ?? "");
    if (e.data) {
      setExp(e.data as Exp);
      setExpState("ready");
    } else {
      setExp(null);
      setExpState("missing");
    }
  }, [slug, worldId, lang]);

  useEffect(() => {
    if (ready) loadExp();
  }, [ready, loadExp]);

  async function generate() {
    setExpState("generating");
    setGenError("");
    const res = await fetch("/api/ai/analogy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conceptId: slug, worldId }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({ error: "Request failed" }))) as { error?: string };
      setGenError(j.error ?? "Request failed");
      setExpState("missing");
      return;
    }
    await loadExp();
  }

  async function onSelect(id: string) {
    const q = questions[qi];
    if (!q || selectedId) return;
    const opt = q.options.find((o) => o.id === id);
    if (!opt) return;
    setSelectedId(id);
    if (opt.correct) setScore((s) => s + 1);
    if (userId) {
      const msg = await recordAnswer(createClient(), userId, q, id, opt.correct);
      if (msg) setNote(msg);
    }
  }

  function nextQuestion() {
    if (qi + 1 >= questions.length) {
      setCheckDone(true);
    } else {
      setQi(qi + 1);
      setSelectedId(null);
    }
  }

  const idx = order.findIndex((c) => c.id === slug);
  const next = idx >= 0 ? order[idx + 1] : undefined;
  const inArea = order.filter((c) => c.skill_area_id === concept?.skill_area_id);
  const pos = inArea.findIndex((c) => c.id === slug) + 1;
  const canComplete = questions.length === 0 || checkDone;

  async function complete() {
    if (userId) {
      const res = await createClient()
        .from("lesson_progress")
        .upsert(
          { user_id: userId, concept_id: slug, score, max_score: questions.length },
          { onConflict: "user_id,concept_id" }
        );
      if (res.error) {
        setError("Could not save progress: " + res.error.message);
        return;
      }
    }
    router.push(next ? `/learn/${next.id}` : "/learn");
  }

  if (!ready || !loaded) return <p className="p-8 text-white/60">Loading lesson...</p>;
  if (error && !concept) return <p className="p-8 text-rose-300">{error}</p>;
  if (!concept) return null;

  const searchUrl =
    "https://learn.microsoft.com/search/?terms=" + encodeURIComponent(concept.title + " Azure");

  const missing = (
    <div className="rounded border border-white/15 bg-white/5 p-6">
      {expState === "generating" ? (
        <p className="text-white/70">Writing your story...</p>
      ) : expState === "loading" ? (
        <p className="text-white/60">Loading...</p>
      ) : (
        <>
          <p className="text-white/80">This concept is not written in {worldName} yet.</p>
          <button
            type="button"
            onClick={generate}
            className="mt-4 rounded bg-cyan-400 px-4 py-2 text-sm font-semibold text-black"
          >
            Write it in my world
          </button>
          {genError && <p className="mt-3 text-sm text-rose-300">{genError}</p>}
        </>
      )}
    </div>
  );

  const q = questions[qi];
  const chosen = q?.options.find((o) => o.id === selectedId);
  const wrong = chosen ? !chosen.correct : false;

  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/learn" className="text-sm text-white/60 hover:text-white">
        Back to the course
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-300">
            {areaTitle} | Concept {pos} of {inArea.length}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{concept.title}</h1>
        </div>
        <LangToggle lang={lang} onChange={setLang} />
      </div>

      <ol aria-label="Lesson steps" className="mt-6 flex flex-wrap gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              aria-current={step === i ? "step" : undefined}
              onClick={() => setStep(i)}
              className={
                "rounded border px-3 py-1 " +
                (step === i
                  ? "border-cyan-300 bg-cyan-300 text-black"
                  : i < step
                  ? "border-emerald-300/50 text-emerald-200"
                  : "border-white/20 text-white/70 hover:bg-white/10")
              }
            >
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        {step === 0 && (
          <div>
            <p className="mb-3 text-sm text-white/60">
              First, a story from your world{worldName ? `: ${worldName}` : ""}. Picture it before you read the
              Azure words.
            </p>
            {exp ? (
              <div style={{ perspective: 1200 }}>
                <TornPaperStory index={0} label="Analogy" text={exp.analogy} />
              </div>
            ) : (
              missing
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="mb-3 text-sm text-white/60">Now the same idea in plain words, then in exam wording.</p>
            {exp ? (
              <div style={{ perspective: 1200 }}>
                <TornPaperStory index={1} label="Plain" text={exp.plain} />
                <TornPaperStory index={2} label="Exam wording" text={exp.exam} />
              </div>
            ) : (
              missing
            )}
          </div>
        )}

        {step === 2 && (
          <div className="rounded-lg border border-white/20 bg-white/5 p-6">
            <h2 className="font-mono text-xs uppercase tracking-widest text-cyan-300">Study note</h2>
            {lesson ? (
              <>
                <p className="mt-3 leading-relaxed text-white/90">{lesson.summary}</p>
                <h3 className="mt-5 font-semibold">Key points</h3>
                <ul className="mt-2 list-disc space-y-1 pl-6 text-white/80">
                  {lesson.key_points.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
                <h3 className="mt-5 font-semibold">Exam traps</h3>
                <ul className="mt-2 list-disc space-y-1 pl-6 text-white/80">
                  {lesson.exam_traps.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
                <p className="mt-5 rounded border border-cyan-300/40 bg-cyan-300/10 px-4 py-3 text-sm">
                  Remember: {lesson.remember}
                </p>
              </>
            ) : (
              <p className="mt-3 leading-relaxed text-white/90">{concept.official_summary}</p>
            )}
            <p className="mt-4 text-xs text-amber-300">
              AI assisted notes. Confirm details on{" "}
              <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="underline">
                Microsoft Learn
              </a>
              .
            </p>
          </div>
        )}

        {step === 3 && (
          <div>
            {questions.length === 0 ? (
              <p className="text-white/70">No practice questions for this concept yet. Continue to the tutor.</p>
            ) : checkDone ? (
              <div className="rounded-lg border border-white/20 bg-white/5 p-6">
                <h2 className="text-2xl font-semibold">
                  You got {score} of {questions.length}
                </h2>
                <p className="mt-2 text-sm text-white/70">
                  {score === questions.length
                    ? "Clean sweep. Move on to the tutor, or ask it to test you harder."
                    : "Good. Missed ideas will come back in your flashcards. Ask the tutor about anything unclear."}
                </p>
              </div>
            ) : (
              <>
                <p className="mb-3 font-mono text-xs uppercase tracking-widest text-white/50">
                  Question {qi + 1} of {questions.length}
                </p>
                <GlassQuizCard
                  key={q.id}
                  stem={q.stem}
                  options={q.options}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
                {selectedId && wrong && exp && (
                  <div className="mt-4 rounded bg-amber-100 p-4 text-neutral-900">
                    <p className="font-mono text-xs uppercase tracking-widest text-neutral-600">
                      Think of it this way
                    </p>
                    <p className="mt-1">{exp.analogy}</p>
                  </div>
                )}
                {selectedId && (
                  <button
                    type="button"
                    onClick={nextQuestion}
                    className="mt-4 rounded bg-cyan-400 px-5 py-2 text-sm font-semibold text-black"
                  >
                    {qi + 1 >= questions.length ? "Finish check" : "Next question"}
                  </button>
                )}
                {note && <p className="mt-2 text-xs text-amber-300">{note}</p>}
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <ConceptTutor key={`${slug}-${worldId}-${lang}`} conceptTitle={concept.title} worldId={worldId} lang={lang} />
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!canComplete}
                onClick={complete}
                className="rounded bg-emerald-300 px-5 py-2 text-sm font-semibold text-black disabled:opacity-40"
              >
                {next ? "Mark complete and continue" : "Mark complete and finish"}
              </button>
              {!canComplete && <span className="text-sm text-amber-300">Finish the quick check first (step 4).</span>}
            </div>
            {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between text-sm">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="rounded border border-white/30 px-4 py-2 disabled:opacity-30"
        >
          Back
        </button>
        {step < STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="rounded bg-cyan-400 px-5 py-2 font-semibold text-black"
          >
            Next: {STEPS[step + 1]}
          </button>
        )}
      </div>
    </section>
  );
}