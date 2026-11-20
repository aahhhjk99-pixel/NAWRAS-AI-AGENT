import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Role = "user" | "assistant";
type ChatMessage = { role: Role; content: string };
type Provider = "openai" | "gemini" | "anthropic";

type ProviderResult = {
  reply: string;
  provider: string;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
};

function allowedOrigins(): Set<string> {
  return new Set(
    (Deno.env.get("ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  const allowed = allowedOrigins();
  return {
    ...(origin && allowed.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json; charset=utf-8" }
  });
}

function safeMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) return null;

  const result: ChatMessage[] = [];
  let totalCharacters = 0;
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const candidate = item as Record<string, unknown>;
    if (candidate.role !== "user" && candidate.role !== "assistant") return null;
    if (typeof candidate.content !== "string") return null;

    const content = candidate.content.trim();
    if (!content || content.length > 4000) return null;
    if (candidate.role === "assistant" && result.at(-1)?.role !== "user") return null;

    totalCharacters += content.length;
    if (totalCharacters > 24000) return null;
    result.push({ role: candidate.role, content });
  }

  if (result[0]?.role !== "user" || result.at(-1)?.role !== "user") return null;
  return result;
}

const systemInstruction = `
أنت مساعد عمليات ذكي موجّه لسياق الشحن والتوصيل في شركة النورس.
تحدث بالعربية الواضحة، ويمكنك استخدام اللهجة الليبية عند ملاءمتها.
ساعد في الفهم والتحليل والتخطيط وكتابة إجراءات العمل.
لا تدّعِ أنك دخلت نظام الشركة أو نفذت عملية أو قرأت بيانات مباشرة.
لا تطلب كلمات مرور أو رموز جلسات أو مفاتيح سرية من المستخدم.
لا تنفذ أو توصي بتجاوز الصلاحيات أو ضوابط النظام.
أي عملية خارجية أو مالية أو حذف أو تعديل حساس تتطلب تكاملاً مصرحاً به وموافقة بشرية وتحققاً مستقلاً.
إذا لم تتوفر بيانات أو واجهة مؤكدة، صرّح بذلك بوضوح.
`;

async function readJson(response: Response): Promise<Record<string, any>> {
  return await response.json().catch(() => ({}));
}

async function callOpenAI(messages: ChatMessage[]): Promise<ProviderResult> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OpenAI is not configured");
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemInstruction }, ...messages],
      temperature: 0.3,
      max_tokens: 1200
    }),
    signal: AbortSignal.timeout(30000)
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(`OpenAI error ${response.status}`);
  return {
    reply: data.choices?.[0]?.message?.content ?? "",
    provider: "OpenAI",
    model,
    usage: {
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens
    }
  };
}

async function callGemini(messages: ChatMessage[]): Promise<ProviderResult> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("Gemini is not configured");
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash";
  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }]
  }));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 1200 }
      }),
      signal: AbortSignal.timeout(30000)
    }
  );
  const data = await readJson(response);
  if (!response.ok) throw new Error(`Gemini error ${response.status}`);
  return {
    reply: data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ?? "",
    provider: "Google Gemini",
    model,
    usage: {
      inputTokens: data.usageMetadata?.promptTokenCount,
      outputTokens: data.usageMetadata?.candidatesTokenCount
    }
  };
}

async function callAnthropic(messages: ChatMessage[]): Promise<ProviderResult> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("Anthropic is not configured");
  const model = Deno.env.get("ANTHROPIC_MODEL") || "claude-3-5-haiku-latest";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      system: systemInstruction,
      messages,
      max_tokens: 1200,
      temperature: 0.3
    }),
    signal: AbortSignal.timeout(30000)
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(`Anthropic error ${response.status}`);
  return {
    reply: data.content?.map((part: { type: string; text?: string }) => part.type === "text" ? part.text ?? "" : "").join("") ?? "",
    provider: "Anthropic",
    model,
    usage: {
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens
    }
  };
}

const providerKeys: Record<Provider, string> = {
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY"
};

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  if (origin && !allowedOrigins().has(origin)) {
    return json(request, { error: "Origin is not allowed" }, 403);
  }
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);

  try {
    const body = await request.json();
    const messages = safeMessages(body?.messages);
    if (!messages) return json(request, { error: "Invalid messages payload" }, 400);

    // Supabase verifies the caller's JWT by default. Never accept provider URLs or keys from the client.
    const providers: Provider[] = ["openai", "gemini", "anthropic"];
    const configured = Deno.env.get("AI_DEFAULT_PROVIDER")?.toLowerCase();
    const preferred: Provider = providers.includes(configured as Provider)
      ? configured as Provider
      : "openai";
    const order = [preferred, ...providers.filter((provider) => provider !== preferred)]
      .filter((provider) => Boolean(Deno.env.get(providerKeys[provider])));

    if (order.length === 0) {
      return json(request, { error: "لم يتم إعداد أي مزود ذكاء اصطناعي على الخادم." }, 503);
    }

    let lastProvider: Provider | undefined;
    for (const provider of order) {
      lastProvider = provider;
      try {
        const result = provider === "openai"
          ? await callOpenAI(messages)
          : provider === "gemini"
            ? await callGemini(messages)
            : await callAnthropic(messages);

        if (!result.reply.trim()) throw new Error("Provider returned an empty response");
        return json(request, result);
      } catch (error) {
        console.error("AI provider request failed", provider, error instanceof Error ? error.name : "unknown");
      }
    }

    console.error("No configured AI provider completed the request", lastProvider ?? "unknown");
    return json(request, { error: "تعذر الوصول إلى مزود ذكاء اصطناعي متاح. راجع إعدادات الخادم." }, 503);
  } catch {
    return json(request, { error: "الطلب غير صالح أو تعذر معالجته." }, 400);
  }
});
