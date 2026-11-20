export interface IntegrationStatus {
  mode: "discovery_only";
  target: string;
  executionEnabled: false;
  note: string;
}

/**
 * وضع آمن مبدئي: لا يرسل طلبات تسجيل دخول أو أوامر تغيير إلى نظام النورس.
 * بعد موافقة الشركة وتوثيق واجهاتها الرسمية، يُضاف موصل مستقل لكل قدرة
 * مع تحقق من الصلاحية وموافقة بشرية واختبار نتيجة مستقل.
 */
export function getNawrasIntegrationStatus(): IntegrationStatus {
  return {
    mode: "discovery_only",
    target: "https://backoffice.nawris.algoriza.com",
    executionEnabled: false,
    note: "التكامل الفعلي غير مفعّل إلى حين التحقق من الواجهات والصلاحيات."
  };
}
