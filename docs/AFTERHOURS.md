# Afterhours

A nightlife guide for Kuala Lumpur and Selangor. The page follows the Luma city calendar: a full-bleed night hero, an events header, a dotted timeline of cards, and a detail sheet (a bottom sheet on mobile, a side panel on desktop). Copy, the lime accent, and the logo are Afterhours. Event artwork comes from each listing's own source.

## Run locally

Use Node 24 and npm. No API keys or environment variables are required.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. `basePath` and `assetPrefix` are set only when `PAGES_BASE_PATH` is present, which the GitHub Pages workflow sets to `/afterhours-kl`. A local or Vercel build leaves them unset, so the site is served at `/`. `output` stays `export`. `npm run check` runs lint, TypeScript and the production build. `npm run test:scraper` checks the ingestion rules.

## What the page does

- Light and dark themes. The choice is stored in `localStorage` under `afterhours-theme` and otherwise follows `prefers-color-scheme`.
- Events are grouped as Today plus the weekday, or a date such as 21 Oct plus the weekday.
- Each card shows the 24-hour MYT time, title, price or Free, venue, and the listing's own cover. Opening a card shows the date, a map link, and the price. Event Page goes to the source URL.
- Search matches title, venue, area, or genre. Chips filter by tonight, this weekend, area, genre, and free events.
- Events that have already ended are omitted when the page is built and again when it is opened.
- There is no account, analytics, or tracking.

## Refresh the data

```sh
npm run test:scraper
npm run scrape:events
```

The scraper reads public CloudJoi and Where to Party pages, plus Luma's public Kuala Lumpur discover calendar at `api.luma.com/discover/get-paginated-events`. It checks robots.txt first, spaces requests, and keeps the previous snapshot for a source that fails. It does not log in, use API keys, or bypass bot protection. Only nightlife listings are kept. Past events are dropped. See [data provenance](research/events.md).

The GitHub Actions refresh runs daily at 09:15 MYT, with a manual trigger available. Pushing the snapshot to `master` publishes the static export through `.github/workflows/deploy-pages.yml`.

## Deploy

The site is a static export (`output: "export"`). GitHub Pages deploys the `out` directory with `PAGES_BASE_PATH=/afterhours-kl`. Without that variable the export is rooted at `/`, which is what a Vercel project should use. No analytics service is used.

## Routes

There is one route, `/`. Original ticket and event pages stay as outbound links.

- `src/components/sites/afterhours/city-page.tsx` — city header, filters, and timeline.
- `src/data/events.json` — source-verified snapshot.
- `docs/research/luma/README.md` — layout reference measurements and screenshots.
