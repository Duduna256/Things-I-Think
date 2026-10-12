# Reclain

Book Kampala's best-rated braiders, barbers, massage therapists, laundry, cleaners, security
and repair pros. Pay with MTN MoMo, Airtel Money, card or cash. Businesses run their bookings,
menu and team from one dashboard. (Said "reclaim".)

## Start here

| Read | For |
|---|---|
| [PLAN.md](PLAN.md) | What the app does, for whom, and the rules that keep it safe |
| [docs/GO-LIVE.md](docs/GO-LIVE.md) | Supabase, Flutterwave, Africa's Talking, Vercel and reclain.com, step by step |
| [docs/CHANGING-THINGS.md](docs/CHANGING-THINGS.md) | Turning features on and off, and one-sentence recipes for new ones |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Where everything lives in the code |

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

No keys needed: without Supabase keys the app runs in **demo mode** with sample venues, pretend
payments and three pretend people to log in as. Copy `.env.example` to `.env.local` and fill it
in to connect the real database.

```bash
npm test           # booking rules, phone numbers, payments, SMS
npm run typecheck
npm run lint
npm run build
```

## Stack

Next.js 16 (App Router) · Supabase (Postgres, Auth, Row Level Security) · Flutterwave
(mobile money and cards) · Africa's Talking (SMS) · Vercel (hosting and daily reminder cron).
