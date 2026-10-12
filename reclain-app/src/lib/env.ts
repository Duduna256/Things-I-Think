// Which services are switched on, read from environment variables (.env.local on your
// laptop, Project Settings → Environment Variables on Vercel). See .env.example.

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Supabase now calls this the "publishable" key; older projects call it the "anon" key.
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

// Demo mode: no Supabase keys yet (or RECLAIN_DEMO=1). The app runs on built-in sample
// data with a pretend login, so you can click around before connecting anything.
export const isDemo = !env.supabaseUrl || !env.supabaseKey || process.env.NEXT_PUBLIC_RECLAIN_DEMO === "1";

// Server-only secrets. Never import this object into a "use client" file.
export const serverEnv = {
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  paymentProvider: (process.env.PAYMENT_PROVIDER ?? "mock") as "mock" | "flutterwave",
  flutterwaveSecretKey: process.env.FLW_SECRET_KEY ?? "",
  flutterwaveWebhookHash: process.env.FLW_WEBHOOK_HASH ?? "",
  smsProvider: (process.env.SMS_PROVIDER ?? "console") as "console" | "africastalking",
  africasTalkingUsername: process.env.AT_USERNAME ?? "",
  africasTalkingApiKey: process.env.AT_API_KEY ?? "",
  africasTalkingSenderId: process.env.AT_SENDER_ID ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
};
