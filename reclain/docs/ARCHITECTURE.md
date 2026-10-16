# How reClain Services is put together

Read `PLAN.md` first for the what and why. This page is the map of the code.

## Two apps, one database

| | reClain (customers) | reClain Business (providers and admins) |
|---|---|---|
| Folder | `apps/customer` | `apps/business` |
| Address | reclain.com (local: 3000) | business.reclain.com (local: 3001) |
| Pages | home, search, venue, booking flow, my bookings, account | overview, bookings, job log, services, team, equipment, money, verification, settings, onboarding, `/admin` |

Both read and write the same Supabase project, and the log-in cookie is shared across the two
addresses (see `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`), so one account works on both. Everything the
apps have in common lives in `packages/shared` and is imported as `@shared/...`; inside an app,
`@/...` is that app's own `src/`.

## Folders

```
reclain/
├── PLAN.md                        the contract: who it's for, screens, rules
├── docs/                          this guide, CHANGING-THINGS.md, GO-LIVE.md
├── supabase/
│   ├── migrations/                the database schema, in order (run each once)
│   ├── seed.sql                   sample venues (generated: npm run seed:sql)
│   └── tests/rls_smoke.sql        proves the security rules (paste into the SQL editor)
├── scripts/generate-seed.mjs      builds seed.sql from packages/shared/src/lib/data/seed-data.json
├── apps/
│   ├── customer/src/
│   │   ├── app/                   one folder per page: page.tsx, search/, v/[slug]/, book/[slug]/,
│   │   │                          bookings/, login/, auth/, account/, pay/mock/, api/
│   │   ├── components/            Nav, Footer, VenueCard, home/, venue/, booking/
│   │   └── styles/                CSS per area (home, venue, booking)
│   └── business/src/
│       ├── app/(dashboard)/       the owner's tabs: bookings/ (+ [id] job log), services/, team/,
│       │                          equipment/, money/, verification/, settings/
│       ├── app/admin/             approvals, verification queue, payouts
│       ├── app/_lib/context.ts    who is logged in and which business they manage
│       ├── components/            Shell, dashboard/, equipment/, jobs/, money/, verification/, admin/
│       └── styles/                dashboard.css, business.css and one file per tool
└── packages/shared/src/
    ├── config/                    EDIT ME: site.ts (settings), features.ts (on/off), content.ts (homepage words)
    ├── components/                Icon, Cover, Rating, Toast, TierBadge, form bits, the log-in panel
    ├── styles/                    globals.css (tokens, buttons, cards, badges) and auth.css
    ├── auth/                      log-in, log-out and profile Server Actions
    └── lib/
        ├── types.ts               the shape of every record
        ├── data/                  the "waiter": every question the screens ask the back end
        │   ├── source.ts          the list of questions (the DataSource interface)
        │   ├── supabase*.ts       answers from the real database (core, capacity, jobs, books, verification)
        │   ├── demo*.ts           answers from built-in sample data (same split; demo-store.ts holds it)
        │   └── index.ts           picks one: `import { data } from "@shared/lib/data"`
        ├── booking/rules.ts       free slots, prices, home-visit fee (shared, tested)
        ├── capacity/              can the team and the equipment take this job? (tested)
        ├── jobs/                  what a job log allows next, photo checks (tested)
        ├── books/                 the chart of accounts, postings and the monthly statement (tested)
        ├── verification/          what each tier needs and what its badge may say (tested)
        ├── payments/              MoMo / Airtel / card: providers/mock.ts, providers/flutterwave.ts
        ├── sms/                   SMS sending: providers/africastalking.ts
        ├── notify.ts              which SMS goes out when
        ├── auth.ts                who is logged in (getSessionUser, requireUser, requireAdmin)
        ├── phone.ts               Ugandan numbers, MTN vs Airtel
        ├── time.ts                Kampala dates and times
        └── format.ts              UGX, durations, initials
```

## The business tools

These are the parts that help a provider run the business, not just take bookings. Each one is
a database migration (the rules live in Postgres, so nothing can skip them), a pair of data
files (`demo-*.ts` and `supabase-*.ts`) and a tab in reClain Business.

- **Crew and equipment** (`20261016000010`): a service says how many people it needs and which
  equipment or vehicles it uses. Every booking reserves exactly that: the lead professional, the
  extra crew, and units of each resource. `create_booking()` refuses a time it cannot staff and
  equip, and the availability API never offers one. The Equipment tab manages the kit and has a
  slot checker that says which constraint is binding ("Massage table: 2 of 2 in use").
- **Job log** (`20261016000011`): check-in and check-out with the phone's location, photos and
  notes, kept in `job_events`. The log is append-only: nothing can be edited or deleted, one
  check-in and one check-out per booking, and a photo must be filed under its booking in the
  private `job-photos` bucket. Customers see the same log on their booking.
- **Money and books** (`20261016000012`): a small double-entry ledger per business. A trigger on
  `bookings` posts the entries itself: income when a job is completed, a receipt into cash or
  into "held by reClain" when it is paid, the platform fee out of the held money, a refund when
  a paid booking is cancelled. Owners record their own spending; admins record payouts. The
  Money tab shows the month and a printable statement. Nobody writes ledger rows directly.
- **Verification tiers** (`20261016000013`): registered, verified, guaranteed, certified. Owners
  send evidence for each check (ID, address, references, competence, registration,
  certification) into the private `verification` bucket; admins pass or fail it and grant the
  tier the passed checks allow. The badge copy says only what was actually checked.

## The rules every screen follows

1. **Pages never talk to Supabase directly.** They call `data.something()` from `@shared/lib/data`.
   That keeps demo mode and the real database interchangeable, and keeps security in one place.
2. **Prices, durations, crew and equipment come from the database.** The booking screen shows them,
   but `create_booking()` in Postgres recalculates and reserves everything. Never send a price from the browser.
3. **Writes go through Server Actions** (`"use server"` files next to the page), validated with `zod`,
   and they catch `DataError` to show its `message` (always safe to show). In the business app an
   action first calls `ownedBusiness()` so nobody can act on a business they don't own.
4. **Secrets stay on the server.** Anything in `serverEnv` (`lib/env.ts`) or `createAdminClient()`
   must never be imported into a `"use client"` file.
5. **Times are Kampala time.** Use `lib/time.ts` (UTC+3, no daylight saving). Dates are
   `"YYYY-MM-DD"` strings and times of day are minutes after midnight.
6. **Money is whole Uganda shillings** (integers). Show it with `ugx()`.
7. **Phone numbers are stored as 9 digits** (`772123456`). Use `normalizeMsisdn()` on input,
   `prettyMsisdn()` to show, `internationalMsisdn()` for SMS and payment providers.
8. **Copy is plain and a little witty.** UK English. Buttons say what happens. Errors say what
   went wrong and how to fix it. Never claim something was checked, licensed or guaranteed unless the data says so.

## Design system

Tokens and shared components are in `packages/shared/src/styles/globals.css`: colours (`--ink`,
`--jac` jacaranda purple, `--lilac`, `--peach`, `--mint`, `--sun`), fonts (`--display` Syne for
headlines, `--font` Manrope for text, `--serif` Instrument Serif italic for the one witty word),
buttons (`.btn .btn-black / .btn-ghost / .btn-jac`), `.chip`, `.rail`, `.cover`, `.vcard`,
`.field`, `.pill-ok / -warn / -err / -info / -mute`, `.card`, `.empty`, `.notice-*`, `.modal`,
`.toast`, and the tier badges. Each app keeps its own area styles in `src/styles/<area>.css`,
imported by that area's page or layout. Icons: `<Icon name="…" />` from `@shared/components/Icon`.

## Demo mode

With no Supabase keys in `.env.local`, `lib/env.ts` sets `isDemo`. The apps then use the
`demo-*.ts` files: sample venues in memory, and three pretend people on the log-in page (a
customer, the owner of The Braid Republic, and an admin). Payments go to the mock provider.
Each app holds its own copy of the sample data, so in demo mode a booking made on the customer
site does not appear in the business app; with a real database they share everything.
Restarting a server resets its sample data.

## Tests

- `npm test`: booking rules, capacity planning, books, job rules, tiers, phone numbers, Kampala
  time, payments and SMS (Node's built-in test runner, run in every workspace).
- `npm run typecheck` and `npm run lint` (every workspace).
- `supabase/tests/rls_smoke.sql`: the database security rules, the booking functions, the job
  log, the books and the tiers, as one transaction that rolls itself back.
