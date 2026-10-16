# Going live with reClain Services

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
   add `http://localhost:3000/**` and (later) `https://<your domain>/**` to Redirect URLs. The
   `/**` on the end matters: after an email link or Google, the app comes back to
   `/auth/callback?next=...` (the page people were on), and Supabase only lets it through if the
   whole address matches an entry.
4. **Authentication → Providers → Google** (optional): follow Supabase's guide to create a Google
   OAuth client, paste the client id and secret, save.
5. **Authentication → Emails**: Supabase's built-in email sender is limited to a few emails an
   hour. Before launch, add your own SMTP (Resend, Postmark or Brevo) under SMTP Settings.
   Optional, and worth it: under **Templates**, open **Magic Link** and then **Confirm signup**,
   and in each one replace `{{ .ConfirmationURL }}` in the link with
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}`.
   The standard links only work in the browser that asked for them, so someone who asks on their
   laptop and taps the email on their phone gets an error. The new links work on any device.
6. Make yourself an admin: sign up in the app, then Supabase → Table editor → `profiles` → your
   row → `is_admin` = true.
7. Optional check: paste `supabase/tests/rls_smoke.sql` into the SQL editor and run it. The
   error message at the end lists 25 checks; every one should say `"ok" : true`.
8. Check the database's own copy of the booking rules. A few settings live in two places: the
   `app_settings` table (the database checks bookings and new businesses against them) and `src/config` (the
   app uses them to show times and messages). They must say the same thing:

   | `app_settings` key | Must match | Starts as |
   |---|---|---|
   | `require_business_approval` | `businessApproval` in `src/config/features.ts` | `true` |
   | `pending_payment_minutes` | `pendingPaymentMinutes` in `src/config/site.ts` | `30` |
   | `slot_step_minutes` | `slotStepMinutes` in `src/config/site.ts` | `30` |
   | `min_lead_minutes` | `minLeadMinutes` in `src/config/site.ts` | `60` |
   | `booking_window_days` | `bookingWindowDays` in `src/config/site.ts` | `14` |
   | `timezone` | `timezone` in `src/config/site.ts` | `"Africa/Kampala"` |

   To see them: Supabase → **SQL Editor** → New query, paste `select * from app_settings;`, and
   click Run. To change one, run one line like this (here: hold unpaid bookings for 45 minutes):

   ```sql
   update app_settings set value = '45' where key = 'pending_payment_minutes';
   ```

   Then change the matching value in `src/config` too. Text values keep their double quotes
   inside the single ones: `set value = '"Africa/Kampala"'`. Yes and no are `'true'` and `'false'`.

If you ever start a fresh project: run each file in `supabase/migrations/` in order in the SQL
editor, then `supabase/seed.sql` for sample venues (or skip it for an empty marketplace).

## 2. Payments: Flutterwave (MTN MoMo, Airtel Money, card)

Flutterwave covers Uganda mobile money and cards in one account. Card numbers and PINs never
touch reClain: customers approve on Flutterwave's page or their phone.

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

Until then, `PAYMENT_PROVIDER=mock` gives a pretend phone prompt with Approve and Decline. Use it
only while you test: anyone can press Approve, so never leave it on once real customers arrive.
With your real database connected, MoMo, Airtel and card stay hidden until `PAYMENT_PROVIDER` is
set to exactly `mock` or `flutterwave`; customers can still book with cash in the meantime.

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
   Set `NEXT_PUBLIC_SITE_URL` in every Vercel environment you use (**Production** and
   **Preview**), each to that environment's own `https://` address. It is where Flutterwave sends
   customers back after paying, where log-in emails point, and the link in every SMS, so a
   wrong or missing value sends people to the wrong place (or to `localhost`, which is nowhere).
   If you use Preview, add its address with `/**` to Supabase's Redirect URLs as well.
4. **Deploy**. About a minute later you have a live address.
5. Back in Supabase → Authentication → URL Configuration, set Site URL to the Vercel address
   and add `<vercel-url>/**` to Redirect URLs. In Flutterwave, point the webhook at the Vercel URL.
6. The day-before SMS reminders run from `vercel.json` (every day at 18:00 Kampala time).

## 5. Your own name: reclain.com

1. Buy `reclain.com` (in Vercel → Domains, or any registrar).
2. Vercel → your project → **Settings → Domains** → add `reclain.com` and `www.reclain.com`.
3. If you bought it elsewhere, Vercel shows two DNS records (an `A` record and a `CNAME`); copy
   them into your registrar's DNS settings. Wait a few minutes for the padlock.
4. Update `NEXT_PUBLIC_SITE_URL=https://reclain.com` in Vercel (Production), the Site URL in
   Supabase plus `https://reclain.com/**` in its Redirect URLs, and the Flutterwave webhook URL.
   Redeploy.

## 6. Before the first real customer

- [ ] Flutterwave in live mode, live keys and webhook hash in Vercel
- [ ] Africa's Talking live app with a sender ID
- [ ] Your own SMTP in Supabase so log-in emails arrive
- [ ] Replace the sample venues: suspend or delete them in Supabase, approve real businesses in `/admin`
- [ ] Replace the placeholder contact email and phone in `src/config/site.ts`
- [ ] Book, pay, cancel and review once yourself, on your phone, end to end
- [ ] Know who sends the money. Customers pay into the reClain Flutterwave account and nothing
      moves on from there by itself: payouts to businesses and refunds to customers are done by
      hand from the Flutterwave dashboard. Any booking that was paid and then cancelled needs a refund.
- [ ] Pick someone to check the `sms_log` and `payments` tables in Supabase (Table editor) every
      day at first: texts with status `failed`, and payments stuck on `pending` or marked `failed`
- [ ] Add a privacy policy and terms page (ask Claude Code; it's one sentence)

From then on, every change you push to GitHub goes live by itself in about a minute.
