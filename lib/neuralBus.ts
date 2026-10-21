export type PulseKind = "right" | "wrong";
export type PulseDetail = { kind: PulseKind; conceptId?: string };

export const PULSE_EVENT = "neural:pulse";
export const THINK_EVENT = "neural:think";

export function pulse(detail: PulseDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PulseDetail>(PULSE_EVENT, { detail }));
}

let thinkingCount = 0;

function setThinking(delta: number): void {
  thinkingCount = Math.max(0, thinkingCount + delta);
  window.dispatchEvent(
    new CustomEvent<{ on: boolean }>(THINK_EVENT, { detail: { on: thinkingCount > 0 } })
  );
}

type TappedWindow = Window & { __neuralTapped?: boolean };

/*
  Watches network calls so the neural map can react, without any page changes.
  It never alters a request or a response. AI calls make the map pulse while
  the AI thinks, and a saved quiz answer makes the matching node flash.
*/
export function installFetchTaps(): void {
  if (typeof window === "undefined") return;
  const w = window as TappedWindow;
  if (w.__neuralTapped) return;
  w.__neuralTapped = true;
  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url = "";
    let method = "GET";
    try {
      url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const fromInput = typeof input === "object" && "method" in input ? input.method : "GET";
      method = (init?.method ?? fromInput).toUpperCase();
    } catch {
      /* ignore */
    }

    const isAi = url.includes("/api/ai/");
    if (isAi) setThinking(1);

    try {
      if (method === "POST" && url.includes("/rest/v1/attempts") && typeof init?.body === "string") {
        try {
          const parsed = JSON.parse(init.body) as unknown;
          if (parsed && !Array.isArray(parsed)) {
            const p = parsed as { is_correct?: unknown; concept_id?: unknown };
            if (typeof p.is_correct === "boolean") {
              pulse({
                kind: p.is_correct ? "right" : "wrong",
                conceptId: typeof p.concept_id === "string" ? p.concept_id : undefined,
              });
            }
          }
        } catch {
          /* ignore */
        }
      }
      return await original(input, init);
    } finally {
      if (isAi) setTimeout(() => setThinking(-1), 800);
    }
  };
}