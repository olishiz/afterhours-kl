# Afterhours — Kuala Lumpur, after dark

A nightlife guide for Kuala Lumpur and Selangor. The city page follows the Luma calendar: a night-skyline hero, a dotted timeline, and an event sheet. Light and dark themes share one lime accent. Every listing links to its original source.

Built from [JCodesMore/ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template), with its MIT license retained.

## Get started

Use Node 24. Run `npm ci`, then `npm run dev`. Open http://localhost:3000. No API keys are required. The dev server and a Vercel deploy serve the site at `/`. GitHub Pages sets `PAGES_BASE_PATH=/afterhours-kl` in `.github/workflows/deploy-pages.yml`, so the same static export is published at https://olishiz.github.io/afterhours-kl/.

- `npm run check` — lint, TypeScript, production build
- `npm run test:scraper` — ingestion tests
- `npm run scrape:events` — refresh public event listings

The committed snapshot is the current public-source inventory. Coverage is curated, not exhaustive. The static site is published to GitHub Pages at https://olishiz.github.io/afterhours-kl/.

Read the [app guide](docs/AFTERHOURS.md), [data provenance](docs/research/events.md), and [Luma reference study](docs/research/luma/README.md).

## Photograph

The hero uses a Kuala Lumpur night skyline by [Esmonde Yong](https://unsplash.com/@esmonde), downloaded into `public/photos/kl-night-skyline.jpg`. It is free to use under the [Unsplash License](https://unsplash.com/license). Photo page: [high rise building during night time](https://unsplash.com/photos/high-rise-building-during-night-time--9B08uduMyY).

The mark and wordmark live in `public/brand/logo.svg`, `public/brand/icon.svg`, and `public/brand/og.png`. `public/icon.svg` is the favicon.
