type ChatResponse = {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
};

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI returned no JSON object");
  }
  return JSON.parse(text.slice(start, end + 1));
}

export async function chatJson(system: string, user: string): Promise<unknown> {
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL ?? "openai/gpt-oss-120b";
  const base = process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1";
  if (!key) throw new Error("AI_API_KEY is not set");

  const body: Record<string, unknown> = {
    model,
    temperature: 0.4,
    max_completion_tokens: 4000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
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

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    console.error("AI provider error", res.status, detail);
    throw new Error(`AI provider error ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as ChatResponse;
  const choice = data.choices?.[0];
  const text = choice?.message?.content ?? "";
  if (!text) {
    console.error("AI empty content, finish_reason:", choice?.finish_reason);
    throw new Error("AI returned empty content (finish_reason: " + (choice?.finish_reason ?? "unknown") + ")");
  }

  try {
    return extractJson(text);
  } catch (e) {
    console.error("AI bad JSON:", text.slice(0, 300));
    throw e instanceof Error ? e : new Error("AI returned invalid JSON");
  }
}