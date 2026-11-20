# إعداد مزودي الذكاء الاصطناعي

تعمل الدالة `ai-chat` على الخادم فقط. تضبط المزود المفضل عبر `AI_DEFAULT_PROVIDER` بقيمة `openai` أو `gemini` أو `anthropic`. تحفظ المفاتيح والنماذج في Supabase Edge Function Secrets:

- OpenAI: `OPENAI_API_KEY` و`OPENAI_MODEL`.
- Gemini: `GEMINI_API_KEY` و`GEMINI_MODEL`.
- Anthropic: `ANTHROPIC_API_KEY` و`ANTHROPIC_MODEL`.
- أصول الواجهة المسموح بها: `ALLOWED_ORIGINS`.

يمكن ضبط الأسرار من Supabase CLI، مثلاً:

```bash
supabase secrets set OPENAI_API_KEY=YOUR_KEY AI_DEFAULT_PROVIDER=openai ALLOWED_ORIGINS=https://YOUR_APP_ORIGIN
```

تستخدم الدالة المزود المفضل أولاً، ثم تحاول المزودات الأخرى التي توجد مفاتيحها عند فشل الاستدعاء. لذلك قد تُرسل الرسالة إلى مزود بديل؛ وضّح ذلك للمستخدمين وراجع سياسات الخصوصية لكل مزود. أسماء النماذج الافتراضية أمثلة تشغيلية فقط؛ تحقق من توفر النموذج في حسابك قبل النشر.
