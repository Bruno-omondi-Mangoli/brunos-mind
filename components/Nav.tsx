import Link from "next/link";
import PowerToggle from "@/components/PowerToggle";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/learn", label: "Learn" },
  { href: "/buddy", label: "Study Buddy" },
  { href: "/quiz", label: "Quiz" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/games", label: "Games" },
  { href: "/dashboard", label: "Readiness" },
  { href: "/diagnose", label: "Find my gaps" },
  { href: "/planner", label: "Planner" },
  { href: "/analogy", label: "All analogies" },
  { href: "/status", label: "Status" },
];

export default function Nav() {
  return (
    <nav
      aria-label="Main"
      className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-white/10 px-6 py-4 text-sm"
    >
      <span className="font-semibold">{"Bruno's Mind"}</span>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="text-white/70 hover:text-white">
          {l.label}
        </Link>
      ))}
      <PowerToggle />
    </nav>
  );
}