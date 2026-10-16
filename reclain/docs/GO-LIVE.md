# Going live with reClain Services

Do these in order. Each step says where to click. Budget an afternoon; most of it is waiting
for accounts to be approved.

reClain is two apps on one database: the customer site (`apps/customer`, reclain.com) and
reClain Business (`apps/business`, business.reclain.com). You deploy each as its own Vercel
project from the same GitHub repository. Admins use reClain Business at `/admin`.

## 0. Run it on your laptop first

```bash
cd reclain
npm install
npm run dev             # customer site:   http://localhost:3000  (demo mode)
npm run dev:business    # reClain Business: http://localhost:3001  (second terminal)
```

With no keys, both apps run in **demo mode**: sample venues, pretend payments, and three pretend
people on the log-in page. Click through a whole booking as a customer, then open the business
app, log in as the business owner and find it on the dashboard. (In demo mode each app keeps its
own sample data, so a booking made on one does not show on the other; with the real database they
share everything.)

## 1. Supabase (the kitchen and the pantry)

Your project **reclain** already exists (region: Frankfurt, `eu-central-1`) with the tables,
security rules, the two private storage buckets (`job-photos`, `verification`) and sample venues installed.

1. Supabase → your **reclain** project → **Project Settings → API Keys**. Copy:
   - the Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - the **publishable** key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - the **secret** key → `SUPABASE_SECRET_KEY` (server only; never share it)
2. In `apps/customer`, copy `.env.example` to `.env.local` and paste them in. Do the same in
   `apps/business` (same three values). Restart both dev servers. The black demo bar disappears
   and the apps now read the real database.
3. **Authentication → URL Configuration**: set Site URL to `http://localhost:3000` for now, and
   add `http://localhost:3000/**`, `http://localhost:3001/**` and (later) `https://reclain.com/**`
   and `https://business.reclain.com/**` to Redirect URLs. The `/**` on the end matters: after an
   email link or Google, each app comes back to its own `/auth/callback?next=...`, and Supabase
   only lets it through if the whole address matches an entry.
4. **Authentication → Providers → Google** (optional): follow Supabase's guide to create a Google
   OAuth client, paste the client id and secret, save.
5. **Authentication → Emails**: Supabase's built-in email sender is limited to a few emails an
   hour. Before launch, add your own SMTP (Resend, Postmark or Brevo) under SMTP Settings.
   Optional, and worth it: under **Templates**, open **Magic Link** and then **Confirm signup**,
   and in each one replace `{{ .ConfirmationURL }}` in the link with
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}`.
   The standard links only work in the browser that asked for them, so someone who asks on their
   laptop and taps the email on their phone gets an error. The new links work on any device.
   (`.RedirectTo` carries the full address of whichever app asked, so the link lands on the right one.)
6. Make yourself an admin: sign up in either app, then Supabase → Table editor → `profiles` → your
   row → `is_admin` = true. The Admin link then appears in reClain Business.
7. Optional check: paste `supabase/tests/rls_smoke.sql` into the SQL editor and run it. The
   error message at the end lists every check; each one should say `"ok" : true`.
8. Check the database's own copy of the booking rules. A few settings live in two places: the
   `app_settings` table (the database checks bookings and new businesses against them) and
   `packages/shared/src/config` (the apps use them to show times and messages). They must say the same thing:

   | `app_settings` key | Must match | Starts as |
   |---|---|---|
   | `require_business_approval` | `businessApproval` in `config/features.ts` | `true` |
   | `pending_payment_minutes` | `pendingPaymentMinutes` in `config/site.ts` | `30` |
   | `slot_step_minutes` | `slotStepMinutes` in `config/site.ts` | `30` |
   | `min_lead_minutes` | `minLeadMinutes` in `config/site.ts` | `60` |
   | `booking_window_days` | `bookingWindowDays` in `config/site.ts` | `14` |
   | `timezone` | `timezone` in `config/site.ts` | `"Africa/Kampala"` |
   | `platform_fee_percent` | the fee percent in `packages/shared/src/lib/books/` | `10` |

   To see them: Supabase → **SQL Editor** → New query, paste `select * from app_settings;`, and
   click Run. To change one, run one line like this (here: hold unpaid bookings for 45 minutes):

   ```sql
   update app_settings set value = '45' where key = 'pending_payment_minutes';
   ```

   Then change the matching value in the app too. Text values keep their double quotes
   inside the single ones: `set value = '"Africa/Kampala"'`. Yes and no are `'true'` and `'false'`.

If you ever start a fresh project: run each file in `supabase/migrations/` in order in the SQL
editor, then `supabase/seed.sql` for sample venues (or skip it for an empty marketplace).

## 2. Payments: Flutterwave (MTN MoMo, Airtel Money, card)

Flutterwave covers Uganda mobile money and cards in one account. Card numbers and PINs never
touch reClain: customers approve on Flutterwave's page or their phone. Payments only happen on
the customer site, so these keys go in `apps/customer` (and later the customer Vercel project).

1. Sign up at flutterwave.com and stay in **Test mode** (the toggle at the top). Play money only.
2. **Settings → API Keys**: copy the test secret key → `FLW_SECRET_KEY`.
3. **Settings → Webhooks**: URL `https://reclain.com/api/webhooks/flutterwave` (your Vercel
   address until the domain is on); make up a long random "secret hash" and put the same text in
   `FLW_WEBHOOK_HASH`. Tick "Successful" and "Failed" payment events.
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
   Test messages appear in their sandbox simulator. Put the same values in both apps: the
   customer site sends confirmations and reminders, the business app texts a customer when a
   venue cancels.
3. To send real SMS: create a live app, top it up, request a sender ID (for example `RECLAIN`,
   approval takes a few days) → `AT_SENDER_ID`, and use the live username and key.

`SMS_PROVIDER=console` prints messages to the server log instead.

## 4. Put it on GitHub and Vercel (two projects)

The code is already on GitHub (`duduna256/things-i-think`, folder `reclain`). You make two Vercel
projects from the same repository; each one builds one app.

**Project 1: the customer site**

1. vercel.com → **Add New → Project** → import the GitHub repository.
2. **Root Directory**: `reclain/apps/customer`. Framework: Next.js (detected). Vercel finds the
   shared `package-lock.json` in `reclain/` on its own; if the first build log says it could not
   find `next` or the shared package, set Settings → General → **Install Command** to
   `cd ../.. && npm install` and redeploy.
3. **Environment Variables**: paste everything from `apps/customer/.env.local`, plus
   `CRON_SECRET` (any long random text). Set `NEXT_PUBLIC_SITE_URL` and
   `NEXT_PUBLIC_CUSTOMER_URL` to this project's Vercel address for now (e.g.
   `https://reclain.vercel.app`) and `NEXT_PUBLIC_BUSINESS_URL` to the business project's
   address once you have it (step 2 below; come back and fill it in). Leave
   `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` empty until the domains are on.
   Your laptop's `.env.local` never leaves your laptop: the live app needs its own copy here.
   Set the URL variables in every Vercel environment you use (**Production** and **Preview**),
   each to that environment's own `https://` address. `NEXT_PUBLIC_SITE_URL` is where
   Flutterwave sends customers back after paying, where log-in emails point, and the link in
   every SMS, so a wrong or missing value sends people to the wrong place (or to `localhost`,
   which is nowhere). If you use Preview, add its address with `/**` to Supabase's Redirect URLs as well.
4. **Deploy**. About a minute later you have a live address.

**Project 2: reClain Business**

1. **Add New → Project** → import the same repository again. Name it `reclain-business`.
2. **Root Directory**: `reclain/apps/business`. Same install note as above.
3. **Environment Variables**: everything from `apps/business/.env.local`, with
   `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_BUSINESS_URL` set to this project's address (e.g.
   `https://reclain-business.vercel.app`) and `NEXT_PUBLIC_CUSTOMER_URL` to the customer
   project's address. Then go back to the customer project and set its `NEXT_PUBLIC_BUSINESS_URL`
   to this address; redeploy both.
4. **Deploy**.

**Then**

5. Supabase → Authentication → URL Configuration: Site URL = the customer address; add both
   Vercel addresses with `/**` to Redirect URLs. In Flutterwave, point the webhook at the
   customer address.
6. The day-before SMS reminders run from `apps/customer/vercel.json` (every day at 18:00 Kampala time).
7. On `*.vercel.app` addresses the two apps log in separately (the cookie cannot be shared
   between two different vercel.app names). That is fine for testing; the domain step fixes it.

## 5. Your own name: reclain.com and business.reclain.com

1. Buy `reclain.com` (in Vercel → Domains, or any registrar).
2. Customer project → **Settings → Domains** → add `reclain.com` and `www.reclain.com`.
   Business project → **Settings → Domains** → add `business.reclain.com`.
3. If you bought it elsewhere, Vercel shows the DNS records (an `A` record for the root, a
   `CNAME` for `www` and one for `business`); copy them into your registrar's DNS settings. Wait a
   few minutes for the padlock.
4. In **both** projects set `NEXT_PUBLIC_CUSTOMER_URL=https://reclain.com`,
   `NEXT_PUBLIC_BUSINESS_URL=https://business.reclain.com` and
   `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.reclain.com` (the leading dot matters: it lets one log-in cover
   both addresses). Set each project's `NEXT_PUBLIC_SITE_URL` to its own address. In Supabase set
   the Site URL to `https://reclain.com` and add `https://reclain.com/**` and
   `https://business.reclain.com/**` to the Redirect URLs. Point the Flutterwave webhook at
   `https://reclain.com/api/webhooks/flutterwave`. Redeploy both projects.
5. Tell businesses to open `business.reclain.com` on their phone and use "Add to Home Screen":
   it installs like an app.

## 6. Before the first real customer

- [ ] Flutterwave in live mode, live keys and webhook hash in the customer Vercel project
- [ ] Africa's Talking live app with a sender ID, in both projects
- [ ] Your own SMTP in Supabase so log-in emails arrive
- [ ] Replace the sample venues: suspend or delete them in Supabase, approve real businesses in `/admin`
- [ ] Replace the placeholder contact email and phone in `packages/shared/src/config/site.ts`
- [ ] Book, pay, cancel and review once yourself, on your phone, end to end; then check in, add a
      photo and check out of that job from the business app, and look at the Money tab afterwards
- [ ] Know who sends the money. Customers pay into the reClain Flutterwave account and nothing
      moves on from there by itself. Each business's Money tab shows what reClain holds for them;
      send it by MoMo from the Flutterwave dashboard, then record it in `/admin/payouts` so their
      books balance. Any booking that was paid and then cancelled needs a refund.
- [ ] Decide who reviews verification evidence in `/admin/verification`, and how you check an ID
      or a company registration before passing it. The badge customers see says only what passed.
- [ ] Pick someone to check the `sms_log` and `payments` tables in Supabase (Table editor) every
      day at first: texts with status `failed`, and payments stuck on `pending` or marked `failed`
- [ ] Add a privacy policy and terms page (ask Claude Code; it's one sentence)

From then on, every change you push to GitHub goes live by itself in about a minute, in both projects.
