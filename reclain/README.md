# Reclain.com

Services booking marketplace with hair dressing as the headline category
(braids, locs, cuts, wigs, bridal), plus massage & spa, laundry, beauty,
security escorts, cleaning and repairs.

Static site: open `index.html` in a browser, or deploy the folder to any
static host (Netlify, Vercel, GitHub Pages, cPanel).

- `index.html` – page structure
- `styles.css` – design (responsive, mobile-first breakpoints)
- `app.js` – service catalogue, stylists, booking modal, search

## Business dashboard preview

Add `#dashboard` to the address (or use "Try the business dashboard" in the
menu, the business band or the log-in box) to click through the business side
as The Braid Republic, owned by Aisha Namuli: overview, bookings by day,
services, team and settings, copied from `reclain-app/src/app/business`. It
runs on sample bookings in memory, in Kampala time, and resets on reload.
Bookings made at The Braid Republic on the customer side show up there too.
Its styles sit at the end of `styles.css` and its script at the end of
`app.js`, prefixed `dash-` and `pv-`.

Services, prices (UGX) and stylists live in `CATEGORIES` and `PROS` at the
top of `app.js`. Bookings are currently saved only in the visitor's browser;
connect a backend (e.g. Supabase) and SMS confirmations before launch.

## Payments

The booking form offers MTN MoMo, Airtel Money, card and cash. Mobile money
numbers are checked against the chosen network (MTN 076/077/078/039, Airtel
070/074/075/020). `requestMobileMoneyPayment()` in `app.js` is a placeholder:
no money moves yet. To take real payments, have your backend call:

- MTN MoMo Collections API (`requesttopay`): https://momodeveloper.mtn.com
- Airtel Money Collections API (USSD push): https://developers.airtel.africa

or a Ugandan aggregator that wraps both (e.g. Flutterwave, Pesapal). Keep API
keys on the server, never in `app.js`.
