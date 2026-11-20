import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff, LockKeyhole, LogIn, Mail, ShieldCheck } from "lucide-react";

interface Props {
  configured: boolean;
  busy: boolean;
  onSignIn: (email: string, password: string) => Promise<void>;
}

function friendlyAuthError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("invalid login credentials") || message.includes("invalid email or password")) {
      return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    }
    if (message.includes("email not confirmed")) {
      return "الحساب يحتاج إلى تأكيد البريد الإلكتروني قبل الدخول.";
    }
    if (message.includes("fetch") || message.includes("network")) {
      return "تعذر الاتصال بخدمة الدخول. تحقق من اتصال الإنترنت وحاول مجدداً.";
    }
  }
  return "تعذر تسجيل الدخول. تحقق من بياناتك وحاول مرة أخرى.";
}

export function AuthScreen({ configured, busy, onSignIn }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitting || !configured) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSignIn(email.trim(), password);
    } catch (cause) {
      setError(friendlyAuthError(cause));
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = !configured || busy || submitting;

  return (
    <main className="auth-page" dir="rtl">
      <div className="auth-glow auth-glow-one" aria-hidden="true" />
      <div className="auth-glow auth-glow-two" aria-hidden="true" />
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <span className="auth-logo"><img src={`${import.meta.env.BASE_URL}brand/nawras-logo.png`} alt="" /></span>
          <div><strong>النورس</strong><span>NAWRAS AI AGENT</span></div>
        </div>

        <div className="auth-mark"><ShieldCheck size={21} /></div>
        <p className="auth-kicker">مساحة عمل خاصة</p>
        <h1 id="auth-title">تسجيل الدخول</h1>
        <p className="auth-description">ادخل إلى مساعد النورس للتحليل والتخطيط ومراجعة العمليات.</p>

        {!configured && (
          <div className="auth-error" role="alert">
            إعدادات Supabase غير متوفرة في هذا البناء. أعد نشر الموقع بعد ضبط رابط المشروع والمفتاح العام.
          </div>
        )}
        {error && <div className="auth-error" role="alert">{error}</div>}

        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="auth-email">البريد الإلكتروني</label>
          <div className="auth-input-wrap">
            <Mail size={17} aria-hidden="true" />
            <input
              id="auth-email"
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              required
              disabled={disabled}
              dir="ltr"
            />
          </div>

          <label htmlFor="auth-password">كلمة المرور</label>
          <div className="auth-input-wrap">
            <LockKeyhole size={17} aria-hidden="true" />
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="أدخل كلمة المرور"
              required
              disabled={disabled}
              dir="ltr"
            />
            <button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button className="auth-submit" type="submit" disabled={disabled}>
            <LogIn size={17} />
            <span>{submitting || busy ? "جارٍ التحقق..." : "دخول آمن"}</span>
          </button>
        </form>

        <p className="auth-footnote"><ShieldCheck size={14} /> الوصول متاح للحسابات المصرّح بها فقط</p>
        <p className="auth-brand-note">مساعد ذكي لعمليات الشحن والتوصيل — دون تنفيذ تغييرات على أنظمة الشركة.</p>
      </section>
    </main>
  );
}
