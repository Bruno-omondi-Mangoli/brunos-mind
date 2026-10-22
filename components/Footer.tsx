import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-6 text-center text-xs text-white/60">
      <p>
        {"Bruno's Mind is an unofficial study tool. It is not affiliated with, endorsed by, or sponsored by Microsoft. All questions are original."}
      </p>
      <p className="mt-2">
        <Link href="/about" className="underline hover:text-white">
          About and accuracy
        </Link>
      </p>
    </footer>
  );
}