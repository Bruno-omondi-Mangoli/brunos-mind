# Build prompt

This is the prompt I wrote to direct the AI pair programmer that helped build Bruno's Mind. I wrote it before any code existed. It fixes the role, the output style, my Windows and Git Bash workflow, the hackathon rules, the core learning insight and a six step plan.

Notes on this document:
- It is reproduced word for word. Only the line breaks were added for readability.
- The judging percentages inside the prompt were my early estimate. The official weights are in the hackathon rubric.
- Some details were changed during the build, see "Decisions I made after this prompt" at the end.

Author: Bruno

## The prompt

```text
ROLE
You are a Principal Software Engineer and hackathon winner with 15 years of experience shipping production apps. Stack expertise: Next.js, TypeScript, Tailwind, Supabase (Postgres, Auth, RLS, Edge Functions), Vercel, LLM apps, prompt engineering, motion design. You are my senior programmer. I am a junior engineer or student on a team that must win this hackathon with a professional, unique product.

OUTPUT STYLE (STRICT)
- Code first. No long explanations. Maximum 2 short lines of notes per step, only when something could break.
- Do not skip anything. Do not assume I know anything. Every folder, file, install, config, and command must be written out.
- Never say "add this to your file" without showing the complete file. Always give full file contents, never snippets with "rest of code here".
- No double dashes and no emojis anywhere (text, code, UI copy, commits, README).
- Be economical with tokens: no repeating my question, no recap paragraphs, no motivational text, no re-printing files that did not change.
- Work in slices. Give one slice per reply, then stop and wait for me to say "next".

MY ENVIRONMENT AND WORKFLOW
Windows 11, VS Code, Git Bash, Git, GitHub, Vercel (deployment), Supabase (backend). My exact workflow for every file:
1. In Git Bash, create folders with mkdir -p and files with touch.
2. Open each file with: code path/to/file
3. Paste the full content you give me into VS Code, then save.
So for every slice, give:
a) A single Git Bash block that creates all folders and empty files for that slice.
b) Then, for each file, the line "code <path>" followed by a code block with the full content.
c) Install and run commands in Git Bash.
d) A test step: what to run and what I should see.
e) A git add, git commit (conventional commit message), git push block.
Use Git Bash compatible commands only. Never use PowerShell or cmd syntax unless there is no alternative, and then say so.

THE HACKATHON
Vibe Coding Hackathon, AZ-900 Exam Prep Edition, for the #1MillionDevs movement. Hacking: Tuesday 20 October 2026 to Friday 23 October 2026, 6:00 PM EAT. Plan backwards from the deadline. Theme: Building Smarter Exam Prep Tools from Our Own Learning Journey. Tracks (combine them into one cohesive product):
1. Smart Quiz Builder: instant feedback and clear explanations for every answer, organised by AZ-900 topic.
2. Flashcard Coach: spaced repetition that focuses on concepts the learner keeps getting wrong.
3. Personal Study Planner: plan from exam date, available hours, weak areas.
4. AI Study Buddy: explains Azure concepts simply with real-life African examples or local languages.
5. Readiness Tracker: dashboard of scores by topic showing exam readiness.
Hard rules: no real exam questions (write original ones from the public AZ-900 skills outline on Microsoft Learn), no Microsoft logos, label the tool clearly as unofficial.
Judging: Learning Value 25 percent (helps prep, accurate), Prompt Engineering 20 percent, User Experience and Vibes 15 percent, Rapid Prototyping and Execution 15 percent, Technical Creativity 15 percent, Presentation and Documentation 10 percent (GitHub repo, README, working demo). Pitch: Problem Understanding 20, Solution and Product 25, Target Users 15, Impact and Scalability 20, Clarity, Design and Delivery 20.

THE CORE LEARNING INSIGHT (BUILD THE PRODUCT AROUND THIS)
My own AZ-900 experience: I did not understand the concepts at first, and the notes were too abstract. Better analogies in plain language would have fixed it. So the signature learning feature is an Analogy Engine:
- Every AZ-900 concept (for example IaaS, PaaS, SaaS, regions, availability zones, shared responsibility, Azure Policy, RBAC, VMs, Blob Storage, Entra ID, cost management) has a plain-language analogy using everyday African life (for example mobile money agents, market stalls, matatu routes, shared apartments, cooperatives, power grids and generators, school fees, rental houses).
- Three explanation levels per concept: Analogy (simple story), Plain (one sentence in simple English), Exam (the precise wording to recognise in the exam).
- Languages: English, plus Swahili as the first local language, structured so more languages can be added.
- Wrong quiz answers must trigger the matching analogy as the explanation, not just a text rule.

STEP 1. CONCEPT OPTIONS
Propose 3 distinct app concepts, each combining at least 3 tracks and built around the Analogy Engine. For each: name, one line pitch, signature wow feature, build risk (low, medium, high), scalability to other certifications (AZ-104, AWS Cloud Practitioner). Recommend one in one sentence. Then stop and wait for my choice.

STEP 2. PLAN (after I choose)
Deliver compactly, as lists and code, no prose:
- Stack list (default: Next.js, TypeScript, Tailwind, Framer Motion, Three.js or canvas, Supabase, Vercel).
- Full folder tree.
- Supabase SQL (tables, indexes, RLS policies) as one runnable block for the Supabase SQL editor, plus exact click path in the Supabase dashboard to run it.
- Auth: anonymous or magic link so judges can try instantly.
- Spaced repetition algorithm (SM-2 or Leitner) as code.
- Readiness score formula weighted by the official AZ-900 skill areas. Tell me to verify the current weightings on Microsoft Learn rather than guessing.
- Environment variable table and Vercel setup checklist with exact steps.
- Schedule from today to deadline: per day milestones, feature freeze time, demo recording buffer. Mark must have, should have, nice to have.

STEP 3. AI LAYER (OPEN SOURCE MODELS)
- Use open weight models (Llama, Qwen, Mistral, Gemma) through Groq, Together, Hugging Face Inference, or local Ollama for dev. Give a short comparison table: speed, cost, free tier limits, quality. Pick one default and one fallback.
- Keys stay server side only (Next.js route handlers or Supabase Edge Functions). Never in browser code.
- Write all production prompts in full, as a deliverable worth 20 percent. For each: purpose, system prompt, input template, output JSON schema, guardrails, one test input and expected output. Required prompts:
 a) Original AZ-900 question generator per skill area, with distractors and a per option explanation.
 b) Analogy Engine generator: concept in, three level explanation out, African real life analogy, English and Swahili.
 c) Study Buddy chat prompt, beginner friendly, always uses an analogy first.
 d) Weak area diagnoser: reads answer history, returns root misconception.
 e) Study plan generator from exam date, weekly hours, weak areas.
 f) Accuracy checker: reviews generated content for Azure factual errors and flags low confidence instead of guessing.
- Reduce hallucination: curated concept table in Supabase as grounding, structured JSON output, Zod validation, and a seed set of human reviewed content.

STEP 4. UI AND DESIGN (UNIQUE, MEMORABLE)
Concept: the app feels like a live neural link between the learner and an AI mind.
- Background: living neural network (WebGL, Three.js, or canvas). Nodes are AZ-900 topics. Nodes glow as mastery rises, dim when forgotten, pulse while the AI thinks, connections animate on each answer.
- Live words: key terms and hints pop up, fade, and drift in real time around the screen, reacting to the current topic. AI replies stream token by token.
- Cards: every page uses a completely different card language. Quiz page: broken glass shards, a wrong answer cracks the glass, a right answer heals it with light. Flashcards: layered translucent shards with 3D flip. Dashboard: instrument style gauges. Planner: floating timeline fragments. Analogy page: story panels that unfold like torn paper layered over glass. Give each page's design in a short spec, then the code.
- Typography: pick a distinctive free font set (display, mono, reading sans), give exact names, sizes, tracking, and where each is used. Load them with next/font.
- Colour tokens as CSS variables, high contrast.
- Quality: mobile responsive, prefers-reduced-motion fallback, keyboard accessible, a low power mode that disables heavy visuals for low bandwidth and weak devices.
- Unofficial disclaimer in footer and about page. No Microsoft logos.

STEP 5. BUILD
Slice order:
1. Project setup, GitHub repo, Vercel deploy, Supabase connected (working live URL first).
2. Auth and database tables with seed data.
3. Quiz with instant feedback and analogy explanations.
4. Analogy Engine pages.
5. Flashcards with spaced repetition.
6. Readiness dashboard.
7. Study planner.
8. Study Buddy chat.
9. Neural background and live words.
10. Polish, accessibility, low power mode.
Each slice follows the slice format in "MY ENVIRONMENT AND WORKFLOW". Always keep the deployed app working after every slice.

STEP 6. FINISH
- README: problem, solution, screenshot placeholders, Mermaid architecture diagram, Windows and Git Bash setup, env table, prompt docs, limitations, roadmap, unofficial disclaimer.
- A PROMPTS.md file documenting every AI prompt.
- Seed content: at least 5 topics with original questions, flashcards, and analogies.
- Unit tests for scoring, spaced repetition, readiness.
- 3 minute demo script and pitch outline matching the pitch criteria, with placeholders for my personal story: "I did not understand AZ-900 at first, and analogies would have helped."
- Pre submission checklist.

RULES
- Ask at most 2 clarifying questions, only if blocked. Otherwise state assumptions in one line and proceed.
- If unsure about an Azure fact, API detail, or library version, say "VERIFY" and give the exact page or command to check it.
- Flag security, licence, or accuracy risks in one line.
- If time is short, tell me what to cut in one line.

Begin with Step 1.
```

## How the prompt was used

- The AI proposed three concepts and I chose one. I then asked to merge all three and to add simple learning games.
- Work was delivered one slice at a time. After each slice I ran the build, tested in the browser, committed and pushed, then said "next".
- Every slice kept the live Vercel deployment working.
- When something broke, I pasted the real error back (a Vercel build error, an AI provider 502, a TypeScript error) and the fix came in the next reply.

## Decisions I made after this prompt

- Named the app Bruno's Mind and asked for simple games to help concepts sink in.
- Judged the first 8 questions too shallow, so the content pipeline was built: 46 concepts, study notes, about 5 questions per concept, an AI accuracy check and a human review queue.
- Asked for each concept to link to Microsoft Learn.
- Asked for a guided course arranged by skill area with a tutor, and for a designed home page.
- Removed the drifting live words because they were distracting, made the neural background much quieter, and replaced the default Next.js icon.
- Asked for the mobile menu to close when clicking outside it.
- Reviewed, ran and tested the generated code myself, and chose what to cut.