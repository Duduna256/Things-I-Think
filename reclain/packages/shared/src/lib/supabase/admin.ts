import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, serverEnv } from "../env";

// Supabase client with the secret key. It skips Row Level Security, so use it only on the
// server for jobs no user does directly: payment webhooks, reminders, SMS logs.
let admin: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (!serverEnv.supabaseSecretKey) {
    throw new Error("SUPABASE_SECRET_KEY is missing. Add it to .env.local (and to Vercel) to enable payments and reminders.");
  }
  admin ??= createSupabaseClient(env.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
