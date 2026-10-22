"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/navLinks";

export function LinkList({ pathname, className }: { pathname: string; className?: string }) {
  return (
    <ul className={className}>
      {NAV_LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "font-semibold text-white underline decoration-cyan-400 decoration-2 underline-offset-8"
                  : "text-white/75 hover:text-white"
              }
            >
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();
  return <LinkList pathname={pathname} className={className} />;
}