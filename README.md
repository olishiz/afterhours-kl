# Afterhours — Kuala Lumpur, after dark

A nightlife guide for Kuala Lumpur and Selangor. The city page follows the Luma calendar: a night-skyline hero, a dotted event timeline, a discovery sidebar, and accessible detail drawers. A fixed header and sticky filters keep navigation available. Light and dark themes use neutral surfaces. Every listing links to its original source.

Built from [JCodesMore/ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template), with its MIT license retained.

## Get started

Use Node 24. Run `npm ci`, then `npm run dev`. Open http://localhost:3000. No API keys are required. The dev server and a Vercel deploy serve the site at `/`. GitHub Pages sets `PAGES_BASE_PATH=/afterhours-kl` in `.github/workflows/deploy-pages.yml`, so the same static export is published at https://olishiz.github.io/afterhours-kl/.

- `npm run check` — lint, TypeScript, production build
- `npm run test:scraper` — ingestion tests
- `npm run scrape:events` — refresh public event listings

The committed snapshot is the current public-source event inventory. A separate Places view contains researched nightlife venues and their official Instagram links. Coverage is curated, not exhaustive. Production is hosted on [Vercel](https://afterhours-kl.vercel.app/); GitHub Pages remains available at https://olishiz.github.io/afterhours-kl/.

Read the [app guide](docs/AFTERHOURS.md), [data provenance](docs/research/events.md), and [Luma reference study](docs/research/luma/README.md).

## Analytics

Product analytics use the [Amplitude Browser SDK](https://amplitude.com/docs/sdks/analytics/browser/browser-sdk-2) (`@amplitude/analytics-browser`). Analytics are optional. Set `NEXT_PUBLIC_AMPLITUDE_API_KEY` to turn them on. If the variable is unset, which is the case for local builds and the GitHub Pages copy, the SDK is never downloaded or initialised and every tracking call does nothing.

- Find the key in Amplitude → Settings → Projects → default → API Key.
- In Vercel, open Project afterhours-kl → Settings → Environment Variables. Add `NEXT_PUBLIC_AMPLITUDE_API_KEY` for Production and Preview, then redeploy. `NEXT_PUBLIC_` variables are inlined at build time, so a deploy built before you added the key won't pick it up.
- For local testing, put the key in `.env.local`. It is gitignored. Never commit a key.

Autocapture records page views (path changes only, so opening a detail sheet is not a page view), sessions, and marketing attribution. Element clicks, form interactions, and IP addresses are not collected, and remote configuration is off, so the dashboard can't turn them on. Custom events are defined and typed in `src/lib/analytics.ts`: `Landing Viewed`, `Event List Viewed`, `Filter Applied`, `Search Used` (query length only, never the text), `Event Detail Opened`, `Outbound Ticket Clicked`, and `Theme Toggled`. No personal data is sent.

## Agent action items

- [ ] [Build hourly Instagram and Threads ingestion](docs/action-items/hourly-social-ingestion.md) — access pilot, worker and scheduler, event extraction, review, data delivery, and acceptance criteria. This is a development handoff; hourly social ingestion is not enabled yet.

## Photograph

The current responsive hero and city icon match [Luma’s Kuala Lumpur page](https://luma.com/kuala-lumpur), with local assets in `public/sites/luma/` and source URLs recorded in the [redesign evidence](docs/research/afterhours/redesign-2026-10-20.md). The page credits Luma. The earlier Esmonde Yong photograph remains in `public/photos/kl-night-skyline.jpg`; see its [Unsplash photo page](https://unsplash.com/photos/high-rise-building-during-night-time--9B08uduMyY).

The mark and wordmark live in `public/brand/logo.svg`, `public/brand/icon.svg`, and `public/brand/og.png`. `public/icon.svg` is the favicon.
