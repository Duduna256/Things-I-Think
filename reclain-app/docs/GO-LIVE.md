# Going live with Reclain

Do these in order. Each step says where to click. Budget an afternoon; most of it is waiting
for accounts to be approved.

## 0. Run it on your laptop first

```bash
cd reclain-app
npm install
npm run dev          # opens http://localhost:3000 in demo mode
```

With no keys, the app runs in **demo mode**: sample venues, pretend payments, and three pretend
people on the log-in page. Click through a whole booking as a customer, then log in as the
business owner and find it on the dashboard.

## 1. Supabase (the kitchen and the pantry)

Your project **reclain** already exists (region: Frankfurt, `eu-central-1`) with the tables,
security rules and sample venues installed.

1. Supabase → your **reclain** project → **Project Settings → API Keys**. Copy:
   - the Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - the **publishable** key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - the **secret** key → `SUPABASE_SECRET_KEY` (server only; never share it)
2. Copy `.env.example` to `.env.local` and paste them in. Restart `npm run dev`. The black
   demo bar disappears and the app now reads the real database.
3. **Authentication → URL Configuration**: set Site URL to `http://localhost:3000` for now, and
   add `http://localhost:3000/auth/callback` and (later) `https://reclain.com/auth/callback` to
   Redirect URLs.
4. **Authentication → Providers → Google** (optional): follow Supabase's guide to create a Google
   OAuth client, paste the client id and secret, save.
5. **Authentication → Emails**: Supabase's built-in email sender is limited to a few emails an
   hour. Before launch, add your own SMTP (Resend, Postmark or Brevo) under SMTP Settings.
6. Make yourself an admin: sign up in the app, then Supabase → Table editor → `profiles` → your
   row → `is_admin` = true.
7. Optional check: paste `supabase/tests/rls_smoke.sql` into the SQL editor and run it. The
   error message at the end lists 25 checks; every one should say `"ok" : true`.

If you ever start a fresh project: run each file in `supabase/migrations/` in order in the SQL
editor, then `supabase/seed.sql` for sample venues (or skip it for an empty marketplace).

## 2. Payments: Flutterwave (MTN MoMo, Airtel Money, card)

Flutterwave covers Uganda mobile money and cards in one account. Card numbers and PINs never
touch Reclain: customers approve on Flutterwave's page or their phone.

1. Sign up at flutterwave.com and stay in **Test mode** (the toggle at the top). Play money only.
2. **Settings → API Keys**: copy the test secret key → `FLW_SECRET_KEY`.
3. **Settings → Webhooks**: URL `https://<your-site>/api/webhooks/flutterwave`; make up a long
   random "secret hash" and put the same text in `FLW_WEBHOOK_HASH`. Tick "Successful" and
   "Failed" payment events.
4. Set `PAYMENT_PROVIDER=flutterwave`. Book something and pay with Flutterwave's test card or test
   mobile money number from their docs. The booking flips to **Paid** on its own: that's the
   webhook calling the kitchen back.
5. To go live: complete Flutterwave's business verification (KYC), switch to **Live mode**, and
   swap in the live secret key and webhook hash.

Until then, `PAYMENT_PROVIDER=mock` gives a pretend phone prompt with Approve and Decline.

## 3. SMS: Africa's Talking

1. Sign up at africastalking.com. The **sandbox** app is free: username `sandbox`.
2. **Settings → API Key** → `AT_API_KEY`; `AT_USERNAME=sandbox`; `SMS_PROVIDER=africastalking`.
   Test messages appear in their sandbox simulator.
3. To send real SMS: create a live app, top it up, request a sender ID (for example `RECLAIN`,
   approval takes a few days) → `AT_SENDER_ID`, and use the live username and key.

`SMS_PROVIDER=console` prints messages to the server log instead.

## 4. Put it on GitHub and Vercel

The code is already on GitHub (`duduna256/things-i-think`, folder `reclain-app`).

1. vercel.com → **Add New → Project** → import the GitHub repository.
2. **Root Directory**: `reclain-app`. Framework: Next.js (detected).
3. **Environment Variables**: paste everything from your `.env.local`, with
   `NEXT_PUBLIC_SITE_URL` set to the Vercel address for now (e.g. `https://reclain.vercel.app`),
   and add `CRON_SECRET` (any long random text). Your laptop's `.env.local` never leaves your
   laptop: the live app needs its own copy here.
4. **Deploy**. About a minute later you have a live address.
5. Back in Supabase → Authentication → URL Configuration, add the Vercel URL and
   `<vercel-url>/auth/callback`. In Flutterwave, point the webhook at the Vercel URL.
6. The day-before SMS reminders run from `vercel.json` (every day at 18:00 Kampala time).

## 5. Your own name: reclain.com

1. Buy `reclain.com` (in Vercel → Domains, or any registrar).
2. Vercel → your project → **Settings → Domains** → add `reclain.com` and `www.reclain.com`.
3. If you bought it elsewhere, Vercel shows two DNS records (an `A` record and a `CNAME`); copy
   them into your registrar's DNS settings. Wait a few minutes for the padlock.
4. Update `NEXT_PUBLIC_SITE_URL=https://reclain.com` in Vercel, the Site URL and redirect URLs in
   Supabase, and the Flutterwave webhook URL. Redeploy.

## 6. Before the first real customer

- [ ] Flutterwave in live mode, live keys and webhook hash in Vercel
- [ ] Africa's Talking live app with a sender ID
- [ ] Your own SMTP in Supabase so log-in emails arrive
- [ ] Replace the sample venues: suspend or delete them in Supabase, approve real businesses in `/admin`
- [ ] Replace the placeholder contact email and phone in `src/config/site.ts`
- [ ] Book, pay, cancel and review once yourself, on your phone, end to end
- [ ] Add a privacy policy and terms page (ask Claude Code; it's one sentence)

From then on, every change you push to GitHub goes live by itself in about a minute.
