# Changing things in reClain Services

Most changes are one sentence to Claude Code, or one line in a config file. Ask Claude Code
to "read docs/ARCHITECTURE.md first", then describe the change in plain words. Before
anything goes live, test it yourself the way a customer would: click every button.

## Change a setting (no code)

| I want to… | Where |
|---|---|
| Change the home-visit fee or cancellation window | `src/config/site.ts` |
| Change the booking window, time slots, earliest booking or how long unpaid bookings are held | `src/config/site.ts` **and** the database (see below) |
| Switch cash, card, mobile money, reviews, SMS reminders or Google login off | `src/config/features.ts` |
| Hide a homepage section | `src/config/features.ts` → `home` |
| Change homepage words: rotating hero words, marquee, occasions, FAQ, trust cards | `src/config/content.ts` |
| Add or rename a category or an area | Supabase → Table editor → `categories` / `areas` |
| Feature a venue on the homepage | Supabase → `businesses` → set `is_featured` to true |
| Make someone an admin | Supabase → `profiles` → set `is_admin` to true for their row |
| Publish new businesses without review | `businessApproval: false` in `src/config/features.ts` **and** `require_business_approval` in the database (see below) |

### Settings that live in two places

The database keeps its own copy of a few rules in the `app_settings` table, so it can check
every booking even if someone skips the app. Change one side and you must change the other,
or the app will offer times the database then refuses.

| Database (`app_settings` key) | App (`src/config`) |
|---|---|
| `require_business_approval` | `businessApproval` in `features.ts` |
| `pending_payment_minutes` | `pendingPaymentMinutes` in `site.ts` |
| `slot_step_minutes` | `slotStepMinutes` in `site.ts` |
| `min_lead_minutes` | `minLeadMinutes` in `site.ts` |
| `booking_window_days` | `bookingWindowDays` in `site.ts` |
| `timezone` | `timezone` in `site.ts` |

To change the database side, open Supabase → **SQL Editor** → New query, paste one line and
click Run. For example, to hold unpaid MoMo bookings for 45 minutes:

```sql
update app_settings set value = '45' where key = 'pending_payment_minutes';
```

Then set `pendingPaymentMinutes: 45` in `src/config/site.ts` and push. Text values keep their
double quotes inside the single ones (`'"Africa/Kampala"'`); yes and no are `'true'` and
`'false'`. To see every current value: `select * from app_settings;`.

## One-sentence recipes for Claude Code

- "Add a 'Tattoo & piercing' category with the sparkle icon." (a row in `categories`, plus an icon if you want a new one)
- "Add promo codes: a code gives a percentage off, set by the business in Settings." (new table, a field on the confirm step, a check in `create_booking()`)
- "Send customers an SMS asking for a review two hours after a booking is marked completed." (`src/lib/notify.ts` and a cron route)
- "Let businesses upload a cover photo." (Supabase Storage bucket, an upload field in Settings, `businesses.image_url` is already there)
- "Sync each venue's bookings to their Google Calendar." (a new provider like `src/lib/sms`, called from `notify.ts`)
- "Add a loyalty stamp: every 6th booking at the same venue is 10% off."
- "Log in with a phone number and SMS code." (Supabase → Authentication → Phone, with an SMS hook that uses Africa's Talking)
- "Add Luganda as a second language."
- "Remove the security category." (set the businesses in it to suspended, delete the category row, remove it from `content.ts` occasions)

## How a feature travels through the app

Adding something that stores data usually touches these, in this order:

1. **Database**: a new file in `supabase/migrations/` (never edit an old one). Add RLS policies
   for who can read and write it. Run it in Supabase → SQL editor.
2. **Types**: `src/lib/types.ts`.
3. **The waiter**: add the function to `src/lib/data/source.ts`, then to both `supabase.ts` and `demo.ts`.
4. **Screen**: the page in `src/app/...` and, for changes, a Server Action in an `actions.ts` next to it.
5. **Switch**: if it might be turned off, add a flag to `src/config/features.ts`.
6. **Test**: `npm test`, `npm run typecheck`, `npm run lint`, then click through it in demo mode
   (`npm run dev` with no Supabase keys) and again with your real Supabase project.

## Removing a feature

Prefer switching it off in `features.ts` first. If it's gone for good, ask Claude Code to remove
the screens and the data functions, and write a new migration that drops the tables (export the
data first if you might need it).
