# Gorent Admin — Boshqaruv paneli

Admin dashboard for **Gorent**, an office-rental marketplace for Uzbekistan
(private / shared / coworking / virtual offices). Uzbek (Latin) UI, UZS pricing,
violet (`#7863fc`) brand, Geologica + JetBrains Mono type.

This is the real implementation of the Claude Design handoff prototype
(`Gorent Admin.html`), ported to **Vite + React 18**.

## Run

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the production build
```

## What's inside

A full-viewport, clickable admin prototype:

- **Boshqaruv paneli** — KPI cards with sparklines, revenue bar chart, category
  donut, occupancy, recent bookings, approval queue, top products. Layout
  switcher: **Klassik / Bento / Fokus** (variants A / B / C).
- **Mahsulotlar** — product CRUD: filterable table + grid toggle, detail drawer,
  add/edit form across the 4 categories.
- **Bandlovlar · Mezbonlar · Mijozlar** — each table opens a rich detail drawer.
- **Daromad & to'lovlar** — payouts, gross turnover, commission, payout-status donut.
- **Sharhlar** — review moderation cards.
- **Sozlamalar** — Platforma / Komissiya / To'lovlar / Integratsiyalar / Jamoa.
- **Virtual office integrations** — `didox.uz` (e-documents / ESF) and
  `ijara.soliq.uz` (tax rental-contract registry) connectors with sync state and
  a synced-documents list, surfaced in the virtual-office detail drawer and form.
- **Topbar** — platform ↔ host role switch, live notifications bell.
- **Tweaks panel** — layout variant, accent color, light/dark sidebar, default
  role, density. (Activated via the design-host edit-mode protocol; dormant in a
  plain browser.)

All data is mock/sample, derived from the marketplace listings.

## Architecture note

The original prototype was a set of in-browser Babel `<script>` files that shared
one global scope (React/ReactDOM as UMD globals, components referenced by bare
name, shared state on `window`). To preserve that behavior exactly — and the
pixel-perfect output — the source files are concatenated, in their original load
order, into a single module at `src/main.jsx`:

```
tweaks-panel → tokens → icons → placeholders → admin-data → admin-ui →
admin-shell → admin-overview → admin-integrations → admin-products →
admin-sections → admin-settings → admin-app
```

`React` / `ReactDOM` are imported at the top of that module and mirrored onto
`window`. Global design tokens and form styles live in `index.html`; brand SVGs
are in `public/assets/`. The file is a candidate for further modularization if
the project grows.
