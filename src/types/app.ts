export type ChatRole = "user" | "assistant";

export type AiProvider = "gemini" | "groq" | "openrouter";
export type AiTaskType = "general" | "analysis" | "planning";

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
  provider: AiProvider;
  model?: string;
  taskType?: AiTaskType;
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

export interface AiProviderCapability {
  available: boolean;
  model: string;
}

export interface AiCapabilitiesResponse {
  providers: Record<AiProvider, AiProviderCapability>;
}

export interface AiModel {
  id: string;
  name: string;
  contextLength?: number;
}

export interface AiModelsResponse {
  models: AiModel[];
}

export type ConnectionState = "configured" | "setup_required";

export interface AgentTaskInput {
  title: string;
  description: string;
  status?: "queued" | "planning" | "awaiting_approval";
  priority?: "low" | "normal" | "high";
}
