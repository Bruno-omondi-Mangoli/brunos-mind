import { z } from "zod";

const level = z.object({
  analogy: z.string().min(20).max(700),
  plain: z.string().min(10).max(300),
  exam: z.string().min(20).max(600),
});

export const analogySchema = z.object({
  en: level,
  sw: level,
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string().max(300).optional(),
});

export type AnalogyOutput = z.infer<typeof analogySchema>;