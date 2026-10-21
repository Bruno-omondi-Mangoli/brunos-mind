import type { SupabaseClient } from "@supabase/supabase-js";
import { readiness, type ConceptStats } from "@/lib/readiness";

export type MasteryData = {
  areas: { id: string; title: string; weight: number; count: number }[];
  concepts: { id: string; title: string; areaId: string }[];
  mastery: Record<string, number>;
  overall: number;
};

export async function loadMastery(supabase: SupabaseClient, userId: string): Promise<MasteryData> {
  const [ar, cs, at, st, gs] = await Promise.all([
    supabase.from("skill_areas").select("id, title, weight_percent, sort_order").order("sort_order"),
    supabase.from("concepts").select("id, title, skill_area_id").order("sort_order"),
    supabase
      .from("attempts")
      .select("concept_id, is_correct, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase.from("card_states").select("concept_id, box").eq("user_id", userId),
    supabase.from("game_sessions").select("concept_ids, score, max_score").eq("user_id", userId),
  ]);
  const err = ar.error ?? cs.error ?? at.error ?? st.error ?? gs.error;
  if (err) throw new Error(err.message);

  const concepts = (cs.data ?? []).map((c) => ({
    id: c.id as string,
    title: c.title as string,
    areaId: c.skill_area_id as string,
  }));
  const areas = (ar.data ?? []).map((a) => ({
    id: a.id as string,
    title: a.title as string,
    weight: Number(a.weight_percent),
    count: concepts.filter((c) => c.areaId === a.id).length,
  }));

  const recent: Record<string, boolean[]> = {};
  (at.data ?? []).forEach((r) => {
    const id = r.concept_id as string;
    (recent[id] ??= []).push(r.is_correct as boolean);
  });
  const boxes: Record<string, number> = {};
  (st.data ?? []).forEach((r) => {
    boxes[r.concept_id as string] = r.box as number;
  });
  const gameSum: Record<string, number> = {};
  const gameCnt: Record<string, number> = {};
  (gs.data ?? []).forEach((r) => {
    const ratio = (r.score as number) / Math.max(1, r.max_score as number);
    ((r.concept_ids ?? []) as string[]).forEach((id) => {
      gameSum[id] = (gameSum[id] ?? 0) + ratio;
      gameCnt[id] = (gameCnt[id] ?? 0) + 1;
    });
  });

  const stats: ConceptStats[] = concepts.map((c) => ({
    conceptId: c.id,
    areaId: c.areaId,
    recent: (recent[c.id] ?? []).slice(-5),
    box: boxes[c.id] ?? 1,
    gameRatio: gameCnt[c.id] ? gameSum[c.id] / gameCnt[c.id] : null,
  }));

  const result = readiness(
    areas.map((a) => ({ id: a.id, weight: a.weight, totalConcepts: a.count })),
    stats
  );
  return { areas, concepts, mastery: result.mastery, overall: result.overall };
}