# KL / Selangor event data

The app includes a real public-source snapshot, verified on 18 October 2026 Malaysia time. It is a curated guide, not a claim to cover every nightlife event. The successful live refresh returned **55 dated event sessions** and **8 venue directory entries** from **61 public pages**, including **44 future sessions** at refresh time. All requests succeeded. The JSON snapshot is the authoritative current inventory.

## Sources and evidence

| Source | Public entry point | Extraction | Scope |
| --- | --- | --- | --- |
| CloudJoi | https://www.cloudjoi.com/ and https://www.cloudjoi.com/org/bobokl | Public `__NEXT_DATA__` embedded in HTML; each event's public `event.timings` data provides actual individual performances | Evening music, concerts and comedy; only venue addresses in Kuala Lumpur or Selangor |
| Where to Party | https://whereto.party/in/kuala-lumpur | Public event links and Schema.org Event JSON-LD on each event page | Organizer-submitted dance, club and Halloween listings |
| CloudJoi venue directory | https://www.cloudjoi.com/venues/bobokl and seven other explicitly listed public venue pages | Public venue data embedded in page HTML | Venue discovery, with `kind: "venue"`, no showtime or implied recurring programme |

Representative verified listings include:

- **Melissa Indot: The 80s! 6.0**, BoboKL, 21 and 22 October 2026 at 20:30 MYT, RM150: https://www.cloudjoi.com/shows/6938-melissa-indot-the-80s-60
- **DE LA ZONA**, Drip Kuala Lumpur, 22 October 2026 at 21:30 MYT to 03:00 the following morning, RM40: https://whereto.party/events/de-la-zona
- **WVC Presents: Jazz Bach**, BoboKL, 29 October 2026 at 20:30 MYT, RM125: https://www.cloudjoi.com/shows/7375-wvc-presents-jazz-bach
- **SPICY DICEY STAND-UP COMEDY OPEN MIC NIGHT**, LORDS Subang Jaya, 29 October 2026: https://www.cloudjoi.com/shows/7626-spicy-dicey-stand-up-comedy-open-mic-night-at-lords-subang-jaya
- **NEON Halloween 2026**, 31 October 2026: https://whereto.party/events/neon-halloween-2026

Each record preserves its public source URL, source name, and true `verifiedAt` timestamp. Posters and venue images use original published CDN URLs. Concise descriptions quote or summarize source metadata; a ticket seller or organizer remains the source for final admission terms, availability and fees.

## Access decisions

`https://www.cloudjoi.com/robots.txt` permits public pages and excludes `/api/`, account, purchase and preview paths. `https://whereto.party/robots.txt` permits public event pages and excludes API, admin and token paths. The scraper checks robots on every run before fetching pages and follows the longest matching rule. Explicit GPTBot and ChatGPT-User exclusions are honored as well as the scraper's own user agent. Requests are sequential, spaced at least 650ms per host, limited to 80 event pages per adapter, and time out after 25 seconds. Redirects outside the allowlist are never followed.

Resident Advisor was researched as a potential source but is **excluded from automated ingestion** because `https://ra.co/robots.txt` explicitly disallows GPTBot and ChatGPT-User. No RA private API, access challenge, login, social feed, or restricted endpoint is used. Instagram-only announcements cannot be comprehensively included without organizer permission or an approved feed.

## Normalization rules

- Source years and dates are retained exactly. Past shows are never relabeled as future events.
- CloudJoi's individual published session timestamps are used instead of turning a multi-day range into a fabricated daily recurrence.
- Timezone-free timestamps on the Malaysia city page receive `+08:00`. Existing offsets are preserved. Date-only metadata does not establish a showtime and is skipped.
- A source end date earlier than its start is discarded rather than guessed. Overnight end times are retained when explicitly published.
- Source venue city, state and address determine geography. Unknown locations, online events, venues outside KL / Selangor, and daytime performances before 17:00 are excluded.
- Categories and genres are lightweight editorial classification based on the published title, description and metadata, not a claimed organizer taxonomy.
- Empty descriptions or short navigation-only fragments such as “See Above for Seating Details” receive a deterministic factual summary using only the existing category, venue, area, and source showtime. Informative short and non-English descriptions are preserved. No programme details are invented.
- Deduplication uses a normalized title, venue and start minute; distinct performances remain distinct. The ticket seller wins if two sources supply the same session.
- Dated records are retained for 90 days after they finish and at most 370 days into the future. The app's future/past filters should compare actual dates dynamically.
- On a partial source outage, existing records from that source may be retained with their original verification dates. Source status becomes `partial` or `unavailable`. A completely empty refresh fails without overwriting the previous snapshot.
- Venue entries have `startAt: null`, `price: null`, and `kind: "venue"`; they are not presented as scheduled events or recurring residencies.

## Refresh and validation

Run with Node 22 or newer:

```sh
node --test scripts/scrape-events.test.mjs
node scripts/scrape-events.mjs
```

Use `--dry-run` to fetch and validate without writing. No third-party packages, credentials, browser cookies or API keys are needed.

`.github/workflows/refresh-events.yml` runs daily at **09:15 MYT**, or manually through `workflow_dispatch`. It verifies the parser rules, refreshes `src/data/events.json`, and commits changed snapshots using the repository's GitHub Actions token. GitHub schedules can be delayed. GitHub Actions must be enabled and permitted to write repository contents; branch protection may require an approved alternate publishing flow. A connected Vercel project uses the committed snapshot at build time. There is no browser-triggered scraping endpoint.

Tests cover robot exclusions, source-year preservation, timezone handling, geography, multi-session events, daytime exclusion, cancelled shows, invalid source end dates, deduplication, same-origin URL discovery, and venue records without invented dates.

## Extending coverage

Add another explicitly allowlisted adapter only after checking that source's access rules. Prefer an organizer feed or permitted public structured pages. Ticket2U, Ticketmelon, venue calendars and direct promoter feeds are useful next candidates. An HTML-only or client-only calendar may need a source-specific parser; do not substitute guessed dates or access private APIs to fill gaps. Broader organizer participation is necessary for credible city-wide coverage.
