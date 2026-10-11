# Reclain.com

Services booking marketplace with hair dressing as the headline category
(braids, locs, cuts, wigs, bridal), plus beauty, cleaning and repairs.

Static site: open `index.html` in a browser, or deploy the folder to any
static host (Netlify, Vercel, GitHub Pages, cPanel).

- `index.html` – page structure
- `styles.css` – design (responsive, mobile-first breakpoints)
- `app.js` – service catalogue, stylists, booking modal, search

Services, prices (UGX) and stylists live in `CATEGORIES` and `PROS` at the
top of `app.js`. Bookings are currently saved only in the visitor's browser;
connect a backend (e.g. Supabase) plus SMS/mobile-money payments before launch.
