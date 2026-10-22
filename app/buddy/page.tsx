"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import LangToggle from "@/components/LangToggle";

type Related = { id: string; title: string };
type Msg = { role: "user" | "assistant"; content: string; related?: Related[] };
type World = { id: string; name: string };

const STARTERS: Record<"en" | "sw", string[]> = {
  en: [
    "Explain IaaS, PaaS and SaaS",
    "What is an availability zone?",
    "Why do we need RBAC?",
    "What is the difference between Azure Policy and a resource lock?",
  ],
  sw: [
    "Nieleze IaaS, PaaS na SaaS",
    "Availability zone ni nini?",
    "Kwa nini tunahitaji RBAC?",
    "Tofauti kati ya Azure Policy na resource lock ni ipi?",
  ],
};

export default function BuddyPage() {
  const { worldId, lang, setLang, setWorld, ready } = useProfile();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createClient()
      .from("worlds")
      .select("id, name")
      .order("sort_order")
      .then(({ data }) => setWorlds((data ?? []) as World[]));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    if (content.length > 500) {
      setError("Keep your message under 500 characters.");
      return;
    }
    setError("");
    setInput("");

    const history: Msg[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/ai/buddy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history
            .filter((m) => m.content.trim().length > 0)
            .slice(-8)
            .map((m) => ({ role: m.role, content: m.content })),
          lang,
          worldId,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({ error: "Request failed" }))) as { error?: string };
        setMessages(history);
        setError(j.error ?? "Request failed");
        return;
      }

      let related: Related[] = [];
      try {
        related = JSON.parse(decodeURIComponent(res.headers.get("x-concepts") ?? "[]")) as Related[];
      } catch {
        related = [];
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: acc, related }]);
      }
      if (!acc.trim()) {
        setMessages(history);
        setError("The buddy returned no answer. Please try again.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages(history);
        setError("Connection problem. Please try again.");
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  if (!ready) return <p className="p-8 text-white/60">Loading...</p>;

  const last = messages[messages.length - 1];
  const thinking = busy && last?.role === "assistant" && last.content === "";

  return (
    <section className="mx-auto flex max-w-2xl flex-col px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Study Buddy</h1>
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <p className="mt-2 text-sm text-white/60">
        Ask about any AZ-900 concept. Bruno explains with a story from your world first, then the exam wording.
      </p>

      <div className="mt-4 flex items-center gap-3 text-sm">
        <label htmlFor="world" className="text-white/60">
          World
        </label>
        <select
          id="world"
          value={worldId}
          onChange={(e) => setWorld(e.target.value)}
          className="rounded border border-white/20 bg-black px-3 py-1"
        >
          {worlds.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="mt-6 flex min-h-[18rem] flex-col gap-4"
      >
        {messages.length === 0 && (
          <div className="rounded-lg border border-white/15 bg-white/5 p-5">
            <p className="text-white/80">Try one of these:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STARTERS[lang].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded border border-white/20 px-3 py-1 text-left text-sm text-white/80 hover:bg-white/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-lg bg-cyan-400 px-4 py-3 text-black"
                : "max-w-[92%] rounded-lg border border-white/20 bg-white/5 px-4 py-3 backdrop-blur-xl"
            }
          >
            {m.role === "assistant" && m.content === "" ? (
              <span className="text-sm text-white/60">{thinking ? "Thinking..." : ""}</span>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            )}
            {m.role === "assistant" && m.related && m.related.length > 0 && !busy && (
              <p className="mt-3 border-t border-white/15 pt-2 text-xs text-white/60">
                Study notes:{" "}
                {m.related.map((r, k) => (
                  <span key={r.id}>
                    {k > 0 ? ", " : ""}
                    <Link href={`/analogy/${r.id}`} className="text-cyan-300 hover:underline">
                      {r.title}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      <div className="mt-4 flex gap-3">
        <label htmlFor="msg" className="sr-only">
          Your question
        </label>
        <textarea
          id="msg"
          rows={2}
          value={input}
          maxLength={500}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={lang === "sw" ? "Uliza swali kuhusu Azure..." : "Ask about an Azure concept..."}
          className="flex-1 resize-none rounded border border-white/20 bg-white/5 px-3 py-2"
        />
        {busy ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="self-end rounded border border-white/30 px-4 py-2 text-sm"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={() => send(input)}
            disabled={!input.trim()}
            className="self-end rounded bg-cyan-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            Send
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-white/60">
        AI can make mistakes. Confirm facts on Microsoft Learn. Unofficial study tool.
      </p>
    </section>
  );
}