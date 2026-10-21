export type PlanTask = {
  type: "learn" | "quiz" | "revisit" | "flashcards" | "review" | "exam";
  title: string;
  minutes: number;
  href?: string;
  conceptTitle?: string;
};

export type PlanDay = {
  date: string;
  label: string;
  kind: "study" | "rest" | "final" | "exam";
  minutes: number;
  tasks: PlanTask[];
};

export type PlanConcept = { id: string; title: string; priority: number };

export type Plan = {
  days: PlanDay[];
  truncated: boolean;
  conceptsPlanned: number;
  daysLeft: number;
  minutesPerDay: number;
};

const MAX_DAYS = 42;
const DAY_MS = 86400000;
const LEARN = 15;
const QUIZ = 10;
const REVISIT = 20;

function parseLocal(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function iso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function label(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function sum(tasks: PlanTask[]): number {
  return tasks.reduce((t, x) => t + x.minutes, 0);
}

export function buildPlan(
  concepts: PlanConcept[],
  examDate: string,
  weeklyHours: number,
  today: Date = new Date()
): Plan | { error: string } {
  const exam = parseLocal(examDate);
  if (!exam) return { error: "That exam date is not valid." };
  if (concepts.length === 0) return { error: "There are no concepts to plan yet." };
  if (!(weeklyHours >= 3)) return { error: "Plan at least 3 hours per week." };

  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysLeft = Math.round((exam.getTime() - start.getTime()) / DAY_MS);
  if (daysLeft < 1) return { error: "Pick an exam date after today." };

  const perDay = Math.round((weeklyHours * 60) / 6);
  const flashMin = Math.max(6, Math.round(perDay * 0.2));
  const planDays = Math.min(daysLeft, MAX_DAYS);
  const truncated = daysLeft > MAX_DAYS;

  const days: PlanDay[] = [];
  const planned = new Set<string>();
  let cursor = 0;

  for (let i = 0; i < planDays; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const isFinal = !truncated && i === daysLeft - 1;

    if (isFinal) {
      const weakest = concepts.slice(0, 3).map((c) => c.title).join(", ");
      const tasks: PlanTask[] = [
        { type: "flashcards", title: "Flashcards: clear every due card", minutes: Math.min(25, perDay), href: "/flashcards" },
        { type: "quiz", title: "Quiz: a round of 20 on My weak spots", minutes: 25, href: "/quiz" },
        {
          type: "review",
          title: `Reread the exam traps for: ${weakest}`,
          minutes: 15,
          href: `/analogy/${concepts[0].id}`,
        },
      ];
      days.push({ date: iso(d), label: label(d), kind: "final", minutes: sum(tasks), tasks });
      continue;
    }

    if (i % 7 === 6) {
      days.push({ date: iso(d), label: label(d), kind: "rest", minutes: 0, tasks: [] });
      continue;
    }

    const tasks: PlanTask[] = [
      { type: "flashcards", title: "Flashcards: review the cards that are due", minutes: flashMin, href: "/flashcards" },
    ];
    let remaining = perDay - flashMin;
    while (remaining >= LEARN) {
      const c = concepts[cursor % concepts.length];
      if (cursor < concepts.length) {
        tasks.push({
          type: "learn",
          title: `Learn: ${c.title}`,
          minutes: LEARN,
          href: `/analogy/${c.id}`,
          conceptTitle: c.title,
        });
        remaining -= LEARN;
        if (remaining >= QUIZ) {
          tasks.push({ type: "quiz", title: `Quiz: ${c.title}`, minutes: QUIZ, href: "/quiz" });
          remaining -= QUIZ;
        }
      } else {
        if (remaining < REVISIT) break;
        tasks.push({
          type: "revisit",
          title: `Revisit: ${c.title}`,
          minutes: REVISIT,
          href: `/analogy/${c.id}`,
          conceptTitle: c.title,
        });
        remaining -= REVISIT;
      }
      planned.add(c.id);
      cursor += 1;
    }
    days.push({ date: iso(d), label: label(d), kind: "study", minutes: sum(tasks), tasks });
  }

  if (!truncated) {
    days.push({
      date: iso(exam),
      label: label(exam),
      kind: "exam",
      minutes: 0,
      tasks: [{ type: "exam", title: "Exam day. Light flashcards only, eat well, arrive early.", minutes: 0 }],
    });
  }

  return { days, truncated, conceptsPlanned: planned.size, daysLeft, minutesPerDay: perDay };
}