"use client";

import { useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const PROMPTS = {
  en: ["Explain it another way", "Give me a real life example", "Ask me one question about it"],
  sw: ["Nieleze kwa njia nyingine", "Nipe mfano wa maisha halisi", "Niulize swali moja kuhusu hili"],
};

export default function ConceptTutor({
  conceptTitle,
  worldId,
  lang,
}: {
  conceptTitle: string;
  worldId: string;
  lang: "en" | "sw";
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
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
          messages: history.slice(-8).map((m) =>
            m.role === "user" ? { role: m.role, content: `About ${conceptTitle}: ${m.content}` } : m
          ),
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
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: acc }]);
      }
      if (!acc.trim()) {
        setMessages(history);
        setError("No answer came back. Please try again.");
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

  return (
    <div className="rounded-lg border border-white/20 bg-white/5 p-5">
      <h3 className="font-semibold">Ask your tutor about {conceptTitle}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {PROMPTS[lang].map((p) => (
          <button
            key={p}
            type="button"
            disabled={busy}
            onClick={() => send(p)}
            className="rounded border border-white/20 px-3 py-1 text-sm text-white/80 hover:bg-white/10 disabled:opacity-40"
          >
            {p}
          </button>
        ))}
      </div>

      <div role="log" aria-live="polite" className="mt-4 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-lg bg-cyan-400 px-4 py-2 text-black"
                : "max-w-[95%] rounded-lg border border-white/15 bg-black/30 px-4 py-2"
            }
          >
            {m.content === "" ? (
              <span className="text-sm text-white/60">Thinking...</span>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      <div className="mt-4 flex gap-3">
        <label htmlFor="tutorMsg" className="sr-only">
          Your question
        </label>
        <input
          id="tutorMsg"
          value={input}
          maxLength={400}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send(input);
          }}
          placeholder={lang === "sw" ? "Uliza swali lako..." : "Ask your own question..."}
          className="flex-1 rounded border border-white/20 bg-white/5 px-3 py-2"
        />
        {busy ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="rounded border border-white/30 px-4 py-2 text-sm"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            disabled={!input.trim()}
            onClick={() => send(input)}
            className="rounded bg-cyan-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
          >
            Send
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-white/40">AI can make mistakes. Confirm facts on Microsoft Learn.</p>
    </div>
  );
}