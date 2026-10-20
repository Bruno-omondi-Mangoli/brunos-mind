"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

let started: Promise<void> | null = null;

async function ensureUser() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  let user = data.session?.user ?? null;
  if (!user) {
    const res = await supabase.auth.signInAnonymously();
    if (res.error) {
      console.error("Anonymous sign in failed:", res.error.message);
      return;
    }
    user = res.data.user;
  }
  if (user) {
    await supabase
      .from("profiles")
      .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
  }
}

export default function AuthBootstrap() {
  useEffect(() => {
    if (!started) started = ensureUser();
  }, []);
  return null;
}