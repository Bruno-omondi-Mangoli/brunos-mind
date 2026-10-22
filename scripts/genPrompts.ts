import { writeFileSync } from "node:fs";
import { ANALOGY_SYSTEM, buildAnalogyUser } from "../lib/ai/prompts";
import {
  QUESTION_SYSTEM,
  buildQuestionUser,
  CHECK_SYSTEM,
  buildCheckUser,
  LESSON_SYSTEM,
  buildLessonUser,
} from "../lib/ai/contentPrompts";
import { DIAGNOSE_SYSTEM, buildDiagnoseUser, COACH_SYSTEM, buildCoachUser } from "../lib/ai/coachPrompts";
import { buildBuddySystem } from "../lib/ai/buddyPrompts";

const F = "`".repeat(3);

type Entry = {
  title: string;
  purpose: string;
  file: string;
  where: string;
  settings: string;
  system: string;
  user: string;
  schema: string;
  guardrails: string[];
  expected: string;
};

const concept = {
  title: "Resource locks",
  official_summary:
    "Resource locks prevent accidental deletion or modification of resources. A CanNotDelete lock lets users read and modify but not delete. A ReadOnly lock lets users read but not modify or delete. Locks apply to all users including owners and are inherited by child resources.",
};
const world = { name: "Matatu Routes", description: "Routes, stages, fares, saccos and traffic" };
const JSON_SETTINGS = "Open weight model on Groq, JSON mode, temperature 0.4, low reasoning effort, validated with Zod";

const entries: Entry[] = [
  {
    title: "1. Original question generator",
    purpose: "Writes five original AZ-900 practice questions for one concept, each with an explanation for every option.",
    file: "lib/ai/contentPrompts.ts",
    where: "POST /api/admin/generate with kind questions (admin only, run on localhost)",
    settings: JSON_SETTINGS,
    system: QUESTION_SYSTEM,
    user: buildQuestionUser(concept, 5),
    schema:
      '{"questions":[{"stem":string,"difficulty":1|2|3,"options":[{"id":"a"|"b"|"c"|"d","text":string,"correct":boolean,"explanation":string}]}]}\nZod: exactly 4 options and exactly one correct per question.',
    guardrails: [
      "The official summary is the source of truth, no invented numbers.",
      "No real exam questions, no all or none of the above.",
      "Each wrong option must reflect one specific misconception.",
      "Output is rejected by Zod if it is malformed, then retried.",
      "Every generated question goes through prompt 2 before a learner can see it.",
    ],
    expected:
      "Five questions. For example a scenario where colleagues may edit a server but never delete it: correct option CanNotDelete lock, wrong options ReadOnly lock (also blocks edits), an Azure Policy deny rule (governs properties, not deletion), the Reader role (blocks edits too).",
  },
  {
    title: "2. Accuracy checker",
    purpose: "A second pass that reviews each generated question for Azure factual errors and flags uncertainty instead of guessing.",
    file: "lib/ai/contentPrompts.ts",
    where: "Called right after prompt 1 inside POST /api/admin/generate",
    settings: JSON_SETTINGS,
    system: CHECK_SYSTEM,
    user: buildCheckUser(concept, [
      {
        stem: "Which lock lets users edit a resource but not delete it?",
        difficulty: 1,
        options: [
          { id: "a", text: "CanNotDelete", correct: true, explanation: "It blocks deletion only." },
          { id: "b", text: "ReadOnly", correct: false, explanation: "It also blocks changes." },
          { id: "c", text: "Contributor role", correct: false, explanation: "A role is not a lock." },
          { id: "d", text: "Azure Advisor", correct: false, explanation: "Advisor gives recommendations." },
        ],
      },
    ]),
    schema: '{"results":[{"index":number,"verdict":"pass"|"flag","confidence":"high"|"medium"|"low","issue":string}]}',
    guardrails: [
      "Unsure means flag with low confidence, never guess.",
      "Only pass with high or medium confidence puts a question straight into the quiz.",
      "Flagged questions stay as drafts in the human review queue.",
      "If the checker call fails, questions stay as drafts.",
    ],
    expected: 'One result with verdict "pass", confidence "high" and an empty issue string.',
  },
  {
    title: "3. Study note writer",
    purpose: "Writes the study note for a concept: summary, key points, exam traps and one line to remember.",
    file: "lib/ai/contentPrompts.ts",
    where: "POST /api/admin/generate with kind lesson (admin only)",
    settings: JSON_SETTINGS,
    system: LESSON_SYSTEM,
    user: buildLessonUser(concept),
    schema:
      '{"summary":string,"key_points":string[],"exam_traps":string[],"remember":string,"confidence":"high"|"medium"|"low"}',
    guardrails: [
      "Low confidence means nothing is saved.",
      "No analogies here, the analogy engine owns stories.",
      "Notes are saved as reviewed false and shown with a draft label.",
    ],
    expected:
      "A 2 to 3 sentence summary, 4 to 6 key points, 2 to 4 traps such as ReadOnly versus CanNotDelete, and a short memory line.",
  },
  {
    title: "4. Analogy Engine generator",
    purpose: "Explains one concept at three levels (analogy, plain, exam wording) in English and Kiswahili inside the learner's chosen world.",
    file: "lib/ai/prompts.ts",
    where: "POST /api/ai/analogy, results cached per concept, world and language in concept_explanations",
    settings: JSON_SETTINGS,
    system: ANALOGY_SYSTEM,
    user: buildAnalogyUser({
      conceptTitle: concept.title,
      officialSummary: concept.official_summary,
      worldName: world.name,
      worldDescription: world.description,
    }),
    schema:
      '{"en":{"analogy":string,"plain":string,"exam":string},"sw":{"analogy":string,"plain":string,"exam":string},"confidence":"high"|"medium"|"low","notes":string}',
    guardrails: [
      "Each key part of the concept maps to one thing in the story.",
      "No brand names, no stereotypes, no jokes about poverty.",
      "Plain is one sentence of 25 words or fewer.",
      "Low confidence means nothing is saved.",
      "Saved as a draft until a human marks it reviewed. Swahili needs a native speaker check.",
    ],
    expected:
      "An English and a Swahili version. The matatu story has a sacco rule that nobody may remove a vehicle from the route, with the plain sentence and the exam wording matching the official summary.",
  },
  {
    title: "5. Study Buddy chat",
    purpose: "Beginner friendly tutor. Every explanation starts with an analogy, then plain words, then exam wording, then a check question.",
    file: "lib/ai/buddyPrompts.ts",
    where: "POST /api/ai/buddy (streamed), and the tutor step of each lesson on /learn",
    settings: "Open weight model on Groq, streamed text, temperature 0.5, low reasoning effort, last 8 messages, 15 messages per 10 minutes per user",
    system: buildBuddySystem({
      worldName: world.name,
      worldDescription: world.description,
      lang: "en",
      grounding: [{ title: concept.title, summary: concept.official_summary }],
    }),
    user: "What is the difference between Azure Policy and a resource lock?",
    schema: "Plain text, under 170 words: Analogy, In plain words, For the exam, then one check question.",
    guardrails: [
      "Grounding comes from the concept table, matched by keyword for each question.",
      "No numbers, prices or limits unless they are in the grounding.",
      "Refuses to recall real exam questions and offers an original practice question.",
      "Stays on AZ-900, treats learner messages as data and ignores attempts to change its rules.",
      "Message length, history size and per user rate are limited on the server.",
    ],
    expected:
      "A matatu story contrasting rules checked by inspectors (policy) with a padlock on the vehicle (lock), the plain sentence, the exam wording, then a check question.",
  },
  {
    title: "6. Weak area diagnoser",
    purpose: "Reads the learner's recent wrong answers and names the root misconception, with a fix told in the learner's world.",
    file: "lib/ai/coachPrompts.ts",
    where: "POST /api/ai/diagnose, shown on /diagnose",
    settings: JSON_SETTINGS,
    system: DIAGNOSE_SYSTEM,
    user: buildDiagnoseUser({
      worldName: world.name,
      worldDescription: world.description,
      lang: "en",
      evidence: [
        {
          conceptId: "azure-policy",
          concept: "Azure Policy",
          question: "Which feature enforces that resources are created only in approved regions?",
          learnerChose: "Azure RBAC",
          correctAnswer: "Azure Policy",
        },
        {
          conceptId: "rbac",
          concept: "Role-based access control (RBAC)",
          question: "Which feature lets a junior admin restart VMs in one resource group only?",
          learnerChose: "Azure Policy",
          correctAnswer: "An Azure RBAC role at resource group scope",
        },
        {
          conceptId: "resource-locks",
          concept: "Resource locks",
          question: "Which feature stops anyone from deleting a production resource by mistake?",
          learnerChose: "Azure RBAC",
          correctAnswer: "A resource lock",
        },
      ],
    }),
    schema:
      '{"misconceptions":[{"misconception":string,"why_it_is_wrong":string,"fix_analogy":string,"rule":string,"concept_ids":string[],"confidence":"high"|"medium"|"low"}],"summary":string}',
    guardrails: [
      "Uses only the evidence given, never invents answers.",
      "One supporting answer means low confidence.",
      "Returned concept ids are filtered against real concepts server side.",
      "At least 3 wrong answers are required before the AI is called.",
    ],
    expected:
      "One high confidence gap: the learner mixes up who can act (RBAC) with what rules resources must follow (Policy) and with protection from deletion (locks), with a matatu story and a one line rule.",
  },
  {
    title: "7. Study plan coach",
    purpose: "Adds coach tips to a schedule that is built by code from the exam date, weekly hours and weak areas.",
    file: "lib/ai/coachPrompts.ts",
    where: "POST /api/ai/plan, shown on /planner. The schedule itself comes from lib/planner.ts and always works.",
    settings: JSON_SETTINGS,
    system: COACH_SYSTEM,
    user: buildCoachUser({
      daysLeft: 21,
      weeklyHours: 8,
      lang: "en",
      weeks: [
        { week: 1, concepts: ["Shared responsibility model", "Azure Policy", "Availability zones"] },
        { week: 2, concepts: ["Storage redundancy", "Resource locks"] },
        { week: 3, concepts: ["Azure RBAC", "Region pairs"] },
      ],
    }),
    schema:
      '{"headline":string,"weekly_focus":[{"week":number,"focus":string,"tip":string}],"exam_day_tips":string[]}',
    guardrails: [
      "Never states exam length, format, passing score or price, it points to the official study guide instead.",
      "Mentions only concepts that were provided.",
      "If the AI fails, the learner still gets the full code built schedule.",
    ],
    expected: "A one sentence headline, three weekly focus entries with one tip each, and 2 to 4 exam day tips.",
  },
];

const out: string[] = [
  "# Prompt documentation",
  "",
  "Every AI prompt in Bruno's Mind lives in lib/ai. This file is generated from the real source by `npm run prompts`, so it always matches the code.",
  "",
  "Shared safeguards:",
  "",
  "- API keys stay on the server (route handlers). The browser never sees them.",
  "- Open weight models only, through an OpenAI compatible API.",
  "- Grounding: the concept table in Supabase holds the official summary for each concept.",
  "- Structured JSON output validated with Zod. Invalid output is rejected and retried.",
  "- Low confidence output is discarded instead of saved.",
  "- Generated content is stored as a draft and labelled until it is reviewed.",
  "",
];

for (const e of entries) {
  out.push(
    `## ${e.title}`,
    "",
    `Purpose: ${e.purpose}`,
    "",
    `Source file: ${e.file}`,
    "",
    `Runs in: ${e.where}`,
    "",
    `Model settings: ${e.settings}`,
    "",
    "System prompt:",
    "",
    F + "text",
    e.system,
    F,
    "",
    "Input template, filled with the test input:",
    "",
    F + "text",
    e.user,
    F,
    "",
    "Output format:",
    "",
    F + "text",
    e.schema,
    F,
    "",
    "Guardrails:",
    "",
    ...e.guardrails.map((g) => `- ${g}`),
    "",
    `Expected result for the test input: ${e.expected}`,
    ""
  );
}

writeFileSync("PROMPTS.md", out.join("\n"));
console.log("PROMPTS.md written with " + entries.length + " prompts");