import { supabase } from "../lib/supabase";
import type {
  AiCapabilitiesResponse,
  AiChatRequest,
  AiChatResponse,
  AiModelsResponse
} from "../types/app";

async function invokeAi<T>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) {
    throw new Error("أضف إعدادات Supabase العامة إلى البناء قبل استخدام المساعد.");
  }

  const { data, error } = await supabase.functions.invoke<T>("ai-chat", { body });
  if (error) {
    const context = "context" in error ? error.context : undefined;
    if (context instanceof Response) {
      const payload = await context.clone().json().catch(() => null) as { error?: string } | null;
      if (payload?.error) throw new Error(payload.error);
    }
    if (error.message.toLowerCase().includes("jwt") || error.message.includes("401")) {
      throw new Error("انتهت جلسة الدخول. سجّل الدخول من جديد.");
    }
    throw new Error(error.message || "تعذر الاتصال بخدمة الذكاء الاصطناعي.");
  }
  if (!data) throw new Error("لم تصل استجابة من خدمة الذكاء الاصطناعي.");
  return data;
}

export async function sendAiMessage(payload: AiChatRequest): Promise<AiChatResponse> {
  const result = await invokeAi<AiChatResponse & { error?: string }>(payload as unknown as Record<string, unknown>);
  if (result.error) throw new Error(result.error);
  if (!result.reply?.trim()) throw new Error("استلمنا استجابة غير مكتملة من خدمة الذكاء الاصطناعي.");
  return result;
}

export async function loadAiCapabilities(): Promise<AiCapabilitiesResponse> {
  return invokeAi<AiCapabilitiesResponse>({ action: "capabilities" });
}

export async function loadOpenRouterModels(): Promise<AiModelsResponse> {
  return invokeAi<AiModelsResponse>({ action: "models" });
}
