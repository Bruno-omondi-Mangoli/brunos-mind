import { describe, expect, it } from "vitest";
import { conceptMastery, readiness, scoreLabel, type ConceptStats } from "../lib/readiness";

function stat(conceptId: string, areaId: string, over: Partial<ConceptStats> = {}): ConceptStats {
  return {
    conceptId,
    areaId,
    recent: [true, true, true, true, true],
    box: 5,
    gameRatio: 1,
    ...over,
  };
}

describe("conceptMastery", () => {
  it("is 0 with no attempts, box 1 and no game", () => {
    expect(conceptMastery({ conceptId: "x", areaId: "a", recent: [], box: 1, gameRatio: null })).toBe(0);
  });

  it("is 1 with perfect answers, box 5 and a perfect game", () => {
    expect(conceptMastery(stat("x", "a"))).toBeCloseTo(1);
  });

  it("weights recent answers more than old ones", () => {
    const improving = conceptMastery(stat("x", "a", { recent: [false, false, false, false, true], box: 1, gameRatio: null }));
    const slipping = conceptMastery(stat("x", "a", { recent: [true, false, false, false, false], box: 1, gameRatio: null }));
    expect(improving).toBeGreaterThan(slipping);
  });
});

describe("readiness", () => {
  const areas = [
    { id: "a", weight: 50, totalConcepts: 2 },
    { id: "b", weight: 50, totalConcepts: 2 },
  ];

  it("scores 50 when one of two equal areas is perfect and the other untouched", () => {
    const r = readiness(areas, [stat("a1", "a"), stat("a2", "a")]);
    expect(r.overall).toBe(50);
    expect(r.coverage).toBe(0.5);
    expect(r.lowConfidence).toBe(false);
  });

  it("flags low confidence when under half of the concepts were tried", () => {
    const r = readiness(areas, [stat("a1", "a")]);
    expect(r.overall).toBe(25);
    expect(r.lowConfidence).toBe(true);
  });

  it("normalises weights that do not add up to 100", () => {
    const r = readiness(
      [
        { id: "a", weight: 30, totalConcepts: 1 },
        { id: "b", weight: 30, totalConcepts: 1 },
      ],
      [stat("a1", "a"), stat("b1", "b")]
    );
    expect(r.overall).toBe(100);
  });
});

describe("scoreLabel", () => {
  it("maps scores to labels", () => {
    expect(scoreLabel(10)).toBe("Early days");
    expect(scoreLabel(55)).toBe("Building");
    expect(scoreLabel(90)).toBe("Strong");
  });
});