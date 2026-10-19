# Afterhours

A nightlife guide for Kuala Lumpur and Selangor. The page follows the structure of a city event calendar: a small wordmark, a city header, filter chips, and a date-grouped timeline. The identity, copy, and colors are Afterhours. Event artwork comes from each listing's own source.

## Run locally

Use Node 24 and npm. No API keys or environment variables are required.

```sh
npm ci
npm run dev
```

Open http://localhost:3000/afterhours-kl. The app uses `basePath` `/afterhours-kl` because that is the GitHub Pages path. `npm run check` runs lint, TypeScript and the production build. `npm run test:scraper` checks the ingestion rules.

## What the page does

- Mobile-first dark timeline. Events are grouped as Today, Tomorrow, or a weekday and date.
- Each row shows the MYT time, title, venue and area, price or Free, a square cover, and a source link.
- Chips filter by tonight, this weekend, area, genre, and free events.
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

The site is a static export (`output: "export"`, `basePath` and `assetPrefix` `/afterhours-kl`). GitHub Pages deploys the `out` directory. No custom domain, Vercel project, or analytics service is used.

## Routes

There is one route, `/`. Original ticket and event pages stay as outbound links.

- `src/components/sites/afterhours/city-page.tsx` — city header, filters, and timeline.
- `src/data/events.json` — source-verified snapshot.
- `docs/research/luma/README.md` — layout reference measurements and screenshots.
