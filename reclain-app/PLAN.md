# Reclain: the plan

Reclain (said "reclaim") is a booking app for Kampala. Customers find a hair stylist,
barber, braider, massage therapist, laundry, cleaner, security escort or repair pro, pick
a time, and pay with MTN MoMo, Airtel Money, card or cash. Businesses (the "service
providers") manage their menu, team, opening hours and bookings from one dashboard.

This file is the contract. If something here is wrong, change this file first, then the code.

## Who it is for

| Person | What they do in Reclain |
|---|---|
| Customer | Searches, books, pays, gets SMS confirmations and reminders, cancels, reviews |
| Provider (business owner) | Creates a business, lists services and staff, sets hours, sees and manages every booking |
| Admin (you) | Approves new businesses before they appear publicly |

One login works for all three. Anyone can be a customer. Owning a business makes you a
provider. `profiles.is_admin = true` makes you an admin.

## The two halves

**Front end (the dining room)**: Next.js 16 pages in `src/app`.

| Screen | Path | Who |
|---|---|---|
| Home: search, categories, featured venues, occasions, reviews, trust, business pitch | `/` | everyone |
| Search results | `/search?q=&area=&cat=&when=` | everyone |
| Venue page: services, team, hours, reviews | `/v/[slug]` | everyone |
| Booking flow: services, professional, time, confirm and pay | `/book/[slug]` | logged-in customer |
| My bookings, booking detail (pay, cancel, review) | `/bookings`, `/bookings/[id]` | customer |
| Log in or sign up (email link, password, Google) | `/login` | everyone |
| Account (name, phone) | `/account` | logged in |
| Business dashboard: today, upcoming, takings | `/business` | provider |
| Create your business | `/business/onboarding` | logged in |
| Bookings, services, team, settings | `/business/bookings`, `/business/services`, `/business/team`, `/business/settings` | provider |
| Approve businesses | `/admin` | admin |

**Back end (the kitchen)**: Next.js route handlers and server actions in `src/app/api` and
`src/lib`, plus Postgres functions in Supabase.

| Job | Where |
|---|---|
| Work out free time slots (opening hours, closed days, staff, existing bookings) | `src/lib/booking/availability.ts` + `busy_slots()` SQL function |
| Create a booking safely: prices come from the database, never the browser; no double booking | `create_booking()` SQL function + exclusion constraint |
| Take payment | `src/lib/payments` (Flutterwave for MoMo, Airtel and card; a mock provider for testing) |
| Hear back that a payment worked | `/api/webhooks/flutterwave` |
| Send SMS confirmations and day-before reminders | `src/lib/sms` (Africa's Talking; console in development) + `/api/cron/reminders` |
| Keep reviews honest: only customers with a completed booking can review | RLS policy + trigger that updates the venue rating |

**The pantry (Supabase Postgres)**: tables `profiles`, `categories`, `areas`, `businesses`,
`services`, `staff`, `bookings`, `booking_items`, `payments`, `reviews`, `sms_log`.
Schema lives in `supabase/migrations/`. Sample data in `supabase/seed.sql`.

**The waiter (API)**: the screens call `src/lib/data` (one function per question, such as
`listBusinesses()` or `createBooking()`). That layer talks to Supabase. When Supabase keys
are missing it falls back to **demo mode**: built-in sample data and a pretend login, so
the app runs on a laptop with zero setup.

## Rules that keep it safe (Row Level Security)

- Anyone can read published businesses, their active services and staff, categories, areas and reviews.
- A customer reads and changes only their own bookings and payments.
- A provider reads and manages bookings, services and staff only for businesses they own.
- Nobody can write prices: `create_booking()` copies prices and durations from `services`.
- Payment status changes only on the server (webhook or provider dashboard), never from the browser.
- Secret keys live in `.env.local` (your laptop) and in Vercel's environment settings, never in the code.

## Payments

Mobile money first. Card is optional. Cash can be switched on per business.

| Method | How it works |
|---|---|
| MTN MoMo / Airtel Money | Flutterwave checkout for Uganda mobile money. The customer approves with their PIN |
| Card | Same Flutterwave checkout. Card numbers never touch Reclain |
| Cash | Booking is confirmed straight away; the provider marks it paid in the dashboard |

`PAYMENT_PROVIDER=mock` (the default) needs no account: a "Simulate payment" button marks a
payment as paid. Switch to `flutterwave` and add keys when ready. Adding another provider
(Pesapal, MTN MoMo direct) means adding one file in `src/lib/payments/providers/`.

## SMS

`SMS_PROVIDER=console` (default) writes messages to the server log and the `sms_log` table.
`africastalking` sends real SMS. Sent: booking confirmed (customer and provider), reminder
the day before at 18:00 Kampala time (Vercel Cron), booking cancelled.

## Making changes easy

- `src/config/site.ts`: name, tagline, contact, currency, timezone, home-visit fee, cancellation window.
- `src/config/features.ts`: switch features on or off (cash, card, home visits, reviews, SMS reminders, Google login, business approval, homepage sections).
- `src/config/content.ts`: homepage words (rotating hero words, marquee, occasions, FAQ).
- Categories and areas are rows in the database, editable in Supabase without code.
- `docs/CHANGING-THINGS.md`: one-sentence recipes for common changes.

## Going live

1. Supabase project `reclain` (eu-central-1) holds the database. Run the migrations and seed.
2. Push to GitHub, import the `reclain-app` folder into Vercel, paste the environment variables, deploy.
3. Add `reclain.com` in Vercel → Domains and copy the two DNS records to your domain registrar.
4. Point the Flutterwave webhook at `https://reclain.com/api/webhooks/flutterwave`, switch test keys to live keys.
5. Turn on Google login in Supabase → Authentication → Providers, and set the Site URL to your domain.

Full steps: `docs/GO-LIVE.md`.

## Out of scope for version 1 (easy to add later)

Phone-number login by SMS code, Google Calendar sync for providers, loyalty cards, promo
codes, payouts to providers through the app, native mobile apps, and multiple languages
(Luganda, Swahili).
