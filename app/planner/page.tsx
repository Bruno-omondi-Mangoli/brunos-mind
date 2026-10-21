"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { loadMastery } from "@/lib/loadMastery";
import { buildPlan, type Plan, type PlanConcept } from "@/lib/planner";
import TimelineFragments from "@/components/TimelineFragments";
import LangToggle from "@/components/LangToggle";

type Coach = {
  headline: string;
  weekly_focus: { week: number; focus: string; tip: string }[];
  exam_day_tips: string[];
};

const STUDY_GUIDE =
  "https://learn.microsoft.com/credentials/certifications/resources/study-guides/az-900";

export default function PlannerPage() {
  const { userId, lang, setLang, ready } = useProfile();
  const [examDate, setExamDate] = useState("");
  const [hours, setHours] = useState("8");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [firstFive, setFirstFive] = useState<string[]>([]);
  const [coach, setCoach] = useState<Coach | null>(null);
  const [coachNote, setCoachNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !userId) return;
    createClient()
      .from("profiles")
      .select("exam_date, weekly_hours")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.exam_date) setExamDate(data.exam_date as string);
        if (data?.weekly_hours) setHours(String(data.weekly_hours));
      });
  }, [ready, userId]);

  async function build() {
    setError("");
    setCoach(null);
    setCoachNote("");
    const h = Number(hours);
    if (!examDate) {
      setError("Pick your exam date.");
      return;
    }
    if (!(h >= 3 && h <= 40)) {
      setError("Weekly hours must be between 3 and 40.");
      return;
    }
    if (!userId) {
      setError("Still signing you in. Wait a moment and try again.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.from("profiles").update({ exam_date: examDate, weekly_hours: h }).eq("user_id", userId);

      const m = await loadMastery(supabase, userId);
      const areaOf = new Map(m.areas.map((a) => [a.id, a]));
      const list: PlanConcept[] = m.concepts
        .map((c) => {
          const a = areaOf.get(c.areaId);
          return {
            id: c.id,
            title: c.title,
            priority: (1 - (m.mastery[c.id] ?? 0)) * ((a?.weight ?? 33) / Math.max(1, a?.count ?? 1)),
          };
        })
        .sort((x, y) => y.priority - x.priority);

      const result = buildPlan(list, examDate, h);
      if ("error" in result) {
        setError(result.error);
        setBusy(false);
        return;
      }
      setPlan(result);
      setFirstFive(list.slice(0, 5).map((c) => c.title));
      setBusy(false);

      const weeks: { week: number; concepts: string[] }[] = [];
      result.days.forEach((d, i) => {
        const w = Math.floor(i / 7);
        if (w > 5) return;
        if (!weeks[w]) weeks[w] = { week: w + 1, concepts: [] };
        d.tasks.forEach((t) => {
          if (t.conceptTitle && !weeks[w].concepts.includes(t.conceptTitle)) {
            weeks[w].concepts.push(t.conceptTitle);
          }
        });
      });

      setCoachNote("Writing coach tips...");
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daysLeft: result.daysLeft,
          weeklyHours: h,
          weeks: weeks.filter(Boolean),
        }),
      });
      if (!res.ok) {
        setCoachNote("Coach tips are unavailable right now. Your plan above is complete.");
        return;
      }
      const j = (await res.json()) as { coach: Coach };
      setCoach(j.coach);
      setCoachNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the plan");
      setBusy(false);
    }
  }

  if (!ready) return <p className="p-8 text-white/60">Loading...</p>;

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Study planner</h1>
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <p className="mt-2 text-sm text-white/60">
        Your weakest and most heavily weighted concepts come first. The plan follows your answers, so build it
        again after a few quizzes.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="examDate" className="block text-sm text-white/70">
            Exam date
          </label>
          <input
            id="examDate"
            type="date"
            min={todayIso}
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="mt-1 w-full rounded border border-white/20 bg-white/5 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="hours" className="block text-sm text-white/70">
            Hours per week (3 to 40)
          </label>
          <input
            id="hours"
            type="number"
            min={3}
            max={40}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="mt-1 w-full rounded border border-white/20 bg-white/5 px-3 py-2"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={build}
          className="rounded bg-cyan-400 px-5 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          {busy ? "Building..." : "Build my plan"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      {plan && (
        <div className="mt-8">
          <p className="font-mono text-xs uppercase tracking-widest text-white/50">
            {plan.daysLeft} days left | about {plan.minutesPerDay} min per study day | {plan.conceptsPlanned}{" "}
            concepts scheduled
          </p>
          {firstFive.length > 0 && (
            <p className="mt-2 text-sm text-white/70">Starting with: {firstFive.join(", ")}.</p>
          )}
          {plan.truncated && (
            <p className="mt-2 text-sm text-amber-300">
              Your exam is more than 42 days away, so this shows the first 42 days. Come back and rebuild later.
            </p>
          )}

          {coach && (
            <div className="mt-6 rounded-lg border border-white/20 bg-white/5 p-5">
              <h2 className="text-lg font-semibold">{coach.headline}</h2>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                {coach.weekly_focus.map((w) => (
                  <li key={w.week}>
                    <span className="font-mono text-xs uppercase tracking-widest text-cyan-300">
                      Week {w.week}
                    </span>
                    <span className="block">{w.focus}</span>
                    <span className="block text-white/60">{w.tip}</span>
                  </li>
                ))}
              </ul>
              <h3 className="mt-4 font-semibold">Before the exam</h3>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-white/80">
                {coach.exam_day_tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {coachNote && <p className="mt-4 text-sm text-white/60">{coachNote}</p>}

          <TimelineFragments days={plan.days} />

          <p className="mt-8 text-xs text-white/40">
            Check the exam length, format and passing score on the{" "}
            <a href={STUDY_GUIDE} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">
              official AZ-900 study guide
            </a>
            .
          </p>
        </div>
      )}
    </section>
  );
}