# reClain Services

Everyday services in Kampala, booked in seconds: home cleaning, laundry, repairs, hair and
barbers, massage, nails, licensed security and more. Pay with MTN MoMo, Airtel Money, card or
cash. (Said "reclaim".)

It is two apps on one database:

| App | Address | Folder | For |
|---|---|---|---|
| reClain | reclain.com | `apps/customer` | Customers: find a venue, book, pay, review |
| reClain Business | business.reclain.com | `apps/business` | Businesses: bookings, menu, team, equipment, job log, money, verification. Admins: `/admin` |

One account works on both. `packages/shared` holds the code they share: the database access,
log-in, the booking rules and the shared components.

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
npm run dev             # the customer site:  http://localhost:3000
npm run dev:business    # reClain Business:   http://localhost:3001  (second terminal)
```

No keys needed: without Supabase keys both apps run in **demo mode** with sample venues, pretend
payments and three pretend people to log in as. Copy `apps/customer/.env.example` to
`apps/customer/.env.local` (and the same in `apps/business`) and fill them in to connect the
real database.

```bash
npm test                # booking rules, capacity, books, phone numbers, payments, SMS
npm run typecheck
npm run lint
npm run build
```

## Stack

Next.js 16 (App Router) · Supabase (Postgres, Auth, Storage, Row Level Security) · Flutterwave
(mobile money and cards) · Africa's Talking (SMS) · Vercel (hosting and the daily reminder cron).
