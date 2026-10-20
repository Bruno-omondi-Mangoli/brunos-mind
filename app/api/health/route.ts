import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env vars" }, { status: 500 });
  }
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anon },
      cache: "no-store",
    });
    return NextResponse.json({ ok: res.ok, supabaseStatus: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Cannot reach Supabase" }, { status: 502 });
  }
}