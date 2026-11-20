import { Activity, Bot, Cable, LayoutDashboard, Settings2 } from "lucide-react";
import { StatusPill } from "./StatusPill";
import type { ConnectionState } from "../types/app";

const items = [
  { label: "المحادثة الذكية", icon: Bot, active: true },
  { label: "لوحة العمليات", icon: LayoutDashboard, active: false },
  { label: "التكاملات", icon: Cable, active: false },
  { label: "المراقبة والسجل", icon: Activity, active: false },
  { label: "الإعدادات", icon: Settings2, active: false }
];

export function Sidebar({ connectionState }: { connectionState: ConnectionState }) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#main" aria-label="النورس - الصفحة الرئيسية">
        <span className="brand-logo-wrap">
          <img src={`${import.meta.env.BASE_URL}brand/nawras-logo.png`} alt="شعار النورس" />
        </span>
        <span className="brand-copy">
          <strong>النورس</strong>
          <span>NAWRAS AI AGENT</span>
        </span>
      </a>

      <div className="side-caption">مساحة العمل</div>
      <nav className="nav-list" aria-label="القائمة الرئيسية">
        {items.map(({ label, icon: Icon, active }) => (
          <button
            className={`nav-item ${active ? "active" : ""}`}
            key={label}
            type="button"
            aria-current={active ? "page" : undefined}
            aria-disabled={!active}
            disabled={!active}
            title={active ? undefined : "هذه الصفحة غير مفعلة في النسخة الأولية"}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
            {!active && <small>قريباً</small>}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="connection-card">
          <span>إعداد المنصة</span>
          <StatusPill state={connectionState} />
          <small>
            حالة الإعداد لا تعني أن جلسة المستخدم مصادق عليها أو أن الخدمات متاحة.
          </small>
        </div>
        <small className="version">نسخة تأسيسية · 1.0.0</small>
      </div>
    </aside>
  );
}
