import { z } from "zod";

export const diagnoseSchema = z.object({
  misconceptions: z
    .array(
      z.object({
        misconception: z.string().min(10).max(300),
        why_it_is_wrong: z.string().min(10).max(500),
        fix_analogy: z.string().min(10).max(500),
        rule: z.string().min(5).max(250),
        concept_ids: z.array(z.string()).max(6),
        confidence: z.enum(["high", "medium", "low"]),
      })
    )
    .min(1)
    .max(3),
  summary: z.string().min(5).max(300),
});

export const coachSchema = z.object({
  headline: z.string().min(10).max(250),
  weekly_focus: z
    .array(
      z.object({
        week: z.number().int().min(1).max(6),
        focus: z.string().min(5).max(300),
        tip: z.string().min(5).max(300),
      })
    )
    .min(1)
    .max(6),
  exam_day_tips: z.array(z.string().min(5).max(250)).min(2).max(4),
});