import { Circle } from "lucide-react";
import type { ConnectionState } from "../types/app";

const labels: Record<ConnectionState, string> = {
  configured: "الإعداد موجود",
  setup_required: "يحتاج إلى إعداد"
};

export function StatusPill({ state }: { state: ConnectionState }) {
  return (
    <span className={`status-pill status-${state}`} role="status">
      <Circle size={8} fill="currentColor" aria-hidden="true" />
      {labels[state]}
    </span>
  );
}
