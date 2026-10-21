import type { SupabaseClient } from "@supabase/supabase-js";
import { nextState, type CardState } from "@/lib/leitner";

export async function recordAnswer(
  supabase: SupabaseClient,
  userId: string,
  q: { id: string; concept_id: string },
  optionId: string,
  correct: boolean
): Promise<string> {
  const a = await supabase.from("attempts").insert({
    question_id: q.id,
    concept_id: q.concept_id,
    chosen_option: optionId,
    is_correct: correct,
  });
  const prev = await supabase
    .from("card_states")
    .select("box, lapses, streak, due_at")
    .eq("user_id", userId)
    .eq("concept_id", q.concept_id)
    .maybeSingle();
  const prevState: CardState | null = prev.data
    ? {
        box: prev.data.box as number,
        lapses: prev.data.lapses as number,
        streak: prev.data.streak as number,
        dueAt: new Date(prev.data.due_at as string),
      }
    : null;
  const next = nextState(prevState, correct);
  const c = await supabase.from("card_states").upsert(
    {
      user_id: userId,
      concept_id: q.concept_id,
      box: next.box,
      lapses: next.lapses,
      streak: next.streak,
      due_at: next.dueAt.toISOString(),
    },
    { onConflict: "user_id,concept_id" }
  );
  if (a.error || c.error) return "Could not save progress: " + (a.error?.message ?? c.error?.message);
  return "";
}