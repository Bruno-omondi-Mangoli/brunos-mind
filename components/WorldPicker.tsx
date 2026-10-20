"use client";

export type World = { id: string; name: string; description: string };

export default function WorldPicker({
  worlds,
  value,
  onChange,
}: {
  worlds: World[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="group" aria-label="Analogy world" className="grid gap-3 sm:grid-cols-2">
      {worlds.map((w) => (
        <button
          key={w.id}
          type="button"
          aria-pressed={value === w.id}
          onClick={() => onChange(w.id)}
          className={
            "rounded border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 " +
            (value === w.id
              ? "border-cyan-300 bg-cyan-300/15"
              : "border-white/20 bg-white/5 hover:bg-white/10")
          }
        >
          <span className="block font-semibold">{w.name}</span>
          <span className="block text-sm text-white/60">{w.description}</span>
        </button>
      ))}
    </div>
  );
}