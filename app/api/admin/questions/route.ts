import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  const items = await admin
    .from("questions")
    .select("id, concept_id, stem, options, difficulty, status, ai_checked, check_note")
    .eq("source", "ai")
    .eq("reviewed", false)
    .neq("status", "rejected")
    .order("status", { ascending: false })
    .limit(30);
  if (items.error) return NextResponse.json({ error: items.error.message }, { status: 500 });

  const base = () =>
    admin.from("questions").select("*", { count: "exact", head: true }).eq("source", "ai");
  const [total, approved, draft, reviewed] = await Promise.all([
    base(),
    base().eq("status", "approved"),
    base().eq("status", "draft"),
    base().eq("reviewed", true),
  ]);

  return NextResponse.json({
    items: items.data ?? [],
    stats: {
      total: total.count ?? 0,
      approved: approved.count ?? 0,
      draft: draft.count ?? 0,
      reviewed: reviewed.count ?? 0,
    },
  });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.id !== "string" || (body.action !== "approve" && body.action !== "reject")) {
    return NextResponse.json({ error: "id and action are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const update =
    body.action === "approve"
      ? { status: "approved", reviewed: true }
      : { status: "rejected", reviewed: true };
  const res = await admin.from("questions").update(update).eq("id", body.id);
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}