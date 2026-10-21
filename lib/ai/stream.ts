type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function openStream(messages: ChatMessage[]): Promise<ReadableStream<Uint8Array>> {
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL ?? "openai/gpt-oss-120b";
  const base = process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1";
  if (!key) throw new Error("AI_API_KEY is not set");

  const body: Record<string, unknown> = {
    model,
    temperature: 0.5,
    max_completion_tokens: 1500,
    stream: true,
    messages,
  };
  if (model.startsWith("openai/gpt-oss")) {
    body.reasoning_effort = "low";
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    console.error("AI stream error", res.status, detail);
    throw new Error(`AI provider error ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        let out = "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload) as {
              choices?: { delta?: { content?: string | null } }[];
            };
            const piece = j.choices?.[0]?.delta?.content;
            if (piece) out += piece;
          } catch {
            /* ignore a partial line */
          }
        }
        if (out) {
          controller.enqueue(encoder.encode(out));
          return;
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}