import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url().optional()
);

const optionalKey = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional()
);

const schema = z.object({
  VITE_APP_NAME: z.string().trim().min(1).default("NAWRAS AI AGENT"),
  VITE_SUPABASE_URL: optionalUrl,
  VITE_SUPABASE_ANON_KEY: optionalKey
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error("Invalid public environment configuration", parsed.error.flatten());
  throw new Error("قيمة إعدادات Supabase غير صحيحة. راجع ملف .env.local.");
}

export const env = {
  appName: parsed.data.VITE_APP_NAME,
  supabaseUrl: parsed.data.VITE_SUPABASE_URL,
  supabaseAnonKey: parsed.data.VITE_SUPABASE_ANON_KEY,
  hasSupabaseConfig: Boolean(
    parsed.data.VITE_SUPABASE_URL && parsed.data.VITE_SUPABASE_ANON_KEY
  )
};
