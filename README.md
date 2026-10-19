# Afterhours — Kuala Lumpur, after dark

A Luma-inspired nightlife discovery app for Kuala Lumpur and Selangor. Black and charcoal, warm ivory, a little green, and real public event listings.

Built from [JCodesMore/ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template), with its MIT license retained.

## Get started

Use Node 24. Run `npm ci`, then `npm run dev`. Open http://localhost:3000. No API keys are required.

- `npm run check` — lint, TypeScript, production build
- `npm run test:scraper` — ingestion tests
- `npm run scrape:events` — refresh public event listings

The initial snapshot contains 55 real dated sessions and eight venues, verified on 18 October 2026. Coverage is curated, not exhaustive.

Read the [app guide](docs/AFTERHOURS.md), [data provenance](docs/research/events.md), and [Luma reference study](docs/research/luma/README.md).
