"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Concept = { id: string; title: string };
type QOption = { id: string; text: string; correct: boolean; explanation: string };
type QItem = {
  id: string;
  concept_id: string;
  stem: string;
  options: QOption[];
  difficulty: number;
  status: string;
  ai_checked: boolean;
  check_note: string | null;
};
type Stats = { total: number; approved: number; draft: number; reviewed: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(path: string, key: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", "x-admin-key": key },
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, json };
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [queue, setQueue] = useState<QItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const stopRef = useRef(false);

  useEffect(() => {
    try {
      const k = sessionStorage.getItem("adminKey");
      if (k) setKey(k);
    } catch {
      /* storage unavailable */
    }
    createClient()
      .from("concepts")
      .select("id, title")
      .order("sort_order")
      .then(({ data }) => setConcepts((data ?? []) as Concept[]));
  }, []);

  function onKeyChange(v: string) {
    setKey(v);
    try {
      sessionStorage.setItem("adminKey", v);
    } catch {
      /* storage unavailable */
    }
  }

  function addLog(msg: string) {
    setLog((prev) => [...prev.slice(-14), msg]);
  }

  async function loadQueue() {
    setError("");
    const r = await api("/api/admin/questions", key);
    if (!r.ok) {
      setError(String(r.json.error ?? r.status));
      return;
    }
    setQueue(r.json.items as QItem[]);
    setStats(r.json.stats as Stats);
  }

  async function act(id: string, action: "approve" | "reject") {
    const r = await api("/api/admin/questions", key, {
      method: "POST",
      body: JSON.stringify({ id, action }),
    });
    if (!r.ok) {
      setError(String(r.json.error ?? r.status));
      return;
    }
    setQueue((q) => q.filter((x) => x.id !== id));
  }

  async function runOne(conceptId: string, kind: "questions" | "lesson"): Promise<string> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const r = await api("/api/admin/generate", key, {
        method: "POST",
        body: JSON.stringify({ conceptId, kind }),
      });
      if (r.ok) {
        const detail = r.json.detail ? " (" + String(r.json.detail) + ")" : "";
        return String(r.json.status ?? "ok") + detail;
      }
      const msg = String(r.json.error ?? r.status);
      if (msg === "Unauthorized") return "failed: Unauthorized";
      if (msg.includes("429") || r.status === 504) {
        addLog("Rate limited, waiting 30 seconds...");
        await sleep(30000);
        continue;
      }
      if (r.status === 422) {
        await sleep(2000);
        continue;
      }
      return "failed: " + msg;
    }
    return "failed: gave up after retries";
  }

  async function generateAll() {
    if (!key) {
      setError("Enter the admin key first.");
      return;
    }
    setError("");
    setRunning(true);
    stopRef.current = false;
    for (let i = 0; i < concepts.length; i++) {
      if (stopRef.current) break;
      const c = concepts[i];
      const q = await runOne(c.id, "questions");
      addLog(`${i + 1}/${concepts.length} ${c.title} questions: ${q}`);
      if (q.includes("Unauthorized")) {
        setError("Wrong admin key.");
        break;
      }
      if (stopRef.current) break;
      const l = await runOne(c.id, "lesson");
      addLog(`${i + 1}/${concepts.length} ${c.title} lesson: ${l}`);
      await sleep(1500);
    }
    addLog("Finished or stopped.");
    setRunning(false);
    await loadQueue();
  }

  const conceptTitle = (id: string) => concepts.find((c) => c.id === id)?.title ?? id;

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">Admin</h1>
      <p className="mt-1 text-sm text-white/60">Content pipeline. Run this on localhost only.</p>

      <label className="mt-6 block text-sm text-white/70" htmlFor="adminKey">
        Admin key
      </label>
      <input
        id="adminKey"
        type="password"
        value={key}
        onChange={(e) => onKeyChange(e.target.value)}
        className="mt-1 w-full rounded border border-white/20 bg-white/5 px-3 py-2 font-mono text-sm"
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={running || concepts.length === 0}
          onClick={generateAll}
          className="rounded bg-cyan-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          Generate all missing content
        </button>
        <button
          type="button"
          disabled={!running}
          onClick={() => {
            stopRef.current = true;
          }}
          className="rounded border border-white/30 px-4 py-2 text-sm disabled:opacity-40"
        >
          Stop after this step
        </button>
        <button
          type="button"
          onClick={loadQueue}
          className="rounded border border-white/30 px-4 py-2 text-sm"
        >
          Load review queue
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      {log.length > 0 && (
        <pre className="mt-4 overflow-x-auto rounded border border-white/10 bg-white/5 p-3 text-xs text-white/70">
          {log.join("\n")}
        </pre>
      )}

      {stats && (
        <p className="mt-6 font-mono text-xs uppercase tracking-widest text-white/60">
          AI questions {stats.total} | approved {stats.approved} | draft {stats.draft} | human reviewed{" "}
          {stats.reviewed}
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-4">
        {queue.map((q) => (
          <li key={q.id} className="rounded border border-white/15 bg-white/5 p-4">
            <p className="font-mono text-xs uppercase tracking-widest text-white/50">
              {conceptTitle(q.concept_id)} | level {q.difficulty} |{" "}
              {q.status === "draft" ? "FLAGGED" : q.ai_checked ? "AI checked" : q.status}
            </p>
            <p className="mt-2 font-semibold">{q.stem}</p>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {q.options.map((o) => (
                <li key={o.id} className={o.correct ? "text-emerald-300" : "text-white/70"}>
                  {o.id.toUpperCase()}. {o.text} {o.correct ? "(correct)" : ""}
                  <span className="block pl-5 text-xs text-white/50">{o.explanation}</span>
                </li>
              ))}
            </ul>
            {q.check_note && <p className="mt-2 text-xs text-amber-300">Checker note: {q.check_note}</p>}
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => act(q.id, "approve")}
                className="rounded bg-emerald-300 px-3 py-1 text-sm font-semibold text-black"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => act(q.id, "reject")}
                className="rounded border border-rose-300 px-3 py-1 text-sm text-rose-300"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}