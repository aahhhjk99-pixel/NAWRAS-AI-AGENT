import { useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { AuthScreen } from "./components/AuthScreen";
import { Sidebar } from "./components/Sidebar";
import { ChatPanel } from "./components/ChatPanel";
import { useAuth } from "./hooks/useAuth";
import { useChat } from "./hooks/useChat";
import { env } from "./config/env";
import { getNawrasIntegrationStatus } from "./services/integration";

export default function App() {
  const auth = useAuth();
  const chat = useChat();
  const [accountError, setAccountError] = useState<string | null>(null);
  const integration = getNawrasIntegrationStatus();
  const connectionState = env.hasSupabaseConfig ? "configured" : "setup_required";

  if (auth.loading) {
    return (
      <main className="app-loading" dir="rtl" role="status">
        <span className="auth-logo"><img src={`${import.meta.env.BASE_URL}brand/nawras-logo.png`} alt="" /></span>
        <ShieldCheck size={20} /> جارٍ التحقق من الجلسة...
      </main>
    );
  }

  if (!auth.session) {
    return <AuthScreen configured={env.hasSupabaseConfig} busy={auth.loading} onSignIn={auth.signIn} />;
  }

  async function signOut() {
    setAccountError(null);
    try {
      await auth.signOut();
    } catch {
      setAccountError("تعذر إنهاء الجلسة الآن. حاول مرة أخرى.");
    }
  }

  const email = auth.session.user.email ?? "حساب مصادق عليه";
  const avatar = email.slice(0, 1).toUpperCase();

  return (
    <div className="app-shell">
      <Sidebar connectionState={connectionState} />
      <main className="main-area" id="main">
        <header className="topbar">
          <div className="breadcrumb">مساحة النورس <span>/</span> المساعد الذكي</div>
          <div className="top-actions">
            <span className="environment-tag">مساعد العمليات</span>
            <div className="user-chip" aria-label="حالة الحساب">
              <span className="user-avatar">{avatar}</span>
              <div><strong>حساب نشط</strong><small dir="ltr">{email}</small></div>
            </div>
            <button className="logout-button" type="button" onClick={() => void signOut()} aria-label="تسجيل الخروج">
              <LogOut size={16} /><span>خروج</span>
            </button>
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
          {accountError && <div className="error-banner" role="alert">{accountError}</div>}

          <ChatPanel
            messages={chat.messages}
            loading={chat.loading}
            error={chat.error}
            onSend={chat.send}
          />
          <p className="workspace-footnote">
            الخدمة تتطلب جلسة دخول مصادقاً عليها؛ مفاتيح المزودات تبقى على الخادم ولا تظهر في المتصفح.
          </p>
        </div>
      </main>
    </div>
  );
}
