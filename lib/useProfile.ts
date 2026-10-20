"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Lang = "en" | "sw";

export function useProfile() {
  const [userId, setUserId] = useState<string | null>(null);
  const [worldId, setWorldIdState] = useState("matatu");
  const [lang, setLangState] = useState<Lang>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const supabase = createClient();
      let uid: string | null = null;
      for (let i = 0; i < 20 && !uid; i++) {
        const { data } = await supabase.auth.getSession();
        uid = data.session?.user.id ?? null;
        if (!uid) await new Promise((r) => setTimeout(r, 500));
      }
      if (cancelled) return;
      if (!uid) {
        setReady(true);
        return;
      }
      setUserId(uid);
      const { data: profile } = await supabase
        .from("profiles")
        .select("world_id, lang")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled) return;
      if (profile) {
        setWorldIdState(profile.world_id as string);
        setLangState(profile.lang as Lang);
      }
      setReady(true);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLang = useCallback(
    async (l: Lang) => {
      setLangState(l);
      if (userId) {
        await createClient().from("profiles").update({ lang: l }).eq("user_id", userId);
      }
    },
    [userId]
  );

  const setWorld = useCallback(
    async (w: string) => {
      setWorldIdState(w);
      if (userId) {
        await createClient().from("profiles").update({ world_id: w }).eq("user_id", userId);
      }
    },
    [userId]
  );

  return { userId, worldId, lang, ready, setLang, setWorld };
}