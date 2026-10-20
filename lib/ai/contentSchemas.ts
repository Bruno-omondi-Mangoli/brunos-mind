import { z } from "zod";

const option = z.object({
  id: z.enum(["a", "b", "c", "d"]),
  text: z.string().min(1).max(250),
  correct: z.boolean(),
  explanation: z.string().min(10).max(350),
});

export const questionSchema = z
  .object({
    stem: z.string().min(20).max(500),
    difficulty: z.number().int().min(1).max(3),
    options: z.array(option).length(4),
  })
  .refine((q) => q.options.filter((o) => o.correct).length === 1, {
    message: "Exactly one option must be correct",
  });

export const questionBatchSchema = z.object({
  questions: z.array(questionSchema).min(3).max(6),
});

export const checkSchema = z.object({
  results: z.array(
    z.object({
      index: z.number().int(),
      verdict: z.enum(["pass", "flag"]),
      confidence: z.enum(["high", "medium", "low"]),
      issue: z.string().max(300),
    })
  ),
});

export const lessonSchema = z.object({
  summary: z.string().min(30).max(600),
  key_points: z.array(z.string().min(5).max(300)).min(3).max(7),
  exam_traps: z.array(z.string().min(5).max(300)).min(2).max(5),
  remember: z.string().min(5).max(300),
  confidence: z.enum(["high", "medium", "low"]),
});