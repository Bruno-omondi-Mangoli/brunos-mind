import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatJson } from "@/lib/ai/provider";
import { analogySchema } from "@/lib/ai/schemas";
import { ANALOGY_SYSTEM, buildAnalogyUser } from "@/lib/ai/prompts";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { conceptId?: unknown; worldId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.conceptId !== "string" || typeof body.worldId !== "string") {
    return NextResponse.json({ error: "conceptId and worldId are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const admin = createAdminClient();
  const [c, w, existing] = await Promise.all([
    admin
      .from("concepts")
      .select("id, title, official_summary")
      .eq("id", body.conceptId)
      .maybeSingle(),
    admin
      .from("worlds")
      .select("id, name, description")
      .eq("id", body.worldId)
      .maybeSingle(),
    admin
      .from("concept_explanations")
      .select("lang")
      .eq("concept_id", body.conceptId)
      .eq("world_id", body.worldId),
  ]);

  if (!c.data || !w.data) {
    return NextResponse.json({ error: "Unknown concept or world" }, { status: 404 });
  }

  const langs = new Set((existing.data ?? []).map((r) => r.lang as string));
  if (langs.has("en") && langs.has("sw")) {
    return NextResponse.json({ status: "cached" });
  }

  let raw: unknown;
  try {
    raw = await chatJson(
      ANALOGY_SYSTEM,
      buildAnalogyUser({
        conceptTitle: c.data.title as string,
        officialSummary: c.data.official_summary as string,
        worldName: w.data.name as string,
        worldDescription: w.data.description as string,
      })
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI call failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const parsed = analogySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "AI output failed validation, try again" }, { status: 422 });
  }
  if (parsed.data.confidence === "low") {
    return NextResponse.json(
      { error: "AI reported low confidence, nothing was saved" },
      { status: 422 }
    );
  }

  const out = parsed.data;
  const rows = (["en", "sw"] as const).map((l) => ({
    concept_id: c.data!.id as string,
    world_id: w.data!.id as string,
    lang: l,
    analogy: out[l].analogy,
    plain: out[l].plain,
    exam: out[l].exam,
    reviewed: false,
  }));

  const ins = await admin
    .from("concept_explanations")
    .upsert(rows, { onConflict: "concept_id,world_id,lang", ignoreDuplicates: true });
  if (ins.error) {
    return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "generated", confidence: out.confidence });
}