import { useCallback, useState } from "react";
import { sendAiMessage } from "../services/ai";
import { friendlyError, makeId } from "../lib/utils";
import type { AiProvider, ChatMessage } from "../types/app";

const welcome: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "أهلاً بك في NAWRAS AI AGENT. نقدر نساعدك في التحليل والتخطيط وفهم العمليات. تنفيذ العمليات داخل نظام النورس غير مفعّل حالياً إلى حين التحقق من الواجهات والصلاحيات.",
  createdAt: new Date().toISOString()
};

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (content: string, provider: AiProvider, model?: string) => {
    const trimmed = content.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString()
    };

    const next = [...messages, userMessage];
    setMessages(next);
    setLoading(true);
    setError(null);

    try {
      const result = await sendAiMessage({
        messages: next
          .filter((message) => message.id !== "welcome")
          .map(({ role, content: text }) => ({ role, content: text })),
        provider,
        ...(provider === "openrouter" && model ? { model } : {}),
        taskType: provider === "gemini" ? "analysis" : "general"
      });

      const assistantMessage: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: result.reply,
        createdAt: new Date().toISOString(),
        provider: result.provider,
        model: result.model
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  return { messages, loading, error, send };
}
