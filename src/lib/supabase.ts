import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

export const supabase =
  env.hasSupabaseConfig && env.supabaseUrl && env.supabaseAnonKey
    ? createClient(
        env.supabaseUrl,
        env.supabaseAnonKey,
        {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      headers: { "X-Client-Info": "nawras-ai-agent-web/1.0.0" }
    }
        }
      )
    : null;
