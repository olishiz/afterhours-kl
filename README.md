# Afterhours — Kuala Lumpur, after dark

A nightlife guide for Kuala Lumpur and Selangor. Dark page, lime accent, and a date-grouped list of public events. Every listing links to its original source.

Built from [JCodesMore/ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template), with its MIT license retained.

## Get started

Use Node 24. Run `npm ci`, then `npm run dev`. Open http://localhost:3000/afterhours-kl. No API keys are required.

- `npm run check` — lint, TypeScript, production build
- `npm run test:scraper` — ingestion tests
- `npm run scrape:events` — refresh public event listings

The committed snapshot is the current public-source inventory. Coverage is curated, not exhaustive. The static site is published to GitHub Pages at https://olishiz.github.io/afterhours-kl/.

Read the [app guide](docs/AFTERHOURS.md), [data provenance](docs/research/events.md), and [Luma reference study](docs/research/luma/README.md).
