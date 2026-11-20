import { useRef, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowUp, Paperclip, Sparkles } from "lucide-react";
import type { ChatMessage } from "../types/app";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  onSend: (message: string) => void;
}

export function ChatPanel({ messages, loading, error, onSend }: Props) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || loading) return;
    onSend(draft);
    setDraft("");
  }

  return (
    <section className="chat-panel">
      <header className="chat-header">
        <div>
          <span className="eyebrow">مساحة العمل الذكية</span>
          <h1>المحادثة الذكية</h1>
          <p>اكتب طلبك باللغة الطبيعية، وسيتم تحليل الطلب قبل أي إجراء.</p>
        </div>
        <div className="secure-label"><Sparkles size={15} /> وضع آمن</div>
      </header>

      <div className="messages">
        {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
        {loading && (
          <div className="typing-indicator" role="status">
            <span /><span /><span /> جاري التفكير...
          </div>
        )}
        {error && <div className="error-banner" role="alert">{error}</div>}
        <div ref={endRef} />
      </div>

      <form className="composer" onSubmit={submit}>
        <button className="icon-button" type="button" title="المرفقات غير مفعلة حالياً" disabled>
          <Paperclip size={18} />
        </button>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="اكتب طلبك هنا..."
          rows={1}
          maxLength={8000}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          aria-label="اكتب رسالتك"
        />
        <button className="send-button" type="submit" disabled={!draft.trim() || loading} aria-label="إرسال">
          <ArrowUp size={19} />
        </button>
      </form>
      <p className="composer-note">العمليات الخارجية والتغييرات الحساسة تتطلب صلاحيات وموافقة وتحققًا مستقلاً.</p>
    </section>
  );
}
