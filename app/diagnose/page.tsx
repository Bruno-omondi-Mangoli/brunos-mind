"use client";

import Link from "next/link";
import { useState } from "react";
import { useProfile } from "@/lib/useProfile";
import LangToggle from "@/components/LangToggle";
import TornPaperStory from "@/components/TornPaperStory";

type Item = {
  misconception: string;
  why_it_is_wrong: string;
  fix_analogy: string;
  rule: string;
  confidence: "high" | "medium" | "low";
  concepts: { id: string; title: string }[];
};
type Result = { summary: string; items: Item[]; basedOn: number };

export default function DiagnosePage() {
  const { lang, setLang, ready } = useProfile();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError("");
    setResult(null);
    const res = await fetch("/api/ai/diagnose", { method: "POST" });
    const j = (await res.json().catch(() => ({ error: "Request failed" }))) as Partial<Result> & {
      error?: string;
    };
    if (!res.ok) {
      setError(j.error ?? "Request failed");
      setBusy(false);
      return;
    }
    setResult(j as Result);
    setBusy(false);
  }

  if (!ready) return <p className="p-8 text-white/60">Loading...</p>;

  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Find my gaps</h1>
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <p className="mt-2 text-sm text-white/60">
        The AI reads your recent wrong answers and looks for the one wrong idea behind several of them. The
        fix is told in your chosen world and language.
      </p>

      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="mt-6 rounded bg-cyan-400 px-5 py-2 text-sm font-semibold text-black disabled:opacity-40"
      >
        {busy ? "Reading your answers..." : "Find my misconceptions"}
      </button>
      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

      {result && (
        <div className="mt-8">
          <p className="font-mono text-xs uppercase tracking-widest text-white/50">
            Based on your last {result.basedOn} wrong answers
          </p>
          <p className="mt-2 text-white/80">{result.summary}</p>

          <div className="mt-6 flex flex-col gap-10">
            {result.items.map((m, i) => (
              <article key={i} className="rounded-lg border border-white/20 bg-white/5 p-5 backdrop-blur-xl">
                <p className="font-mono text-xs uppercase tracking-widest text-rose-300">
                  Gap {i + 1}
                  {m.confidence === "low" ? " | low confidence, little evidence" : ""}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{m.misconception}</h2>
                <p className="mt-3 text-white/80">{m.why_it_is_wrong}</p>

                <div style={{ perspective: 1200 }} className="mt-5">
                  <TornPaperStory index={i} label="The fix, in your world" text={m.fix_analogy} />
                </div>

                <p className="mt-5 rounded border border-cyan-300/40 bg-cyan-300/10 px-4 py-3 text-sm">
                  Rule: {m.rule}
                </p>

                {m.concepts.length > 0 && (
                  <p className="mt-4 text-sm text-white/70">
                    Study:{" "}
                    {m.concepts.map((c, k) => (
                      <span key={c.id}>
                        {k > 0 ? ", " : ""}
                        <Link href={`/analogy/${c.id}`} className="text-cyan-300 hover:underline">
                          {c.title}
                        </Link>
                      </span>
                    ))}
                  </p>
                )}
              </article>
            ))}
          </div>
          <p className="mt-6 text-xs text-white/60">
            AI generated. Confirm facts on Microsoft Learn before relying on them.
          </p>
        </div>
      )}
    </section>
  );
}