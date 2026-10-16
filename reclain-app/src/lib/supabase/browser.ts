"use client";
import { createBrowserClient } from "@supabase/ssr";
import { env } from "../env";

// Supabase client for "use client" components (used by the log-in screen).
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseKey);
}
