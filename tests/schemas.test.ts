import { describe, expect, it } from "vitest";
import { questionSchema } from "../lib/ai/contentSchemas";

function option(id: string, correct: boolean) {
  return {
    id,
    text: `Option ${id}`,
    correct,
    explanation: "This explanation is long enough to pass validation.",
  };
}

const stem = "A team wants colleagues to edit a server but never delete it. What should they use?";

describe("questionSchema", () => {
  it("accepts four options with exactly one correct", () => {
    const q = {
      stem,
      difficulty: 2,
      options: [option("a", true), option("b", false), option("c", false), option("d", false)],
    };
    expect(questionSchema.safeParse(q).success).toBe(true);
  });

  it("rejects two correct options", () => {
    const q = {
      stem,
      difficulty: 2,
      options: [option("a", true), option("b", true), option("c", false), option("d", false)],
    };
    expect(questionSchema.safeParse(q).success).toBe(false);
  });

  it("rejects fewer than four options", () => {
    const q = { stem, difficulty: 2, options: [option("a", true), option("b", false), option("c", false)] };
    expect(questionSchema.safeParse(q).success).toBe(false);
  });

  it("rejects a difficulty outside 1 to 3", () => {
    const q = {
      stem,
      difficulty: 5,
      options: [option("a", true), option("b", false), option("c", false), option("d", false)],
    };
    expect(questionSchema.safeParse(q).success).toBe(false);
  });
});