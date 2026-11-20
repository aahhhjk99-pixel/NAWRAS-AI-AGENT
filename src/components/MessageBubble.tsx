import { Bot, UserRound } from "lucide-react";
import type { ChatMessage } from "../types/app";
import { formatTime } from "../lib/utils";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <article className={`message-row ${isUser ? "message-user" : "message-assistant"}`}>
      <div className="avatar" aria-hidden="true">
        {isUser ? <UserRound size={17} /> : <Bot size={17} />}
      </div>
      <div className="message-content">
        <div className="message-meta">
          <strong>{isUser ? "أنت" : "مساعد النورس"}</strong>
          <time>{formatTime(message.createdAt)}</time>
        </div>
        <div className="message-text">{message.content}</div>
        {message.provider && (
          <small className="model-meta">{message.provider} · {message.model}</small>
        )}
      </div>
    </article>
  );
}
