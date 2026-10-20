"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadDemoLearner } from "@/lib/demo";

const TABLES = [
  "skill_areas",
  "worlds",
  "concepts",
  "concept_explanations",
  "questions",
  "attempts",
  "card_states",
  "game_sessions",
] as const;

export default function StatusPage() {
  const [userId, setUserId] = useState("waiting");
  const [counts, setCounts] = useState<Record<string, number | string>>({});
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const supabase = createClient();
    let uid: string | null = null;
    for (let i = 0; i < 10 && !uid; i++) {
      const { data } = await supabase.auth.getSession();
      uid = data.session?.user.id ?? null;
      if (!uid) await new Promise((r) => setTimeout(r, 500));
    }
    setUserId(uid ?? "no session (is anonymous sign in enabled?)");

    const next: Record<string, number | string> = {};
    for (const t of TABLES) {
      const { count, error } = await supabase
        .from(t)
        .select("*", { count: "exact", head: true });
      next[t] = error ? "error: " + error.message : (count ?? 0);
    }
    setCounts(next);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onLoadDemo() {
    setMessage("Loading...");
    const supabase = createClient();
    const result = await loadDemoLearner(supabase);
    setMessage(result);
    await refresh();
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold">System status</h1>
      <p className="mt-2 break-all font-mono text-xs text-white/60">User id: {userId}</p>

      <ul className="mt-6 divide-y divide-white/10 rounded border border-white/10">
        {TABLES.map((t) => (
          <li key={t} className="flex justify-between px-4 py-2 font-mono text-sm">
            <span>{t}</span>
            <span>{String(counts[t] ?? "...")}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onLoadDemo}
          className="rounded bg-cyan-400 px-4 py-2 text-sm font-semibold text-black"
        >
          Load demo learner
        </button>
        <button
          onClick={refresh}
          className="rounded border border-white/30 px-4 py-2 text-sm"
        >
          Refresh
        </button>
      </div>
      {message && <p className="mt-4 text-sm text-white/80">{message}</p>}
    </section>
  );
}