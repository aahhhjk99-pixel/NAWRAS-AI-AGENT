export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  provider?: string;
  model?: string;
}

export interface AiChatRequest {
  messages: Array<Pick<ChatMessage, "role" | "content">>;
  taskType?: "general" | "analysis" | "planning";
}

export interface AiChatResponse {
  reply: string;
  provider: string;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

export type ConnectionState = "configured" | "setup_required";

export interface AgentTaskInput {
  title: string;
  description: string;
  status?: "queued" | "planning" | "awaiting_approval";
  priority?: "low" | "normal" | "high";
}
