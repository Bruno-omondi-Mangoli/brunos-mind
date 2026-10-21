"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { LAYER_SORT, type Owner } from "@/data/games/layerSort";

const MAX = LAYER_SORT.reduce((t, r) => t + r.duties.length, 0);

export default function LayerSortPage() {
  const { userId } = useProfile();
  const [roundIdx, setRoundIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Owner>>({});
  const [checked, setChecked] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [saveNote, setSaveNote] = useState("");
  const savedRef = useRef(false);

  const round = LAYER_SORT[roundIdx];
  const allAnswered = round.duties.every((d) => answers[d.id]);
  const total = scores.reduce((t, s) => t + s, 0);

  function check() {
    const right = round.duties.filter((d) => answers[d.id] === d.owner).length;
    setScores((s) => [...s, right]);
    setChecked(true);
  }

  async function next() {
    if (roundIdx < LAYER_SORT.length - 1) {
      setRoundIdx((i) => i + 1);
      setAnswers({});
      setChecked(false);
      return;
    }
    setFinished(true);
    if (savedRef.current) return;
    savedRef.current = true;
    if (!userId) {
      setSaveNote("Score not saved (no session).");
      return;
    }
    const res = await createClient()
      .from("game_sessions")
      .insert({
        game: "layer_sort",
        concept_ids: ["iaas", "paas", "saas", "shared-responsibility"],
        score: total,
        max_score: MAX,
      });
    if (res.error) setSaveNote("Could not save score: " + res.error.message);
  }

  function restart() {
    setRoundIdx(0);
    setAnswers({});
    setChecked(false);
    setScores([]);
    setFinished(false);
    setSaveNote("");
    savedRef.current = false;
  }

  const btn = (active: boolean) =>
    "rounded border px-4 py-1 text-sm " +
    (active
      ? "border-cyan-300 bg-cyan-300 text-black"
      : "border-white/20 text-white/70 hover:bg-white/10");

  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/games" className="text-sm text-white/60 hover:text-white">
        Back to games
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Layer Sort</h1>
      <p className="mt-2 text-white/60">Who manages it: you, or Microsoft?</p>

      {!finished && (
        <div className="mt-6">
          <div className="flex justify-between font-mono text-xs uppercase tracking-widest text-white/50">
            <span>
              Round {roundIdx + 1} of {LAYER_SORT.length}
            </span>
            <span>Score {total}</span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold">{round.model}</h2>
          <p className="mt-1 text-sm text-white/60">{round.blurb}</p>

          <ul className="mt-6 flex flex-col gap-3">
            {round.duties.map((d) => {
              const a = answers[d.id];
              const correct = a === d.owner;
              return (
                <li
                  key={d.id}
                  className={
                    "rounded border p-4 " +
                    (!checked
                      ? "border-white/15 bg-white/5"
                      : correct
                      ? "border-emerald-300/60 bg-emerald-300/10"
                      : "border-rose-400/60 bg-rose-400/10")
                  }
                >
                  <p className="font-semibold">{d.text}</p>
                  <div role="group" aria-label={d.text} className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={checked}
                      aria-pressed={a === "you"}
                      onClick={() => setAnswers((s) => ({ ...s, [d.id]: "you" }))}
                      className={btn(a === "you")}
                    >
                      You
                    </button>
                    <button
                      type="button"
                      disabled={checked}
                      aria-pressed={a === "microsoft"}
                      onClick={() => setAnswers((s) => ({ ...s, [d.id]: "microsoft" }))}
                      className={btn(a === "microsoft")}
                    >
                      Microsoft
                    </button>
                  </div>
                  {checked && (
                    <p className="mt-3 text-sm text-white/80">
                      <span className="font-mono text-xs uppercase tracking-widest">
                        {correct ? "Correct" : "Answer: " + (d.owner === "you" ? "You" : "Microsoft")}
                      </span>
                      <span className="block">{d.why}</span>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-6">
            {!checked ? (
              <button
                type="button"
                disabled={!allAnswered}
                onClick={check}
                className="rounded bg-cyan-400 px-5 py-2 text-sm font-semibold text-black disabled:opacity-40"
              >
                Check answers
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className="rounded bg-cyan-400 px-5 py-2 text-sm font-semibold text-black"
              >
                {roundIdx < LAYER_SORT.length - 1 ? "Next model" : "See results"}
              </button>
            )}
          </div>
        </div>
      )}

      {finished && (
        <div className="mt-8 rounded-lg border border-white/20 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold">
            You scored {total} of {MAX}
          </h2>
          <p className="mt-3 text-sm text-white/70">
            Pattern to remember: data, accounts and devices are always yours. The physical layer is always
            Microsoft. The operating system moves from you in IaaS to Microsoft in PaaS and SaaS.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={restart}
              className="rounded bg-cyan-400 px-5 py-2 text-sm font-semibold text-black"
            >
              Play again
            </button>
            <Link href="/analogy/shared-responsibility" className="rounded border border-white/30 px-5 py-2 text-sm">
              Study this concept
            </Link>
          </div>
          {saveNote && <p className="mt-3 text-xs text-amber-300">{saveNote}</p>}
        </div>
      )}
    </section>
  );
}