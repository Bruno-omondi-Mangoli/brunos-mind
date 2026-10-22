import { describe, expect, it } from "vitest";
import { nextState, pickDue, priority, type CardState } from "../lib/leitner";

const NOW = new Date("2026-10-22T09:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function card(box: number, lapses: number, dueOffsetDays: number): CardState {
  return { box, lapses, streak: 0, dueAt: new Date(NOW.getTime() + dueOffsetDays * DAY) };
}

describe("nextState", () => {
  it("moves a new card to box 2 and schedules it for tomorrow", () => {
    const s = nextState(null, true, NOW);
    expect(s.box).toBe(2);
    expect(s.streak).toBe(1);
    expect(s.dueAt.getTime() - NOW.getTime()).toBe(DAY);
  });

  it("never goes above box 5 and waits 14 days there", () => {
    const s = nextState(card(5, 0, 0), true, NOW);
    expect(s.box).toBe(5);
    expect(s.dueAt.getTime() - NOW.getTime()).toBe(14 * DAY);
  });

  it("sends a missed card back to box 1, adds a lapse and returns in 10 minutes", () => {
    const s = nextState(card(4, 1, 0), false, NOW);
    expect(s.box).toBe(1);
    expect(s.lapses).toBe(2);
    expect(s.streak).toBe(0);
    expect(s.dueAt.getTime() - NOW.getTime()).toBe(10 * 60 * 1000);
  });
});

describe("priority and pickDue", () => {
  it("ranks a card with more lapses and a lower box higher", () => {
    expect(priority(card(1, 3, -1), NOW)).toBeGreaterThan(priority(card(3, 0, -1), NOW));
  });

  it("returns only due cards, weakest first, and respects the limit", () => {
    const strong = card(3, 0, -1);
    const weak = card(1, 3, -1);
    const future = card(2, 0, 2);
    const list = [strong, weak, future];
    const picked = pickDue(list, 10, NOW);
    expect(picked).toHaveLength(2);
    expect(picked[0]).toBe(weak);
    expect(pickDue(list, 1, NOW)).toEqual([weak]);
  });
});