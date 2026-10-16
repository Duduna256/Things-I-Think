# How reClain Services is put together

Read `PLAN.md` first for the what and why. This page is the map of the code.

## Folders

```
reclain-app/
├── PLAN.md                     the contract: who it's for, screens, rules
├── docs/                       this guide, CHANGING-THINGS.md, GO-LIVE.md
├── supabase/
│   ├── migrations/             the database schema, in order (run each once)
│   ├── seed.sql                sample venues (generated: npm run seed:sql)
│   └── tests/rls_smoke.sql     proves the security rules (paste into the SQL editor)
├── scripts/generate-seed.mjs   builds seed.sql from src/lib/data/seed-data.json
└── src/
    ├── config/                 EDIT ME: site.ts (settings), features.ts (on/off), content.ts (homepage words)
    ├── app/                    one folder per page (Next.js App Router)
    │   ├── page.tsx            homepage
    │   ├── search/             search results
    │   ├── v/[slug]/           a venue's page
    │   ├── book/[slug]/        the booking flow
    │   ├── bookings/           a customer's bookings
    │   ├── login/, auth/, account/
    │   ├── business/           the provider dashboard
    │   ├── admin/              approve businesses
    │   ├── pay/mock/           pretend phone prompt (test payments only)
    │   └── api/                availability, payment webhooks, reminders cron
    ├── components/             shared pieces: Nav, Footer, Icon, Cover, Rating, VenueCard
    ├── styles/                 CSS for each area (home, venue, booking, dashboard, auth)
    └── lib/
        ├── types.ts            the shape of every record
        ├── data/               the "waiter": every question the screens ask the back end
        │   ├── source.ts       the list of questions (DataSource interface)
        │   ├── supabase.ts     answers from the real database
        │   ├── demo.ts         answers from built-in sample data (no setup needed)
        │   └── index.ts        picks one: `import { data } from "@/lib/data"`
        ├── booking/rules.ts    free slots, prices, home-visit fee (shared, tested)
        ├── payments/           MoMo / Airtel / card. providers/mock.ts, providers/flutterwave.ts
        ├── sms/                SMS sending. providers/africastalking.ts
        ├── notify.ts           which SMS goes out when
        ├── auth.ts             who is logged in (getSessionUser, requireUser)
        ├── phone.ts            Ugandan numbers, MTN vs Airtel
        ├── time.ts             Kampala dates and times
        └── format.ts           UGX, durations, initials
```

## The rules every screen follows

1. **Pages never talk to Supabase directly.** They call `data.something()` from `@/lib/data`.
   That keeps demo mode and the real database interchangeable, and keeps security in one place.
2. **Prices and durations come from the database.** The booking screen shows them, but
   `create_booking()` in Postgres recalculates everything. Never send a price from the browser.
3. **Writes go through Server Actions** (`"use server"` files next to the page), validated with `zod`,
   and they catch `DataError` to show its `message` (always safe to show).
4. **Secrets stay on the server.** Anything in `serverEnv` (src/lib/env.ts) or `createAdminClient()`
   must never be imported into a `"use client"` file.
5. **Times are Kampala time.** Use `src/lib/time.ts` (UTC+3, no daylight saving). Dates are
   `"YYYY-MM-DD"` strings and times of day are minutes after midnight.
6. **Money is whole Uganda shillings** (integers). Show it with `ugx()`.
7. **Phone numbers are stored as 9 digits** (`772123456`). Use `normalizeMsisdn()` on input,
   `prettyMsisdn()` to show, `internationalMsisdn()` for SMS and payment providers.
8. **Copy is plain and a little witty.** UK English. Buttons say what happens. Errors say what
   went wrong and how to fix it. No em-dash asides.

## Design system

Tokens and shared components are in `src/app/globals.css`: colours (`--ink`, `--jac` jacaranda
purple, `--lilac`, `--peach`, `--mint`, `--sun`), fonts (`--display` Syne for headlines,
`--font` Manrope for text, `--serif` Instrument Serif italic for the one witty word), buttons
(`.btn .btn-black / .btn-ghost / .btn-jac`), `.chip`, `.rail`, `.cover`, `.vcard`, `.field`,
`.pill-ok / -warn / -err / -info / -mute`, `.card`, `.empty`, `.notice-*`, `.modal`, `.toast`.
Section styles live in `src/styles/<area>.css` and are imported by that area's page or layout.
Icons: `<Icon name="…" />` from `src/components/Icon.tsx`.

## Demo mode

With no Supabase keys in `.env.local`, `src/lib/env.ts` sets `isDemo`. The app then uses
`src/lib/data/demo.ts`: sample venues in memory, and three pretend people on the log-in page
(a customer, the owner of The Braid Republic, and an admin). Payments go to the mock provider.
Restarting the server resets everything.

## Tests

- `npm test`: booking rules, phone numbers, Kampala time (Node's built-in test runner).
- `npm run typecheck` and `npm run lint`.
- `supabase/tests/rls_smoke.sql`: 25 checks of the database security rules.
