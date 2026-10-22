import Link from "next/link";
import { Suspense } from "react";
import PowerToggle from "@/components/PowerToggle";
import MobileMenu from "@/components/MobileMenu";
import NavLinks, { LinkList } from "@/components/NavLinks";

const ROW = "flex flex-wrap gap-x-5 gap-y-1";

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

        <MobileMenu />
        <PowerToggle />
      </nav>
    </header>
  );
}