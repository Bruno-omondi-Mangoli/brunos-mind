import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatJson } from "@/lib/ai/provider";
import { diagnoseSchema } from "@/lib/ai/coachSchemas";
import { DIAGNOSE_SYSTEM, buildDiagnoseUser } from "@/lib/ai/coachPrompts";

export const maxDuration = 60;

type Opt = { id: string; text: string; correct: boolean };

export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const uid = auth.user.id;

  const prof = await supabase
    .from("profiles")
    .select("world_id, lang")
    .eq("user_id", uid)
    .maybeSingle();
  const worldId = (prof.data?.world_id as string | undefined) ?? "matatu";
  const lang = prof.data?.lang === "sw" ? "sw" : "en";

  const att = await supabase
    .from("attempts")
    .select("question_id, concept_id, chosen_option")
    .eq("user_id", uid)
    .eq("is_correct", false)
    .order("created_at", { ascending: false })
    .limit(15);
  if (att.error) return NextResponse.json({ error: att.error.message }, { status: 500 });
  const wrong = att.data ?? [];
  if (wrong.length < 3) {
    return NextResponse.json(
      { error: "Not enough wrong answers yet. Take a quiz first, or load the demo learner on the Readiness page." },
      { status: 400 }
    );
  }

  const qIds = Array.from(new Set(wrong.map((w) => w.question_id as string)));
  const cIds = Array.from(new Set(wrong.map((w) => w.concept_id as string)));
  const [qs, cs, w] = await Promise.all([
    supabase.from("questions").select("id, stem, options").in("id", qIds),
    supabase.from("concepts").select("id, title").in("id", cIds),
    supabase.from("worlds").select("name, description").eq("id", worldId).maybeSingle(),
  ]);
  if (qs.error || cs.error) {
    return NextResponse.json({ error: (qs.error ?? cs.error)!.message }, { status: 500 });
  }

  const titles = new Map((cs.data ?? []).map((c) => [c.id as string, c.title as string]));
  const evidence: Record<string, string>[] = [];
  wrong.forEach((row) => {
    const q = (qs.data ?? []).find((x) => x.id === row.question_id);
    if (!q) return;
    const opts = q.options as Opt[];
    const chosen = opts.find((o) => o.id === row.chosen_option);
    const correct = opts.find((o) => o.correct);
    if (!chosen || !correct) return;
    evidence.push({
      conceptId: row.concept_id as string,
      concept: titles.get(row.concept_id as string) ?? (row.concept_id as string),
      question: q.stem as string,
      learnerChose: chosen.text,
      correctAnswer: correct.text,
    });
  });
  if (evidence.length < 3) {
    return NextResponse.json({ error: "Not enough usable answers yet." }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await chatJson(
      DIAGNOSE_SYSTEM,
      buildDiagnoseUser({
        worldName: (w.data?.name as string | undefined) ?? "Matatu Routes",
        worldDescription: (w.data?.description as string | undefined) ?? "Routes, stages, fares and saccos",
        lang,
        evidence,
      })
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI call failed" }, { status: 502 });
  }

  const parsed = diagnoseSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "AI output failed validation, try again" }, { status: 422 });
  }

  const items = parsed.data.misconceptions.map((m) => ({
    misconception: m.misconception,
    why_it_is_wrong: m.why_it_is_wrong,
    fix_analogy: m.fix_analogy,
    rule: m.rule,
    confidence: m.confidence,
    concepts: m.concept_ids
      .filter((id) => titles.has(id))
      .map((id) => ({ id, title: titles.get(id) as string })),
  }));

  return NextResponse.json({ summary: parsed.data.summary, items, basedOn: evidence.length });
}