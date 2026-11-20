import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Role = "user" | "assistant";
type ChatMessage = { role: Role; content: string };
type Provider = "gemini" | "groq" | "openrouter";
type TaskType = "general" | "analysis" | "planning";
type ProviderResult = {
  reply: string;
  provider: string;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
};
type ModelInfo = { id: string; name: string; contextLength?: number };

let openRouterCatalog: { expiresAt: number; models: ModelInfo[] } | null = null;
const CATALOG_TTL_MS = 10 * 60 * 1000;
const MAX_CATALOG_MODELS = 250;

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

function decodeJwtPayload(request: Request): Record<string, unknown> | null {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const payloadPart = token.split(".")[1];
  if (!payloadPart) return null;
  try {
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const value = JSON.parse(atob(padded));
    return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function callerAllowed(request: Request): boolean {
  // The Supabase Edge gateway verifies the JWT signature because verify_jwt=true.
  // This function then applies the owner-configured email allowlist.
  const allowedEmails = new Set(
    (Deno.env.get("AI_ALLOWED_EMAILS") ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
  if (allowedEmails.size === 0) return false;
  const email = decodeJwtPayload(request)?.email;
  return typeof email === "string" && allowedEmails.has(email.toLowerCase());
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

function taskInstruction(taskType: TaskType): string {
  if (taskType === "analysis") return "حلّل الطلب بعمق، وميّز بين الحقائق والافتراضات، ثم اقترح خيارات عملية واضحة.";
  if (taskType === "planning") return "حوّل الطلب إلى خطة مرتبة بمراحل وقرارات ومخاطر قابلة للمراجعة.";
  return "أجب مباشرة وبوضوح مع مراعاة سياق المستخدم.";
}

async function readJson(response: Response): Promise<Record<string, any>> {
  return await response.json().catch(() => ({}));
}

function requireProviderKey(name: string, label: string): string {
  const key = Deno.env.get(name);
  if (!key) throw new Error(`${label} is not configured`);
  return key;
}

async function callGemini(messages: ChatMessage[], taskType: TaskType): Promise<ProviderResult> {
  const key = requireProviderKey("GEMINI_API_KEY", "Gemini");
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest";
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
        systemInstruction: { parts: [{ text: `${systemInstruction}\n${taskInstruction(taskType)}` }] },
        contents,
        generationConfig: { temperature: 0.3, maxOutputTokens: 1200 }
      }),
      signal: AbortSignal.timeout(30000)
    }
  );
  const data = await readJson(response);
  if (!response.ok) throw new Error(`Gemini provider returned ${response.status}`);
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

async function callGroq(messages: ChatMessage[], taskType: TaskType): Promise<ProviderResult> {
  const key = requireProviderKey("GROQ_API_KEY", "Groq");
  const model = Deno.env.get("GROQ_MODEL") || "llama-3.1-8b-instant";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: `${systemInstruction}\n${taskInstruction(taskType)}` },
        ...messages
      ],
      temperature: 0.3,
      max_tokens: 1200
    }),
    signal: AbortSignal.timeout(30000)
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(`Groq provider returned ${response.status}`);
  return {
    reply: data.choices?.[0]?.message?.content ?? "",
    provider: "Groq",
    model,
    usage: {
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens
    }
  };
}

async function getOpenRouterModels(forceRefresh = false): Promise<ModelInfo[]> {
  const key = requireProviderKey("OPENROUTER_API_KEY", "OpenRouter");
  if (!forceRefresh && openRouterCatalog && openRouterCatalog.expiresAt > Date.now()) {
    return openRouterCatalog.models;
  }

  const response = await fetch("https://openrouter.ai/api/v1/models?limit=500", {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(20000)
  });
  const data = await readJson(response);
  if (!response.ok || !Array.isArray(data.data)) throw new Error(`OpenRouter model catalog returned ${response.status}`);

  const models: ModelInfo[] = data.data
    .filter((item: Record<string, any>) => {
      if (typeof item.id !== "string" || item.id.length > 200) return false;
      const inputs = item.architecture?.input_modalities;
      const outputs = item.architecture?.output_modalities;
      return (!Array.isArray(inputs) || inputs.includes("text"))
        && (!Array.isArray(outputs) || outputs.includes("text"));
    })
    .slice(0, MAX_CATALOG_MODELS)
    .map((item: Record<string, any>) => ({
      id: item.id,
      name: typeof item.name === "string" && item.name.length <= 160 ? item.name : item.id,
      ...(typeof item.context_length === "number" ? { contextLength: item.context_length } : {})
    }));

  openRouterCatalog = { expiresAt: Date.now() + CATALOG_TTL_MS, models };
  return models;
}

async function callOpenRouter(messages: ChatMessage[], taskType: TaskType, requestedModel: unknown): Promise<ProviderResult> {
  const key = requireProviderKey("OPENROUTER_API_KEY", "OpenRouter");
  if (typeof requestedModel !== "string" || requestedModel.length > 200) {
    throw new Error("OpenRouter model is required");
  }
  const models = await getOpenRouterModels();
  if (!models.some((model) => model.id === requestedModel)) throw new Error("OpenRouter model is not in the server catalog");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: requestedModel,
      messages: [
        { role: "system", content: `${systemInstruction}\n${taskInstruction(taskType)}` },
        ...messages
      ],
      temperature: 0.3,
      max_tokens: 1200
    }),
    signal: AbortSignal.timeout(40000)
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error(`OpenRouter provider returned ${response.status}`);
  const content = data.choices?.[0]?.message?.content;
  const reply = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part: { text?: string }) => part.text ?? "").join("")
      : "";
  return {
    reply,
    provider: "OpenRouter",
    model: requestedModel,
    usage: {
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens
    }
  };
}

function providerCapabilities() {
  return {
    gemini: {
      available: Boolean(Deno.env.get("GEMINI_API_KEY")),
      model: Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest"
    },
    groq: {
      available: Boolean(Deno.env.get("GROQ_API_KEY")),
      model: Deno.env.get("GROQ_MODEL") || "llama-3.1-8b-instant"
    },
    openrouter: {
      available: Boolean(Deno.env.get("OPENROUTER_API_KEY")),
      model: "catalog"
    }
  };
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin");
  if (origin && !allowedOrigins().has(origin)) {
    return json(request, { error: "هذا الأصل غير مسموح له بالاتصال بالخدمة." }, 403);
  }
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "طريقة الطلب غير مدعومة." }, 405);

  try {
    const body = await request.json();
    if (!callerAllowed(request)) {
      return json(request, { error: "الحساب غير مصرح له باستخدام المساعد." }, 403);
    }

    if (body?.action === "capabilities") {
      return json(request, { providers: providerCapabilities() });
    }
    if (body?.action === "models") {
      if (!Deno.env.get("OPENROUTER_API_KEY")) {
        return json(request, { error: "OpenRouter غير مهيأ على الخادم." }, 503);
      }
      const models = await getOpenRouterModels(true);
      return json(request, { models });
    }

    const messages = safeMessages(body?.messages);
    if (!messages) return json(request, { error: "صيغة الرسائل غير صالحة." }, 400);

    const providers: Provider[] = ["gemini", "groq", "openrouter"];
    const configuredDefault = Deno.env.get("AI_DEFAULT_PROVIDER")?.toLowerCase();
    const provider = (body?.provider ?? configuredDefault ?? "gemini") as Provider;
    if (!providers.includes(provider)) return json(request, { error: "مزود الذكاء الاصطناعي غير مدعوم." }, 400);

    const requestedTaskType = body?.taskType;
    const taskType: TaskType = requestedTaskType === "analysis" || requestedTaskType === "planning"
      ? requestedTaskType
      : "general";
    const available = providerCapabilities()[provider].available;
    if (!available) return json(request, { error: `المزود ${provider} غير مهيأ بمفتاح صالح على الخادم.` }, 503);

    let result: ProviderResult;
    if (provider === "gemini") result = await callGemini(messages, taskType);
    else if (provider === "groq") result = await callGroq(messages, taskType);
    else result = await callOpenRouter(messages, taskType, body?.model);

    if (!result.reply.trim()) throw new Error("Provider returned an empty response");
    return json(request, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message.includes("is not in the server catalog") || message.includes("model is required")) {
      return json(request, { error: "النموذج المختار غير موجود في قائمة OpenRouter الحالية. حدّث القائمة ثم جرّب مجدداً." }, 400);
    }
    if (message.includes("is not configured")) {
      return json(request, { error: "مفتاح هذا المزود غير مهيأ على الخادم." }, 503);
    }
    console.error("AI provider request failed", error instanceof Error ? error.name : "unknown");
    return json(request, { error: "تعذر إكمال الطلب لدى المزود المحدد. تحقق من توفر النموذج ومفتاحه ثم أعد المحاولة." }, 503);
  }
});
