export type CardState = { box: number; lapses: number; streak: number; dueAt: Date };

const INTERVAL_DAYS = [0, 1, 3, 7, 14];

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

export function nextState(prev: CardState | null, correct: boolean, now: Date = new Date()): CardState {
  const box = prev?.box ?? 1;
  const lapses = prev?.lapses ?? 0;
  const streak = prev?.streak ?? 0;
  if (correct) {
    const nb = Math.min(box + 1, 5);
    return { box: nb, lapses, streak: streak + 1, dueAt: addDays(now, INTERVAL_DAYS[nb - 1]) };
  }
  return { box: 1, lapses: lapses + 1, streak: 0, dueAt: new Date(now.getTime() + 10 * 60 * 1000) };
}

export function priority(c: CardState, now: Date = new Date()): number {
  const overdueDays = Math.max(0, (now.getTime() - c.dueAt.getTime()) / 86400000);
  return overdueDays + c.lapses * 2 + (6 - c.box);
}

export function pickDue<T extends CardState>(cards: T[], limit: number, now: Date = new Date()): T[] {
  return cards
    .filter((c) => c.dueAt.getTime() <= now.getTime())
    .sort((a, b) => priority(b, now) - priority(a, now))
    .slice(0, limit);
}