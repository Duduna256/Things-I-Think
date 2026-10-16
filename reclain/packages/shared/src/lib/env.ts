// Which services are switched on, read from environment variables (.env.local on your
// laptop, Project Settings → Environment Variables on Vercel). See .env.example.

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Supabase now calls this the "publishable" key; older projects call it the "anon" key.
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  // Set to ".reclain.com" once both apps run on subdomains of it, so one log-in covers both.
  // Leave empty on localhost and on *.vercel.app addresses (each app then logs in on its own).
  authCookieDomain: process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN?.trim() || undefined,
};

// Passed to every Supabase client so the log-in cookie is shared across the apps when a
// domain is set.
export const cookieOptions = env.authCookieDomain ? { domain: env.authCookieDomain } : undefined;

// Demo mode: no Supabase keys yet (or RECLAIN_DEMO=1). The app runs on built-in sample
// data with a pretend login, so you can click around before connecting anything.
export const isDemo = !env.supabaseUrl || !env.supabaseKey || process.env.NEXT_PUBLIC_RECLAIN_DEMO === "1";

// Server-only secrets. Never import this object into a "use client" file.
export const serverEnv = {
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  // "mock" or "flutterwave". Read through activePaymentProvider() in src/lib/payments, which
  // refuses a typo instead of quietly falling back to pretend payments.
  paymentProvider: (process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase(),
  flutterwaveSecretKey: process.env.FLW_SECRET_KEY ?? "",
  flutterwaveWebhookHash: process.env.FLW_WEBHOOK_HASH ?? "",
  smsProvider: (process.env.SMS_PROVIDER ?? "console").trim().toLowerCase(),
  africasTalkingUsername: process.env.AT_USERNAME ?? "",
  africasTalkingApiKey: process.env.AT_API_KEY ?? "",
  africasTalkingSenderId: process.env.AT_SENDER_ID ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
};
