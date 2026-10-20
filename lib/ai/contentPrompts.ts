type ConceptInfo = { title: string; official_summary: string };

export const QUESTION_SYSTEM = `You write ORIGINAL practice questions for the Microsoft AZ-900 Azure Fundamentals exam, for first-time learners.

Rules:
1. The OFFICIAL SUMMARY is the source of truth. You may add widely documented AZ-900 level facts you are certain about. Never add prices, limits or numbers that are not in the summary.
2. Write exactly the requested number of questions: two that test recognising the definition, two short real life scenarios, and one trap question where two options look alike and only one is right. If fewer than five are requested, drop trap and scenario questions last.
3. Single choice. Exactly 4 options with ids a, b, c and d. Exactly one correct. Spread the correct answer across different ids.
4. Each wrong option must be plausible and wrong because of one specific misconception. Never use "all of the above" or "none of the above".
5. Every option has an explanation of one or two sentences saying why it is right or why it is wrong.
6. Questions must be original. Do not recall or copy real exam questions. No brand logos.
7. Scenarios may use everyday African settings, such as a clinic in Kisumu, a sacco or a school in Arusha, but the technical content must stay precise.
8. difficulty: 1 easy, 2 medium, 3 hard.
9. Return ONLY one JSON object, no markdown:
{"questions":[{"stem":"...","difficulty":1,"options":[{"id":"a","text":"...","correct":false,"explanation":"..."},{"id":"b","text":"...","correct":true,"explanation":"..."},{"id":"c","text":"...","correct":false,"explanation":"..."},{"id":"d","text":"...","correct":false,"explanation":"..."}]}]}`;

export function buildQuestionUser(c: ConceptInfo, n: number): string {
  return [
    `CONCEPT: ${c.title}`,
    `OFFICIAL SUMMARY: ${c.official_summary}`,
    `NUMBER OF QUESTIONS: ${n}`,
    "Write the JSON now.",
  ].join("\n");
}

export const CHECK_SYSTEM = `You are a strict technical reviewer for Microsoft Azure Fundamentals (AZ-900) practice questions.

For each numbered question decide whether it is safe to show to learners. Use the OFFICIAL SUMMARY and your Azure knowledge.
A question passes only if all are true:
1. Exactly one option is correct, and the option marked correct really is correct.
2. Every explanation is factually correct.
3. No wrong option is also arguably correct.
4. The question stem is unambiguous.
5. Nothing contradicts the official summary.
If you are unsure about any point, give verdict "flag" with confidence "low". Do not guess.
issue: one short sentence naming the problem, or an empty string for a pass.
Return ONLY one JSON object, no markdown, with one result per question:
{"results":[{"index":0,"verdict":"pass","confidence":"high","issue":""}]}`;

export function buildCheckUser(c: ConceptInfo, questions: unknown[]): string {
  const numbered = questions.map((q, i) => ({ index: i, ...(q as object) }));
  return [
    `CONCEPT: ${c.title}`,
    `OFFICIAL SUMMARY: ${c.official_summary}`,
    "QUESTIONS:",
    JSON.stringify(numbered),
    "Return the JSON now.",
  ].join("\n");
}

export const LESSON_SYSTEM = `You write short study notes for first-time AZ-900 (Azure Fundamentals) learners.

Rules:
1. The OFFICIAL SUMMARY is the source of truth. You may add widely documented AZ-900 level facts you are certain about. Never add prices, limits or numbers that are not in the summary.
2. summary: 2 to 3 plain sentences explaining the concept.
3. key_points: 4 to 6 short statements covering what the exam expects a learner to know.
4. exam_traps: 2 to 4 common confusions or look alike terms, each stating the difference clearly.
5. remember: one short memorable line.
6. No analogies and no stories, another feature handles those.
7. If the summary is not enough to write this safely, set confidence to "low".
8. Return ONLY one JSON object, no markdown:
{"summary":"...","key_points":["..."],"exam_traps":["..."],"remember":"...","confidence":"high or medium or low"}`;

export function buildLessonUser(c: ConceptInfo): string {
  return [
    `CONCEPT: ${c.title}`,
    `OFFICIAL SUMMARY: ${c.official_summary}`,
    "Write the JSON now.",
  ].join("\n");
}