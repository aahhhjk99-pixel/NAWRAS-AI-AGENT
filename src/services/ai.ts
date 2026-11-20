import { supabase } from "../lib/supabase";
import type { AiChatRequest, AiChatResponse } from "../types/app";

export async function sendAiMessage(payload: AiChatRequest): Promise<AiChatResponse> {
  if (!supabase) {
    throw new Error("أضف رابط Supabase والمفتاح العام في .env.local أولاً.");
  }

  const { data, error } = await supabase.functions.invoke<AiChatResponse>("ai-chat", {
    body: payload
  });

  if (error) {
    if (error.message.toLowerCase().includes("jwt") || error.message.includes("401")) {
      throw new Error("يلزم تسجيل الدخول بحساب مصرح به قبل استخدام المساعد.");
    }
    throw new Error(error.message || "تعذر الاتصال بخدمة الذكاء الاصطناعي.");
  }

  if (!data?.reply?.trim()) {
    throw new Error("استلمنا استجابة غير مكتملة من خدمة الذكاء الاصطناعي.");
  }

  return data;
}
