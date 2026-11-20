import type { AgentTaskInput } from "../types/app";

export async function createAgentTask(input: AgentTaskInput) {
  void input;

  return {
    accepted: false as const,
    message:
      "إنشاء المهام غير مفعّل. يلزم اعتماد مخطط البيانات والصلاحيات قبل السماح بأي كتابة."
  };
}
