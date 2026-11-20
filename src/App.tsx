import { ShieldCheck } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { ChatPanel } from "./components/ChatPanel";
import { useChat } from "./hooks/useChat";
import { env } from "./config/env";
import { getNawrasIntegrationStatus } from "./services/integration";

export default function App() {
  const chat = useChat();
  const integration = getNawrasIntegrationStatus();
  const connectionState = env.hasSupabaseConfig ? "configured" : "setup_required";

  return (
    <div className="app-shell">
      <Sidebar connectionState={connectionState} />
      <main className="main-area" id="main">
        <header className="topbar">
          <div className="breadcrumb">مساحة النورس <span>/</span> المساعد الذكي</div>
          <div className="top-actions">
            <span className="environment-tag">مساعد العمليات</span>
            <div className="user-chip" aria-label="حالة الحساب">
              <span className="user-avatar">ن</span>
              <div><strong>مساحة العمل</strong><small>لا توجد بيانات حساب تجريبية</small></div>
            </div>
          </div>
        </header>

        <div className="workspace">
          <section className="welcome-strip" aria-label="تعريف المساعد">
            <div className="welcome-icon"><ShieldCheck size={20} /></div>
            <div>
              <strong>مساعد ذكي لعمليات الشحن والتوصيل</strong>
              <span>للفهم والتحليل والتخطيط — دون تنفيذ تغييرات على أنظمة الشركة.</span>
            </div>
            <span className="safe-badge">وضع آمن</span>
          </section>

          <div className="integration-notice" role="note">
            <strong>تكامل النورس: معاينة فقط</strong>
            <span>{integration.note}</span>
          </div>

          <ChatPanel
            messages={chat.messages}
            loading={chat.loading}
            error={chat.error}
            onSend={chat.send}
          />
          <p className="workspace-footnote">
            إرسال الرسائل يتطلب إعداد Supabase وجلسة دخول مصرحاً بها. المفاتيح السرية تبقى في الخادم.
          </p>
        </div>
      </main>
    </div>
  );
}
