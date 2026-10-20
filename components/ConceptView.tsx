"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import LangToggle from "@/components/LangToggle";
import TornPaperStory from "@/components/TornPaperStory";

const STUDY_GUIDE =
  "https://learn.microsoft.com/credentials/certifications/resources/study-guides/az-900";

type Concept = {
  id: string;
  title: string;
  official_summary: string;
  skill_area_id: string;
  learn_url: string | null;
};
type ConceptRef = { id: string; title: string; sort_order: number };
type Explanation = { analogy: string; plain: string; exam: string; reviewed: boolean };
type Lesson = {
  summary: string;
  key_points: string[];
  exam_traps: string[];
  remember: string;
  reviewed: boolean;
};
type ViewState = "loading" | "ready" | "missing" | "generating" | "error";

export default function ConceptView() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { worldId, lang, setLang, ready } = useProfile();

  const [concept, setConcept] = useState<Concept | null>(null);
  const [all, setAll] = useState<ConceptRef[]>([]);
  const [worldName, setWorldName] = useState("");
  const [exp, setExp] = useState<Explanation | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [areaUrl, setAreaUrl] = useState<string | null>(null);
  const [state, setState] = useState<ViewState>("loading");
  const [message, setMessage] = useState("");

  const loadExp = useCallback(async () => {
    const { data, error } = await createClient()
      .from("concept_explanations")
      .select("analogy, plain, exam, reviewed")
      .eq("concept_id", slug)
      .eq("world_id", worldId)
      .eq("lang", lang)
      .maybeSingle();
    if (error) {
      setMessage(error.message);
      setState("error");
      return;
    }
    if (data) {
      setExp(data as Explanation);
      setState("ready");
    } else {
      setExp(null);
      setState("missing");
    }
  }, [slug, worldId, lang]);

  useEffect(() => {
    if (!ready) return;
    async function load() {
      const supabase = createClient();
      const [c, list, w] = await Promise.all([
        supabase
          .from("concepts")
          .select("id, title, official_summary, skill_area_id, learn_url")
          .eq("id", slug)
          .maybeSingle(),
        supabase.from("concepts").select("id, title, sort_order").order("sort_order"),
        supabase.from("worlds").select("name").eq("id", worldId).maybeSingle(),
      ]);
      if (!c.data) {
        setMessage("Concept not found.");
        setState("error");
        return;
      }
      const found = c.data as Concept;
      setConcept(found);
      setAll((list.data ?? []) as ConceptRef[]);
      setWorldName((w.data?.name as string) ?? "");

      const [l, a] = await Promise.all([
        supabase
          .from("concept_lessons")
          .select("summary, key_points, exam_traps, remember, reviewed")
          .eq("concept_id", slug)
          .eq("lang", "en")
          .maybeSingle(),
        supabase.from("skill_areas").select("learn_url").eq("id", found.skill_area_id).maybeSingle(),
      ]);
      setLesson((l.data as Lesson | null) ?? null);
      setAreaUrl((a.data?.learn_url as string | null) ?? null);
      await loadExp();
    }
    load();
  }, [ready, slug, worldId, loadExp]);

  async function generate() {
    setState("generating");
    setMessage("");
    const res = await fetch("/api/ai/analogy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conceptId: slug, worldId }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({ error: "Request failed" }))) as { error?: string };
      setMessage(j.error ?? "Request failed");
      setState("missing");
      return;
    }
    await loadExp();
  }

  const idx = all.findIndex((c) => c.id === slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
  const searchUrl = concept
    ? concept.learn_url ??
      "https://learn.microsoft.com/search/?terms=" + encodeURIComponent(concept.title + " Azure")
    : null;

  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/analogy" className="text-sm text-white/60 hover:text-white">
        Back to all concepts
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{concept?.title ?? "Loading..."}</h1>
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      {worldName && <p className="mt-1 text-sm text-white/50">World: {worldName}</p>}

      {state === "error" && <p className="mt-6 text-rose-300">{message}</p>}

      {state === "missing" && (
        <div className="mt-6 rounded border border-white/15 bg-white/5 p-6">
          <p className="text-white/80">This concept is not written in {worldName} yet.</p>
          <button
            type="button"
            onClick={generate}
            className="mt-4 rounded bg-cyan-400 px-4 py-2 text-sm font-semibold text-black"
          >
            Write it in my world
          </button>
          {message && <p className="mt-3 text-sm text-rose-300">{message}</p>}
        </div>
      )}

      {state === "generating" && <p className="mt-6 text-white/70">Writing your story...</p>}

      {state === "ready" && exp && (
        <div
          key={`${worldId}-${lang}`}
          style={{ perspective: 1200 }}
          className="mt-6 rounded-lg border border-white/20 bg-white/5 p-4 backdrop-blur-xl"
        >
          <TornPaperStory index={0} label="Analogy" text={exp.analogy} />
          <TornPaperStory index={1} label="Plain" text={exp.plain} />
          <TornPaperStory index={2} label="Exam wording" text={exp.exam} />
          {!exp.reviewed && (
            <p className="mt-4 text-xs text-amber-300">
              Draft, not yet reviewed. Check the exam wording against Microsoft Learn.
            </p>
          )}
        </div>
      )}

      {lesson && (
        <div className="mt-8 rounded-lg border border-white/20 bg-white/5 p-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-cyan-300">
            Study note (English)
          </h2>
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
          {!lesson.reviewed && (
            <p className="mt-3 text-xs text-amber-300">
              AI written draft. Confirm details on Microsoft Learn.
            </p>
          )}
        </div>
      )}

      {concept && (
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          {searchUrl && (
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-white/30 px-3 py-1 hover:bg-white/10"
            >
              Find this on Microsoft Learn
            </a>
          )}
          {areaUrl && (
            <a
              href={areaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-white/30 px-3 py-1 hover:bg-white/10"
            >
              Matching learning path
            </a>
          )}
          <a
            href={STUDY_GUIDE}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-white/30 px-3 py-1 hover:bg-white/10"
          >
            AZ-900 study guide
          </a>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex gap-4">
          {prev && (
            <Link href={`/analogy/${prev.id}`} className="text-cyan-300 hover:underline">
              Previous: {prev.title}
            </Link>
          )}
          {next && (
            <Link href={`/analogy/${next.id}`} className="text-cyan-300 hover:underline">
              Next: {next.title}
            </Link>
          )}
        </div>
        <Link href="/quiz" className="rounded border border-white/30 px-3 py-1 hover:bg-white/10">
          Test myself
        </Link>
      </div>
    </section>
  );
}