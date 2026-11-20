import { useCallback, useEffect, useRef, useState } from "react";
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

export function useChat(sessionKey: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionGeneration = useRef(0);

  useEffect(() => {
    sessionGeneration.current += 1;
    setMessages([welcome]);
    setLoading(false);
    setError(null);
  }, [sessionKey]);

  const send = useCallback(async (content: string, provider: AiProvider, model?: string) => {
    const trimmed = content.trim();
    if (!trimmed || loading) return;
    const requestGeneration = sessionGeneration.current;

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

      if (requestGeneration !== sessionGeneration.current) return;

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
      if (requestGeneration === sessionGeneration.current) setError(friendlyError(cause));
    } finally {
      if (requestGeneration === sessionGeneration.current) setLoading(false);
    }
  }, [messages, loading]);

  return { messages, loading, error, send };
}
