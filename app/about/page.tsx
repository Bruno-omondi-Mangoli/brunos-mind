import Link from "next/link";

export const metadata = { title: "About | Bruno's Mind" };

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-4xl font-bold">About Bruno&apos;s Mind</h1>

      <h2 className="mt-8 text-2xl font-semibold">Unofficial study tool</h2>
      <p className="mt-2 text-white/80">
        Bruno&apos;s Mind is an unofficial study tool for the Microsoft AZ-900 Azure Fundamentals exam. It is
        not affiliated with, endorsed by, or sponsored by Microsoft. It uses no Microsoft logos. All questions
        are original and written from the public skills outline on Microsoft Learn. No real exam questions are
        used.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">Why it exists</h2>
      <p className="mt-2 text-white/80">
        Many learners find the official notes too abstract. Bruno&apos;s Mind retells each concept as a story
        from everyday African life, then in plain words, then in exam wording.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">How the content is made</h2>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-white/80">
        <li>Each concept starts from a short summary checked against Microsoft Learn.</li>
        <li>Open weight AI models write stories, study notes and practice questions from that summary.</li>
        <li>A second AI pass checks questions and flags anything it is unsure about.</li>
        <li>Flagged questions go to a human review queue. Each question shows whether it is human reviewed.</li>
        <li>Kiswahili text is AI assisted and should be checked by a native speaker.</li>
      </ul>

      <h2 className="mt-8 text-2xl font-semibold">Accuracy</h2>
      <p className="mt-2 text-white/80">
        AI can make mistakes. Always confirm important details on Microsoft Learn before your exam. The
        readiness score is an estimate from your answers, not a prediction of your result.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">Privacy</h2>
      <p className="mt-2 text-white/80">
        You are signed in anonymously. No name or email is collected. Your answers, flashcard progress and
        settings are stored against a random anonymous id in your browser session.
      </p>

      <h2 className="mt-8 text-2xl font-semibold">Credits</h2>
      <p className="mt-2 text-white/80">
        Built with Next.js, Supabase and Vercel. AI answers come from open weight models. Fonts: Bricolage
        Grotesque, Atkinson Hyperlegible and JetBrains Mono, loaded from Google Fonts (VERIFY the licences on
        fonts.google.com).
      </p>

      <p className="mt-10">
        <Link href="/learn" className="rounded bg-cyan-400 px-5 py-2 font-semibold text-black">
          Start learning
        </Link>
      </p>
    </section>
  );
}