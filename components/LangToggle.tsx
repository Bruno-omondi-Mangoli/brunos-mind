"use client";

import type { Lang } from "@/lib/useProfile";

export default function LangToggle({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
}) {
  const items: { id: Lang; label: string }[] = [
    { id: "en", label: "English" },
    { id: "sw", label: "Kiswahili" },
  ];
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex overflow-hidden rounded border border-white/20 text-sm"
    >
      {items.map((i) => (
        <button
          key={i.id}
          type="button"
          aria-pressed={lang === i.id}
          onClick={() => onChange(i.id)}
          className={
            "px-3 py-1 " +
            (lang === i.id ? "bg-cyan-400 text-black" : "text-white/70 hover:bg-white/10")
          }
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}