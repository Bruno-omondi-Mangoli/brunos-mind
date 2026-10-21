"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/useProfile";
import { loadMastery } from "@/lib/loadMastery";
import { installFetchTaps } from "@/lib/neuralBus";

installFetchTaps();

const KEY = "bm_low_power";

export type VNode = { id: string; title: string; areaId: string; mastery: number };

type Ctx = {
  lowPower: boolean;
  setLowPower: (v: boolean) => void;
  reduced: boolean;
  nodes: VNode[];
  areaIds: string[];
  pathname: string;
};

const VisualsContext = createContext<Ctx>({
  lowPower: false,
  setLowPower: () => {},
  reduced: false,
  nodes: [],
  areaIds: [],
  pathname: "/",
});

export function useVisuals(): Ctx {
  return useContext(VisualsContext);
}

function same(a: VNode[], b: VNode[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (n, i) => n.id === b[i].id && Math.round(n.mastery * 100) === Math.round(b[i].mastery * 100)
  );
}

function PathWatcher({ onChange }: { onChange: (p: string) => void }) {
  const pathname = usePathname();
  useEffect(() => {
    onChange(pathname);
  }, [pathname, onChange]);
  return null;
}

type NavInfo = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

export default function VisualsProvider({ children }: { children: ReactNode }) {
  const { userId, ready } = useProfile();
  const [lowPower, setLow] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [nodes, setNodes] = useState<VNode[]>([]);
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [pathname, setPathname] = useState("/");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      /* storage unavailable */
    }
    if (stored === "1" || stored === "0") {
      setLow(stored === "1");
      return;
    }
    const nav = navigator as NavInfo;
    const weak =
      (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) ||
      (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 2) ||
      nav.connection?.saveData === true;
    setLow(weak);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!ready || !userId || lowPower) return;
    let cancelled = false;
    loadMastery(createClient(), userId)
      .then((m) => {
        if (cancelled) return;
        const next: VNode[] = m.concepts.map((c) => ({
          id: c.id,
          title: c.title,
          areaId: c.areaId,
          mastery: m.mastery[c.id] ?? 0,
        }));
        setNodes((prev) => (same(prev, next) ? prev : next));
        setAreaIds(m.areas.map((a) => a.id));
      })
      .catch(() => {
        /* the background is optional, ignore errors */
      });
    return () => {
      cancelled = true;
    };
  }, [ready, userId, pathname, lowPower]);

  const setLowPower = useCallback((v: boolean) => {
    setLow(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo(
    () => ({ lowPower, setLowPower, reduced, nodes, areaIds, pathname }),
    [lowPower, setLowPower, reduced, nodes, areaIds, pathname]
  );

  return (
    <VisualsContext.Provider value={value}>
      <Suspense fallback={null}>
        <PathWatcher onChange={setPathname} />
      </Suspense>
      {children}
    </VisualsContext.Provider>
  );
}