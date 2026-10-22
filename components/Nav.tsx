import Link from "next/link";
import { Suspense } from "react";
import PowerToggle from "@/components/PowerToggle";
import NavLinks, { LinkList } from "@/components/NavLinks";

const ROW = "flex flex-wrap gap-x-5 gap-y-1";
const COL = "flex flex-col gap-3";

export default function Nav() {
  return (
    <header className="border-b border-white/10">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 text-sm"
      >
        <Link href="/" className="font-display text-base font-bold">
          {"Bruno's Mind"}
        </Link>

        <div className="hidden flex-1 md:block">
          <Suspense fallback={<LinkList pathname="" className={ROW} />}>
            <NavLinks className={ROW} />
          </Suspense>
        </div>

        <details className="relative ml-auto md:hidden">
          <summary className="cursor-pointer list-none rounded border border-white/30 px-3 py-1">
            Menu
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-56 rounded border border-white/20 bg-black p-4">
            <Suspense fallback={<LinkList pathname="" className={COL} />}>
              <NavLinks className={COL} />
            </Suspense>
          </div>
        </details>

        <PowerToggle />
      </nav>
    </header>
  );
}