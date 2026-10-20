export default function Home() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan-300">
        Unofficial AZ-900 study tool
      </p>
      <h1 className="text-5xl font-bold tracking-tight">{"Bruno's Mind"}</h1>
      <p className="max-w-xl text-lg text-white/70">
        Azure concepts explained through your own world: matatus, mobile money, farm
        cooperatives and market stalls.
      </p>
      <p className="text-sm text-white/40">Setup complete. Features arrive slice by slice.</p>
    </section>
  );
}