export function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("ar-LY", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

export function friendlyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "صار خطأ غير متوقع. حاول مرة ثانية.";
}
