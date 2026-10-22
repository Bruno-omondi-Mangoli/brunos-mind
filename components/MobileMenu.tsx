"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import NavLinks, { LinkList } from "@/components/NavLinks";

const COL = "flex flex-col gap-3";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative ml-auto md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((o) => !o)}
        className="rounded border border-white/30 px-3 py-1"
      >
        Menu
      </button>
      {open && (
        <div
          id="mobile-menu"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
          className="absolute right-0 z-20 mt-2 w-56 rounded border border-white/20 bg-black p-4"
        >
          <Suspense fallback={<LinkList pathname="" className={COL} />}>
            <NavLinks className={COL} />
          </Suspense>
        </div>
      )}
    </div>
  );
}