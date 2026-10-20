import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatJson } from "@/lib/ai/provider";
import { questionBatchSchema, checkSchema, lessonSchema } from "@/lib/ai/contentSchemas";
import {
  QUESTION_SYSTEM,
  buildQuestionUser,
  CHECK_SYSTEM,
  buildCheckUser,
  LESSON_SYSTEM,
  buildLessonUser,
} from "@/lib/ai/contentPrompts";

export const maxDuration = 60;

type Admin = ReturnType<typeof createAdminClient>;
type Concept = { id: string; title: string; official_summary: string };

async function makeQuestions(admin: Admin, concept: Concept) {
  const { count } = await admin
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("concept_id", concept.id)
    .eq("source", "ai")
    .neq("status", "rejected");
  if ((count ?? 0) >= 5) return NextResponse.json({ status: "skipped" });

  const raw = await chatJson(QUESTION_SYSTEM, buildQuestionUser(concept, 5));
  const parsed = questionBatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "AI output failed validation, try again" }, { status: 422 });
  }
  const qs = parsed.data.questions;

  const checks = new Map<number, { verdict: string; confidence: string; issue: string }>();
  try {
    const rawCheck = await chatJson(CHECK_SYSTEM, buildCheckUser(concept, qs));
    const pc = checkSchema.safeParse(rawCheck);
    if (pc.success) pc.data.results.forEach((r) => checks.set(r.index, r));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("429")) throw e;
  }

  const rows = qs.map((q, i) => {
    const c = checks.get(i);
    const pass = c?.verdict === "pass" && c.confidence !== "low";
    return {
      concept_id: concept.id,
      stem: q.stem,
      options: q.options,
      difficulty: q.difficulty,
      status: pass ? "approved" : "draft",
      ai_checked: pass,
      check_note: c ? c.issue : "Checker did not run",
      reviewed: false,
      source: "ai",
    };
  });

  const ins = await admin.from("questions").insert(rows);
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

  const approved = rows.filter((r) => r.status === "approved").length;
  return NextResponse.json({
    status: "generated",
    detail: `${approved} approved, ${rows.length - approved} draft`,
  });
}

async function makeLesson(admin: Admin, concept: Concept) {
  const { count } = await admin
    .from("concept_lessons")
    .select("*", { count: "exact", head: true })
    .eq("concept_id", concept.id)
    .eq("lang", "en");
  if ((count ?? 0) > 0) return NextResponse.json({ status: "skipped" });

  const raw = await chatJson(LESSON_SYSTEM, buildLessonUser(concept));
  const parsed = lessonSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "AI output failed validation, try again" }, { status: 422 });
  }
  if (parsed.data.confidence === "low") {
    return NextResponse.json({ error: "AI reported low confidence, lesson not saved" }, { status: 422 });
  }

  const d = parsed.data;
  const ins = await admin.from("concept_lessons").insert({
    concept_id: concept.id,
    lang: "en",
    summary: d.summary,
    key_points: d.key_points,
    exam_traps: d.exam_traps,
    remember: d.remember,
    reviewed: false,
  });
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
  return NextResponse.json({ status: "generated" });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { conceptId?: unknown; kind?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.conceptId !== "string" || (body.kind !== "questions" && body.kind !== "lesson")) {
    return NextResponse.json({ error: "conceptId and kind are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("concepts")
    .select("id, title, official_summary")
    .eq("id", body.conceptId)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Unknown concept" }, { status: 404 });
  const concept = data as Concept;

  try {
    return body.kind === "lesson" ? await makeLesson(admin, concept) : await makeQuestions(admin, concept);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}