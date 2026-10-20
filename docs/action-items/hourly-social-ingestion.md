# Action item: hourly Instagram and Threads nightlife ingestion

- **Status:** TODO — specification only; no social collector or hourly schedule has been configured.
- **Requested:** 20 October 2026, Asia/Kuala_Lumpur.
- **Owner:** Next implementation agent.
- **Goal:** Discover accurate KL/Selangor nightlife events from venue and promoter posts, refresh them hourly, and publish them to Afterhours without hourly frontend rebuilds.
- **First milestone:** Prove access and extraction against five real venues before expanding to 30–50 tracked accounts.

## Existing application and constraints

Read the repository `AGENTS.md` and relevant bundled Next.js guides before changing application code.

| File | Current responsibility |
| --- | --- |
| `src/data/places.json` | 12 curated venues, stable IDs, verified Instagram links, nullable Threads links, addresses and provenance |
| `src/lib/places.ts` | `NightPlace` interface and directory exports |
| `src/data/events.json` | Committed snapshot of dated public events |
| `src/lib/events.ts` | `NightEvent`, source types, expiry filtering |
| `scripts/scrape-events.mjs` | CloudJoi, Where to Party and Luma collection/normalization |
| `scripts/scrape-events.test.mjs` | Existing ingestion regression tests |
| `.github/workflows/refresh-events.yml` | Daily public-listing refresh at 09:15 MYT |
| `src/components/sites/afterhours/city-page.tsx` | Event search, filters, grouping and venue discovery |
| `next.config.ts` | Static export, with an optional GitHub Pages base path |
| `docs/research/events.md` | Existing sources, normalization and access evidence |

The deployed site is https://afterhours-kl.vercel.app/. Both Vercel and GitHub Pages must remain supported unless the deployment scope is explicitly changed.
The current page imports its JSON snapshot during builds; updating a collector alone will not refresh already deployed pages.
Preserve the current public-source scraper and daily workflow until a replacement has passed validation.

## Access strategy: verify before promising coverage

Use official Meta APIs where available. HTML scraping restrictions do not mean every official discovery API is unavailable.

- **Instagram:** Assess connected professional-account media access and Business Discovery for eligible public Business/Creator accounts. Confirm the actual login product, permissions and app access needed for the selected endpoints; do not assume arbitrary personal-account feeds or Stories are covered.
- **Threads tracked accounts:** Use public-profile discovery/posts, including `profile_posts` with a verified exact username. Relevant permissions include `threads_basic` and `threads_profile_discovery`.
- **Threads discovery:** Supplement tracked accounts with `keyword_search` using `RECENT` where supported and `threads_keyword_search`. Start with a small set of KL nightlife terms and local promoter/venue names.
- Meta's collection documents these Threads endpoints, but production eligibility, App Review requirements and current numerical quotas must be rechecked. No universal account coverage or request allowance is established by this document.
- Never derive a Threads account solely from the matching Instagram handle. Keep unverified accounts disabled.
- A managed provider is an alternative adapter, not an approved or guaranteed Meta feed. Record its permitted coverage, pricing and observed failures before adopting it.
- Do not bypass private-account restrictions, login challenges, CAPTCHAs, robots exclusions, or access controls. Do not use personal browser cookies, unofficial private APIs or proxy rotation to fill coverage gaps.

### Prerequisites to obtain from the project owner

- [ ] Meta developer app and the appropriate Instagram/Threads products and account connections.
- [ ] Required approved access/permissions, tested against representative non-owned venue accounts.
- [ ] Worker/scheduler hosting, durable database, and a public read-feed destination.
- [ ] Secrets entered into the hosting provider's secret store: app credentials, account tokens, database credentials, and any worker-invocation secret.
- [ ] Any selected OCR/extraction service configured with an explicit spending cap.

Use secret references rather than token values in tracked files, screenshots or logs. Do not request secrets pasted into chat. Add only placeholder variable names to an environment example.

## Phase 1 — five-venue access pilot

- [ ] Select five places from the existing directory across clubs, bars/live music and KL/Selangor; include a non-owned eligible account for each platform being tested.
- [ ] Create an account registry mapping platform IDs/handles to existing `NightPlace.id`; record the official evidence used to verify each handle.
- [ ] Fetch a bounded sample of actual posts. Record endpoint, granted scopes, fields, pagination, observed limits and inaccessible accounts without storing credentials.
- [ ] Demonstrate caption, timestamp, permalink and permitted media retrieval. Distinguish a genuine empty feed from an authorization/parser failure.
- [ ] Document the app's review/access status and token expiry/renewal procedure.
- [ ] Produce a short coverage/cost report before expanding the account list. Unsupported accounts remain visible as unsupported, not silently healthy.

## Phase 2 — durable hourly collection

Recommended flow: scheduler → worker → source adapters → post store → extraction/review → published event store → cached public feed → website.

- [ ] Run a scheduled worker independently of a browser session. Configure an hourly trigger, not a loop inside a request handler.
- [ ] Choose an external scheduler or Vercel Pro for hourly execution. Vercel Hobby's built-in cron currently permits daily jobs only; do not add an hourly Vercel cron that prevents deployment.
- [ ] Define the freshness target as eligible posts appearing within 90 minutes in normal operation. Scheduled execution alone does not prove freshness.
- [ ] Prevent overlapping work with a lease/lock; use unique run IDs and per-account job state.
- [ ] Keep a successful checkpoint per account and endpoint. Never advance it after a failed or incomplete fetch.
- [ ] Use a configurable overlap window, initially 48 hours, to catch late results, reordered posts and edits; inspect older upcoming-event sources periodically for changes.
- [ ] Follow source pagination with explicit page/item/time budgets. If a budget is exhausted, mark the fetch incomplete and continue safely next run.
- [ ] Store stable platform/post IDs; enforce a unique `(platform, externalPostId)` key. Replaying a run must not duplicate records.
- [ ] Hash meaningful post content and send only new/changed content for extraction. Do not OCR the same poster every hour.
- [ ] Respect source usage headers and `Retry-After`; use bounded exponential backoff with jitter for 429/temporary 5xx/network failures.
- [ ] Treat expired/revoked tokens and permission failures as actionable account errors. Refresh supported tokens before expiry and provide a reconnection path.
- [ ] Keep last-known-good listings during collection outages. Never replace the whole feed with an empty result after a source failure.
- [ ] Track `lastAttemptAt`, `lastSuccessfulAt`, outcome, processed counts, retry count and sanitized error category per source/account.
- [ ] Alert the configured operator after two hours without a successful expected sync; suppress repeated unchanged alerts and report recovery.
- [ ] Record per-run request, returned-item and extraction costs; make all work bounds configurable.

## Phase 3 — extract, review and publish events

- [ ] Save original post permalink, author/account identity, published timestamp, retrieval timestamp and evidence for every candidate.
- [ ] Parse captions and permitted poster images/carousel slides. Use OCR or multimodal extraction only when the text does not establish the event details.
- [ ] Separate `postedAt` from `eventStartAt`; posting today does not mean the event is tonight.
- [ ] Normalize actual event times to `Asia/Kuala_Lumpur` and retain source text/offset evidence. Handle overnight end times, multiple real sessions and explicit years.
- [ ] Never invent missing dates, admission prices, opening hours, recurrences, artists or venue addresses. Missing/ambiguous dates and conflicting caption/poster details go to review.
- [ ] Require evidence of a KL/Selangor venue and nightlife relevance; use verified venue IDs rather than location keywords alone.
- [ ] Keep recurring venue profiles separate from dated events. Do not convert ordinary venue posts into scheduled events.
- [ ] Deduplicate across platforms and existing ticket-source records using venue identity plus event title/date/session, retaining all supporting source links.
- [ ] Prefer an authoritative organizer/ticket listing when sources disagree; preserve distinct sessions and require review for unresolved conflicts.
- [ ] Support draft, review, published, cancelled and withdrawn states. Propagate confirmed cancellations/date changes without deleting audit evidence.
- [ ] Periodically recheck upcoming-event source posts for edits/deletion. Absence from a paginated result alone is not proof of cancellation.
- [ ] Publish concise factual summaries, source attribution and booking/source links. Do not republish entire captions unnecessarily.
- [ ] Record media provenance and usage permission; handle expiring URLs, deletions and fallback artwork. Do not permanently mirror all social media by default.
- [ ] Apply deletion/retention procedures consistent with the selected API's requirements; include operator takedown controls.

## Suggested storage model

| Entity | Essential fields and constraints |
| --- | --- |
| `source_accounts` | `id`, `platform`, `externalAccountId`, `username`, nullable `venueId`, verification evidence, enabled/access status, secret reference |
| `source_posts` | Unique platform/post ID, `accountId`, permalink, `postedAt`, `fetchedAt`, permitted source text/media references, content hash, edit/deletion state |
| `event_candidates` | Post references, extracted venue/title/date/time/price/URL, field evidence, confidence/review reasons, extraction version, review state |
| `published_events` | Stable ID, existing `NightEvent`-compatible fields, venue ID, source references, published/cancelled state, original verification and update times |
| `ingestion_runs` | Run ID, lease, source/account checkpoints, attempts, successes, sanitized failures, counts, cost and timing |

Do not expose raw posts, secret references, account tokens, worker controls or draft/rejected candidates in the public feed.
Migrations must preserve existing verified events and be reversible. Keep source observations separate from editorial corrections.

## Website delivery

- [ ] Prefer a durable database plus a cached, read-only HTTPS JSON feed so the static frontend can refresh content without rebuilding.
- [ ] Define a versioned public response with `events`, `lastUpdated` and source freshness; validate it before rendering.
- [ ] Merge social events with existing ticket-source inventory through one canonical normalization/deduplication stage.
- [ ] Seed initial rendering with the committed snapshot and retain it as a fallback on feed/network failures.
- [ ] Choose a cache lifetime that preserves the freshness target, e.g. five minutes, and show an honest update time when data is stale.
- [ ] Keep filtering, detail URLs, MYT grouping, source links and expiry behavior working for dynamically loaded events.
- [ ] If proposing Vercel server routes instead, document the explicit removal/change of `output: "export"`, GitHub Pages consequences and persistence strategy before migration. A server route cannot be silently added to the current static export.
- [ ] Authenticate any ingestion webhook/worker endpoint, reject replays as appropriate, and publish only the read-feed URL to the browser.

## Suggested implementation boundaries

These are proposed paths, not existing tools or completed work:

- `scripts/social/`: platform adapters, worker orchestration, extraction and publishing.
- `scripts/social/fixtures/` and `*.test.mjs`: sanitized deterministic fixtures and credentials-free tests.
- `src/data/social-accounts.json`: non-secret verified account registry, or a database seed migration.
- `src/lib/social-feed.ts`: response validation, feed loading and snapshot fallback.
- `db/migrations/`: durable schema, constraints and access rules if SQL is selected.
- `docs/social-ingestion-runbook.md`: setup, permissions, deployment, token renewal, incidents, costs and rollback.
- `.env.example`: placeholder names only; place real values in deployment secrets.

Avoid coupling provider fetching to React components. Keep access adapters replaceable and preserve the existing event parser tests.

## Definition of done

- [ ] Five-account pilot report proves actual supported coverage and lists exclusions before the 30–50 account rollout.
- [ ] A real hourly schedule is configured and observed for at least 24 hours, with run evidence and no duplicated events.
- [ ] Fixtures cover pagination/checkpoints, duplicate replay, edited posts, empty feeds, 429/5xx, token expiry and partial-source outages.
- [ ] Extraction fixtures cover caption/poster conflicts, missing year/date, MYT rollover, overnight events, multiple sessions, cancellations and out-of-region posts.
- [ ] Retrying a run does not duplicate posts, extraction charges or public events; one account's failure does not stop healthy accounts.
- [ ] Invalid candidates cannot auto-publish; reviewer edits and cancellation decisions are auditable.
- [ ] A newly approved event appears on the deployed website without a frontend deployment; last-known-good data survives feed outages.
- [ ] Secrets stay server-side; the public feed exposes only published listing data.
- [ ] Health alert and recovery behavior are exercised, with measured freshness and cost bounds in the runbook.
- [ ] `npm run test:scraper` and `npm run check` pass; add and document a dedicated offline social-test command.
- [ ] The owner can disable collection, rotate/revoke credentials, restore the fallback snapshot and remove a listing using documented procedures.

## Primary references and remaining verification

Research date: **20 October 2026**. Recheck before implementation; platform capabilities and permissions change.

- [Meta Instagram API with Facebook Login](https://www.postman.com/meta/instagram/folder/u4g5a2a/instagram-api-with-facebook-login) — professional accounts, discovery capabilities and account limitations.
- [Meta Instagram Business Discovery guide](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery/) — verify the selected product's current access prerequisites.
- [Meta Threads public-profile posts request](https://www.postman.com/meta/threads/request/34203612-116161fc-75af-4a09-a972-66d6f64ddb10).
- [Meta Threads keyword-search request](https://www.postman.com/meta/threads/request/m9j4i2x/search-for-threads-posts).
- [Meta Threads scope inventory](https://www.postman.com/meta/threads/request/k46c8l0/get-app-scoped-user-s-profile-information).
- [Meta Threads authorization/token collection](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api?entity=request-34203612-74fb48b1-ad1a-480e-b200-4dcdb8126a2f).
- [Vercel cron usage and plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).
- Optional alternative: [Apify Instagram collector](https://apify.com/apify/instagram-scraper) and [schedules](https://docs.apify.com/actors/running/schedules).

Direct Meta developer pages returned 429/errors during research. Exact discovery quotas, account eligibility thresholds and App Review requirements were not independently verified from those pages. Do not turn third-party claims into hard-coded limits or promised coverage.
