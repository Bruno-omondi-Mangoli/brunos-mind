import Link from "next/link";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/analogy", label: "Analogies" },
  { href: "/quiz", label: "Quiz" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/games", label: "Games" },
  { href: "/status", label: "Status" },
];

export default function Nav() {
  return (
    <nav
      aria-label="Main"
      className="flex flex-wrap items-center gap-6 border-b border-white/10 px-6 py-4 text-sm"
    >
      <span className="font-semibold">{"Bruno's Mind"}</span>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="text-white/70 hover:text-white">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}