import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openStream } from "@/lib/ai/stream";
import { buildBuddySystem } from "@/lib/ai/buddyPrompts";

export const maxDuration = 60;

const STOP = new Set([
  "the", "and", "for", "what", "how", "does", "are", "you", "with", "this", "that", "about",
  "explain", "between", "difference", "why", "can", "use", "used", "from", "have", "has",
  "not", "into", "which", "when", "who", "azure", "microsoft", "service", "services", "cloud",
  "tell", "please", "mean", "means", "need", "want", "know", "give", "example",
]);

function stem(w: string): string {
  return w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map(stem);
}

const hits = new Map<string, number[]>();

function limited(uid: string): boolean {
  const now = Date.now();
  const list = (hits.get(uid) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  if (list.length >= 15) {
    hits.set(uid, list);
    return true;
  }
  list.push(now);
  hits.set(uid, list);
  return false;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (limited(auth.user.id)) {
    return NextResponse.json({ error: "Slow down a little. Try again in a few minutes." }, { status: 429 });
  }

  let body: { messages?: unknown; lang?: unknown; worldId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(body.messages)) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const msgs = (body.messages as { role?: unknown; content?: unknown }[])
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-8)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: (m.content as string).slice(0, m.role === "user" ? 500 : 1200),
    }));
  if (msgs.length === 0 || msgs[msgs.length - 1].role !== "user") {
    return NextResponse.json({ error: "The last message must be from the learner" }, { status: 400 });
  }

  const lang = body.lang === "sw" ? "sw" : "en";
  const worldId = typeof body.worldId === "string" ? body.worldId : "matatu";

  const [w, cs] = await Promise.all([
    supabase.from("worlds").select("name, description").eq("id", worldId).maybeSingle(),
    supabase.from("concepts").select("id, title, official_summary"),
  ]);

  const query = new Set(
    tokens(
      msgs
        .filter((m) => m.role === "user")
        .slice(-2)
        .map((m) => m.content)
        .join(" ")
    )
  );
  const scored = (cs.data ?? [])
    .map((c) => {
      const t = new Set(tokens(c.title as string));
      const s = new Set(tokens(c.official_summary as string));
      let score = 0;
      query.forEach((q) => {
        if (t.has(q)) score += 3;
        else if (s.has(q)) score += 1;
      });
      return { id: c.id as string, title: c.title as string, summary: c.official_summary as string, score };
    })
    .filter((c) => c.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const system = buildBuddySystem({
    worldName: (w.data?.name as string | undefined) ?? "Matatu Routes",
    worldDescription: (w.data?.description as string | undefined) ?? "Routes, stages, fares and saccos",
    lang,
    grounding: scored.map((c) => ({ title: c.title, summary: c.summary })),
  });

  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await openStream([{ role: "system", content: system }, ...msgs]);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI call failed" }, { status: 502 });
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Concepts": encodeURIComponent(JSON.stringify(scored.map((c) => ({ id: c.id, title: c.title })))),
    },
  });
}