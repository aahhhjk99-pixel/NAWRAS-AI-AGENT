import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowUp, Bot, CircleHelp, Paperclip, Sparkles, Zap } from "lucide-react";
import { friendlyError } from "../lib/utils";
import { loadAiCapabilities, loadOpenRouterModels } from "../services/ai";
import type { AiModel, AiProvider, AiProviderCapability, ChatMessage } from "../types/app";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  onSend: (message: string, provider: AiProvider, model?: string) => void;
}

const providerLabels: Record<AiProvider, string> = {
  gemini: "Gemini · تحليل وتخطيط",
  groq: "Groq · رد سريع",
  openrouter: "OpenRouter · تجربة النماذج"
};

const providerDescriptions: Record<AiProvider, string> = {
  gemini: "Gemini Flash مناسب للتحليل والتخطيط.",
  groq: "نموذج سريع للردود المختصرة عند إضافة مفتاح Groq صالح.",
  openrouter: "اختر من قائمة النماذج الحية المتاحة في OpenRouter."
};

export function ChatPanel({ messages, loading, error, onSend }: Props) {
  const [draft, setDraft] = useState("");
  const [provider, setProvider] = useState<AiProvider>("gemini");
  const [capabilities, setCapabilities] = useState<Partial<Record<AiProvider, AiProviderCapability>> | null>(null);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);
  const [models, setModels] = useState<AiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void loadAiCapabilities()
      .then((result) => {
        if (active) setCapabilities(result.providers);
      })
      .catch((cause) => {
        if (active) setCapabilityError(friendlyError(cause));
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (provider !== "openrouter" || !capabilities?.openrouter?.available) return;
    let active = true;
    setModelsLoading(true);
    setModelsError(null);
    void loadOpenRouterModels()
      .then((result) => {
        if (!active) return;
        setModels(result.models);
        setSelectedModel((current) => result.models.some((model) => model.id === current) ? current : (result.models[0]?.id ?? ""));
      })
      .catch((cause) => {
        if (active) setModelsError(friendlyError(cause));
      })
      .finally(() => {
        if (active) setModelsLoading(false);
      });
    return () => { active = false; };
  }, [provider, capabilities?.openrouter?.available]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || loading || !capabilities?.[provider]?.available) return;
    if (provider === "openrouter" && !selectedModel) return;
    onSend(draft, provider, provider === "openrouter" ? selectedModel : undefined);
    setDraft("");
  }

  const selectedCapability = capabilities?.[provider];
  const canSend = Boolean(draft.trim()) && !loading && Boolean(selectedCapability?.available)
    && (provider !== "openrouter" || Boolean(selectedModel));

  return (
    <section className="chat-panel">
      <header className="chat-header">
        <div>
          <span className="eyebrow">مساحة العمل الذكية</span>
          <h1>المحادثة الذكية</h1>
          <p>اختر أسلوب المساعدة، ثم اكتب طلبك باللغة الطبيعية.</p>
        </div>
        <div className="secure-label"><Sparkles size={15} /> وضع آمن</div>
      </header>

      <div className="provider-toolbar" aria-label="إعداد الذكاء الاصطناعي">
        <div className="provider-choice">
          <label htmlFor="ai-provider">طريقة المساعدة</label>
          <select id="ai-provider" value={provider} onChange={(event) => setProvider(event.target.value as AiProvider)} disabled={!capabilities}>
            {(Object.keys(providerLabels) as AiProvider[]).map((key) => (
              <option key={key} value={key} disabled={Boolean(capabilities && !capabilities[key]?.available)}>
                {providerLabels[key]}{capabilities && !capabilities[key]?.available ? " · غير مهيأ" : ""}
              </option>
            ))}
          </select>
          <small>{providerDescriptions[provider]}</small>
        </div>
        {provider === "openrouter" && (
          <div className="provider-choice model-choice">
            <label htmlFor="openrouter-model">النموذج</label>
            <select id="openrouter-model" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} disabled={modelsLoading || models.length === 0}>
              {models.length === 0 && <option value="">{modelsLoading ? "جارٍ تحميل النماذج..." : "لا توجد نماذج متاحة"}</option>}
              {models.map((model) => (
                <option key={model.id} value={model.id}>{model.name} · {model.id}</option>
              ))}
            </select>
            <small>{modelsLoading ? "يتم جلب القائمة من OpenRouter بأمان." : `${models.length} نموذجاً متاحاً`}</small>
          </div>
        )}
        <div className={`provider-status ${selectedCapability?.available ? "is-ready" : "is-pending"}`} role="status">
          {provider === "groq" ? <Zap size={15} /> : provider === "openrouter" ? <CircleHelp size={15} /> : <Bot size={15} />}
          <span>{!capabilities ? "جارٍ فحص الخدمة" : selectedCapability?.available ? "جاهز" : "بانتظار إعداد المفتاح"}</span>
        </div>
      </div>
      {capabilityError && <div className="provider-inline-error" role="alert">تعذر فحص إعدادات الذكاء الاصطناعي: {capabilityError}</div>}
      {modelsError && <div className="provider-inline-error" role="alert">تعذر تحميل نماذج OpenRouter: {modelsError}</div>}

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
          placeholder={selectedCapability?.available ? "اكتب طلبك هنا..." : "هذا الخيار غير مهيأ حالياً"}
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
        <button className="send-button" type="submit" disabled={!canSend} aria-label="إرسال">
          <ArrowUp size={19} />
        </button>
      </form>
      <p className="composer-note">العمليات الخارجية والتغييرات الحساسة تتطلب صلاحيات وموافقة وتحققاً مستقلاً.</p>
    </section>
  );
}
