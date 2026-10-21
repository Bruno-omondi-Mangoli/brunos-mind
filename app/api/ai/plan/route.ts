import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatJson } from "@/lib/ai/provider";
import { coachSchema } from "@/lib/ai/coachSchemas";
import { COACH_SYSTEM, buildCoachUser } from "@/lib/ai/coachPrompts";

export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { daysLeft?: unknown; weeklyHours?: unknown; weeks?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const daysLeft = Number(body.daysLeft);
  const weeklyHours = Number(body.weeklyHours);
  if (!Number.isFinite(daysLeft) || !Number.isFinite(weeklyHours) || !Array.isArray(body.weeks)) {
    return NextResponse.json({ error: "daysLeft, weeklyHours and weeks are required" }, { status: 400 });
  }

  const weeks = (body.weeks as { week?: unknown; concepts?: unknown }[])
    .slice(0, 6)
    .map((w, i) => ({
      week: i + 1,
      concepts: Array.isArray(w.concepts)
        ? (w.concepts as unknown[]).filter((c): c is string => typeof c === "string").slice(0, 12).map((c) => c.slice(0, 80))
        : [],
    }));

  const prof = await supabase
    .from("profiles")
    .select("lang")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const lang = prof.data?.lang === "sw" ? "sw" : "en";

  let raw: unknown;
  try {
    raw = await chatJson(COACH_SYSTEM, buildCoachUser({ daysLeft, weeklyHours, lang, weeks }));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI call failed" }, { status: 502 });
  }

  const parsed = coachSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "AI output failed validation, try again" }, { status: 422 });
  }
  return NextResponse.json({ coach: parsed.data });
}