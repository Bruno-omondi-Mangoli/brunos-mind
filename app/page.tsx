import Link from "next/link";
import HomeDashboard from "@/components/HomeDashboard";

const STEPS = [
  {
    n: "1",
    title: "See it as a story",
    text: "Each Azure idea starts as an everyday picture from your world: a matatu sacco, a mobile money agent, a farm cooperative, a market stall.",
  },
  {
    n: "2",
    title: "Then the real words",
    text: "The same idea in one plain sentence, then in the exact wording you will meet in the exam, with a study note and the common traps.",
  },
  {
    n: "3",
    title: "Prove it, then keep it",
    text: "A quick check after every concept, flashcards that bring back what you miss, games, and a readiness score by skill area.",
  },
];

const UNITS = [
  { title: "Unit 1. Cloud concepts", text: "Cloud models, cost, scale, IaaS, PaaS, SaaS and shared responsibility." },
  { title: "Unit 2. Architecture and services", text: "Regions, compute, networking, storage, identity and security." },
  { title: "Unit 3. Management and governance", text: "Cost tools, policy, locks, monitoring and infrastructure as code." },
];

const TOOLS = [
  { href: "/buddy", title: "Study Buddy", text: "Ask anything. Every answer starts with a story." },
  { href: "/quiz", title: "Quiz", text: "Rounds by topic, with the analogy shown when you miss." },
  { href: "/flashcards", title: "Flashcards", text: "Spaced repetition that favours your weak spots." },
  { href: "/games", title: "Games", text: "Analogy Match and Layer Sort." },
  { href: "/diagnose", title: "Find my gaps", text: "The AI names the wrong idea behind your mistakes." },
  { href: "/planner", title: "Planner", text: "A day by day plan from your exam date." },
  { href: "/dashboard", title: "Readiness", text: "Instrument gauges by skill area." },
];

export default function Home() {
  return (
    <div className="pb-16">
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pb-4 pt-20 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-cyan-300">
          Unofficial AZ-900 study tool
        </p>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">{"Bruno's Mind"}</h1>
        <p className="max-w-xl text-lg text-white/75">
          Learn Azure through the world you already understand. Stories first, exam wording second, a tutor
          beside you the whole way.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/learn" className="rounded bg-cyan-400 px-6 py-3 font-semibold text-black">
            Start the course
          </Link>
          <Link href="/quiz" className="rounded border border-white/30 px-6 py-3">
            Take a quiz
          </Link>
        </div>
      </section>

      <HomeDashboard />

      <section className="mx-auto mt-20 max-w-5xl px-6">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-lg border border-white/15 bg-white/5 p-5">
              <span className="font-mono text-sm text-cyan-300">{s.n}</span>
              <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-white/70">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-16 max-w-5xl px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-semibold">The course in three units</h2>
          <Link href="/learn" className="text-sm text-cyan-300 hover:underline">
            Open the full course
          </Link>
        </div>
        <ul className="mt-6 grid gap-6 md:grid-cols-3">
          {UNITS.map((u) => (
            <li key={u.title} className="rounded-lg border border-white/15 bg-white/5 p-5">
              <h3 className="font-semibold">{u.title}</h3>
              <p className="mt-2 text-sm text-white/70">{u.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-16 max-w-5xl px-6">
        <h2 className="text-2xl font-semibold">Your toolbox</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className="block h-full rounded-lg border border-white/15 bg-white/5 p-5 hover:bg-white/10"
              >
                <h3 className="font-semibold">{t.title}</h3>
                <p className="mt-1 text-sm text-white/70">{t.text}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-16 max-w-3xl px-6 text-center">
        <h2 className="text-2xl font-semibold">Why this exists</h2>
        <p className="mt-4 text-white/75">
          I did not understand AZ-900 at first. The notes were too abstract. A good analogy in plain language
          would have fixed it, so I built the tool I wish I had.
        </p>
        <p className="mt-6 text-xs text-white/60">
          Bruno&apos;s Mind is an unofficial study tool. It is not affiliated with, endorsed by, or sponsored by
          Microsoft. All questions are original.
        </p>
      </section>
    </div>
  );
}