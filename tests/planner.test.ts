import { describe, expect, it } from "vitest";
import { buildPlan } from "../lib/planner";

const concepts = ["A", "B", "C", "D", "E"].map((t, i) => ({
  id: `c${i}`,
  title: `Concept ${t}`,
  priority: 10 - i,
}));
const TODAY = new Date(2026, 9, 22);

describe("buildPlan errors", () => {
  it("rejects a date in the past", () => {
    expect("error" in buildPlan(concepts, "2020-01-01", 8, TODAY)).toBe(true);
  });

  it("rejects fewer than 3 hours per week", () => {
    expect("error" in buildPlan(concepts, "2026-11-05", 2, TODAY)).toBe(true);
  });

  it("rejects an invalid date string", () => {
    expect("error" in buildPlan(concepts, "soon", 8, TODAY)).toBe(true);
  });
});

describe("buildPlan schedule", () => {
  const result = buildPlan(concepts, "2026-11-05", 8, TODAY);

  it("builds a plan with a rest day, a final review day and an exam day", () => {
    if ("error" in result) throw new Error(result.error);
    expect(result.daysLeft).toBe(14);
    expect(result.days).toHaveLength(15);
    expect(result.days[6].kind).toBe("rest");
    expect(result.days[13].kind).toBe("final");
    expect(result.days[14].kind).toBe("exam");
  });

  it("starts the first study day with flashcards, then the highest priority concept", () => {
    if ("error" in result) throw new Error(result.error);
    const first = result.days[0];
    expect(first.tasks[0].type).toBe("flashcards");
    expect(first.tasks.some((t) => t.type === "learn" && t.conceptTitle === "Concept A")).toBe(true);
  });

  it("never schedules more minutes than the daily budget", () => {
    if ("error" in result) throw new Error(result.error);
    result.days
      .filter((d) => d.kind === "study")
      .forEach((d) => expect(d.minutes).toBeLessThanOrEqual(result.minutesPerDay));
  });

  it("shows only the first 42 days when the exam is far away", () => {
    const far = buildPlan(concepts, "2027-03-01", 8, TODAY);
    if ("error" in far) throw new Error(far.error);
    expect(far.truncated).toBe(true);
    expect(far.days).toHaveLength(42);
    expect(far.days.some((d) => d.kind === "exam")).toBe(false);
  });
});