import type { SupabaseClient } from "@supabase/supabase-js";

type Option = { id: string; text: string; correct: boolean; explanation: string };
type Question = { id: string; concept_id: string; options: Option[] };

const WEAK = ["shared-responsibility", "azure-policy", "availability-zones"];
const MIXED = ["rbac", "regions"];

export async function loadDemoLearner(supabase: SupabaseClient): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return "Not signed in yet. Wait a moment and press the button again.";

  const { count } = await supabase
    .from("attempts")
    .select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) return "Demo learner already loaded. Nothing changed.";

  const { data: questions, error } = await supabase
    .from("questions")
    .select("id, concept_id, options");
  if (error || !questions) return "Could not load questions: " + (error?.message ?? "unknown error");

  const now = Date.now();
  const attempts: Record<string, unknown>[] = [];
  const cards: Record<string, unknown>[] = [];

  for (const q of questions as Question[]) {
    const correct = q.options.find((o) => o.correct) ?? q.options[0];
    const wrong = q.options.find((o) => !o.correct) ?? q.options[0];

    let pattern: boolean[];
    let box: number;
    let lapses: number;
    if (WEAK.includes(q.concept_id)) {
      pattern = [false, false, true, false];
      box = 1;
      lapses = 3;
    } else if (MIXED.includes(q.concept_id)) {
      pattern = [false, true, false, true];
      box = 2;
      lapses = 2;
    } else {
      pattern = [true, true, true, true];
      box = 4;
      lapses = 0;
    }

    pattern.forEach((ok, i) => {
      attempts.push({
        user_id: uid,
        question_id: q.id,
        concept_id: q.concept_id,
        chosen_option: ok ? correct.id : wrong.id,
        is_correct: ok,
        created_at: new Date(now - (pattern.length - i) * 3600000).toISOString(),
      });
    });

    cards.push({
      user_id: uid,
      concept_id: q.concept_id,
      box,
      lapses,
      streak: pattern[pattern.length - 1] ? 1 : 0,
      due_at: new Date(now - 3600000).toISOString(),
    });
  }

  const a = await supabase.from("attempts").insert(attempts);
  if (a.error) return "Could not save attempts: " + a.error.message;
  const c = await supabase.from("card_states").upsert(cards, { onConflict: "user_id,concept_id" });
  if (c.error) return "Could not save cards: " + c.error.message;

  return "Demo learner loaded: " + attempts.length + " attempts and " + cards.length + " cards.";
}