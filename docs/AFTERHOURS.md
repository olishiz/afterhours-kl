# Afterhours

A dark nightlife discovery app for Kuala Lumpur and Selangor, built on the [AI Website Cloner Template](https://github.com/JCodesMore/ai-website-cloner-template). Inspired by Luma's event discovery, with an independent Afterhours identity.

## Run locally

Use Node 24 and npm. No API keys or environment variables are required.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. `npm run check` runs lint, TypeScript and the production build. `npm run test:scraper` checks the ingestion rules.

## What works

- Responsive dark event discovery, category and area filters, MYT date windows, search, and curated or chronological sorting.
- Event detail dialogs with original ticket links, venue Maps links, copied source links and downloadable `.ics` calendar events.
- Grid, list and date-grouped calendar views; a separate venue directory.
- Bookmarks persisted on the visitor's device. No account or tracking integration.
- Real public-source data: 55 dated sessions and eight venues at initial verification on 18 October 2026. Event availability is always confirmed with its original provider.

## Refresh the data

```sh
npm run test:scraper
npm run scrape:events
```

The scraper uses allowlisted public HTML from CloudJoi and Where to Party, checks robots.txt, limits requests, deduplicates sessions, preserves real dates, and reports source failures. It skips blocked sources and never reads private/social account feeds. This is curated coverage, not every nightlife event in the region.

The GitHub Actions refresh runs daily at 09:15 MYT, with a manual trigger available. A Git-linked Vercel project rebuilds after the snapshot commit. See [data provenance](research/events.md) for extension and access details.

## Deploy to Vercel

Import the GitHub repository into Vercel using the Next.js preset. Node 24, `npm run build`, no environment variables. `vercel.json` selects Singapore for the server-rendered page. Server rendering evaluates upcoming/past event windows on each request; the event snapshot itself refreshes through GitHub Actions.

An anonymous Vercel deployment is a temporary preview. Claim it in your Vercel account to keep it, and connect the GitHub repository for automatic updates. Anonymous claim details are local-only and excluded from Git.

## Routes and design evidence

The original Luma Discover and Kuala Lumpur pages inform a single customized `/` route. Event details and navigation are in-page views. Original ticket/venue pages remain outbound links. The app is editable React/CSS, not an embedded source website.

- `src/components/sites/afterhours/nightlife-app.tsx` — discovery and interactions.
- `src/app/afterhours.css` — dark responsive visual system.
- `src/data/events.json` — source-verified snapshot.
- `docs/research/luma/README.md` — real reference measurements and screenshots.
- `.design_systems/luma-com-20261018/` — compact reference handoff, with incomplete extraction gates disclosed.

The design is deliberately adapted for nightlife, not an exact reproduction of Luma's branding. Event posters stay attributed to their original providers and load from their published URLs.

The starter's MIT attribution and license are retained. Next.js was updated to 16.4.2 and available non-breaking security updates were applied. Remaining npm audit advisories concern the template's build tooling dependency chain; no forced major downgrade was applied.
