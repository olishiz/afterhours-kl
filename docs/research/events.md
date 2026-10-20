# KL / Selangor event data

The app includes a real public-source snapshot. It is a curated nightlife guide, not a claim to cover every event in the region. The JSON snapshot is the authoritative current inventory. Past events are removed on each refresh, and the page hides anything that has already ended.

## Sources and evidence

| Source | Public entry point | Extraction | Scope |
| --- | --- | --- | --- |
| CloudJoi | https://www.cloudjoi.com/ and https://www.cloudjoi.com/org/bobokl | Public `__NEXT_DATA__` embedded in HTML; each event's public `event.timings` data provides actual individual performances | Evening music, concerts and comedy; only venue addresses in Kuala Lumpur or Selangor |
| Where to Party | https://whereto.party/in/kuala-lumpur | Public event links and Schema.org Event JSON-LD on each event page | Organizer-submitted dance, club and Halloween listings |
| Luma Kuala Lumpur | https://luma.com/kuala-lumpur | Place id from the public city page, then `https://api.luma.com/discover/get-paginated-events` | Nightlife listings only. Tech meetups, workshops and daytime sessions are dropped. Covers and URLs come from each event. |

Representative verified listings include:

- **Melissa Indot: The 80s! 6.0**, BoboKL, 21 and 22 October 2026 at 20:30 MYT, RM150: https://www.cloudjoi.com/shows/6938-melissa-indot-the-80s-60
- **DE LA ZONA**, Drip Kuala Lumpur, 22 October 2026 at 21:30 MYT to 03:00 the following morning, RM40: https://whereto.party/events/de-la-zona
- **WVC Presents: Jazz Bach**, BoboKL, 29 October 2026 at 20:30 MYT, RM125: https://www.cloudjoi.com/shows/7375-wvc-presents-jazz-bach
- **SPICY DICEY STAND-UP COMEDY OPEN MIC NIGHT**, LORDS Subang Jaya, 29 October 2026: https://www.cloudjoi.com/shows/7626-spicy-dicey-stand-up-comedy-open-mic-night-at-lords-subang-jaya
- **NEON Halloween 2026**, 31 October 2026: https://whereto.party/events/neon-halloween-2026

Each record preserves its public source URL, source name, and true `verifiedAt` timestamp. Posters and venue images use original published CDN URLs. Concise descriptions quote or summarize source metadata; a ticket seller or organizer remains the source for final admission terms, availability and fees.

## Access decisions

`https://www.cloudjoi.com/robots.txt` permits public pages and excludes `/api/`, account, purchase and preview paths. `https://whereto.party/robots.txt` permits public event pages and excludes API, admin and token paths. `https://luma.com/robots.txt` does not disallow `/kuala-lumpur`. `https://api.luma.com/robots.txt` and `https://api.lu.ma/robots.txt` disallow only `/insights/` for all user agents. The scraper uses `api.luma.com`, which is the host the city page calls, and does not request `/insights/`. It checks robots on every run before fetching and follows the longest matching rule. Explicit GPTBot and ChatGPT-User exclusions are honored as well as the scraper's own user agent. Requests are sequential, spaced at least 650ms per host, limited to 80 event pages per adapter, and time out after 25 seconds. Redirects outside the allowlist are never followed. No Luma login, API key, or bot-challenge bypass is used.

Resident Advisor was researched as a potential source but is **excluded from automated ingestion** because `https://ra.co/robots.txt` explicitly disallows GPTBot and ChatGPT-User. No RA private API, access challenge, login, social feed, or restricted endpoint is used.

On 20 October 2026, Instagram and Threads were also assessed for the requested nightlife discovery. Both [Instagram robots.txt](https://www.instagram.com/robots.txt) and [Threads robots.txt](https://www.threads.com/robots.txt) explicitly disallow GPTBot and state that automated collection requires express permission. Neither social feed is part of the scraper. Public search results and venue-owned websites were used to identify and cross-check official Instagram links; the app links visitors to those profiles. No login, cookies, proxy service, private API or bot-challenge bypass is used. No Threads profile could be verified from a venue-owned source in this research, so those fields remain null. A matching Instagram handle is not treated as proof of a Threads account. Social-only event announcements therefore remain a coverage gap; use an organizer-approved export or authorized Meta integration to add them.

## Normalization rules

- Source years and dates are retained exactly. Past shows are never relabeled as future events.
- CloudJoi's individual published session timestamps are used instead of turning a multi-day range into a fabricated daily recurrence.
- Timezone-free timestamps on the Malaysia city page receive `+08:00`. Existing offsets are preserved. Date-only metadata does not establish a showtime and is skipped. Seconds are zeroed, so a published time such as 20:30:57 is stored as 20:30:00.
- A source end date earlier than its start is discarded rather than guessed. Overnight end times are retained when explicitly published.
- Source venue city, state and address determine geography. Unknown locations, online events, venues outside KL / Selangor, and daytime performances before 17:00 are excluded.
- Categories and genres are lightweight editorial classification based on the published title, description and metadata, not a claimed organizer taxonomy. Classification uses the full source description before the display excerpt is shortened; DJ announcements late in a programme should not be mislabeled as generic live music.
- Empty descriptions or short navigation-only fragments such as “See Above for Seating Details” receive a deterministic factual summary using only the existing category, venue, area, and source showtime. Informative short and non-English descriptions are preserved. No programme details are invented.
- Deduplication uses a normalized title, venue and Malaysia calendar date. The ticket seller wins if two sources supply the same show. Different dates stay separate.
- An event is kept only while it has not ended. A published end time is used when it is after the start. Otherwise the listing stays for six hours after the start, then drops. Events more than 370 days ahead are skipped. The page applies the same rule again at build and when it is opened.
- Titles that are workshops, tech meetups, classes or similar non-nightlife programmes are dropped. Luma's city calendar also requires a nightlife signal in the title, such as a gig, club night, party, comedy show or evening screening.
- On a partial source outage, existing records from that source may be retained with their original verification dates. Source status becomes `partial` or `unavailable`. A completely empty refresh fails without overwriting the previous snapshot.
- Dated events and the separate curated Places directory serve different purposes. Venue profiles do not invent a showtime, price, residency or date. `normalizeVenue` remains covered by tests and does not invent a showtime.

## Refresh and validation

Run with Node 22 or newer:

```sh
node --test scripts/scrape-events.test.mjs
node scripts/scrape-events.mjs
```

Use `--dry-run` to fetch and validate without writing. No third-party packages, credentials, browser cookies or API keys are needed.

`.github/workflows/refresh-events.yml` runs daily at **09:15 MYT**, or manually through `workflow_dispatch`. It verifies the parser rules, refreshes `src/data/events.json`, and commits changed snapshots using the repository's GitHub Actions token. GitHub schedules can be delayed. GitHub Actions must be enabled and permitted to write repository contents; branch protection may require an approved alternate publishing flow. Deployments build the committed snapshot. The repository is connected to [Afterhours on Vercel](https://afterhours-kl.vercel.app/) according to the project owner; no browser-triggered scraping endpoint is required.

Tests cover robot exclusions, source-year preservation, timezone handling, geography, multi-session events, daytime exclusion, cancelled shows, invalid source end dates, deduplication, same-origin URL discovery, and venue records without invented dates.

## Curated places

`src/data/places.json` contains 12 researched venue profiles, with types and exports in `src/lib/places.ts`. This is an editorial shortlist, not a numeric ranking or a claim of comprehensive coverage. It is maintained separately from the daily dated-event scraper. Every profile includes source URLs, a verification timestamp, a street address, an official destination, and an Instagram link cross-checked against a venue-owned page or public venue metadata. `threads` is nullable. Ten images come from the venue's own website or its public CloudJoi profile; Pisco and fono intentionally have no image rather than an unrelated stock image or an expiring Instagram CDN URL. Image provenance is retained in `imageSource`.

| Place | Area | Evidence |
| --- | --- | --- |
| kyō | KLCC | [Official website and linked Instagram](https://clubkyokl.asia/), [official link hub](https://linktr.ee/kyokl) |
| Pisco KL | Bukit Bintang | [Official link hub](https://heylink.me/piscokl), [published programme and address](https://whereto.party/events/girls-got-groove-at-pisco-kl), [public profile with Instagram](https://wanderlog.com/place/details/41057/pisco-bar) |
| PITT Club | City Centre | [Official website, address and linked Instagram](https://www.pittclubkl.com/), [official link hub](https://linktr.ee/pittclubkl) |
| The Iron Fairies | TREC | [Official venue page](https://www.theironfairies.com/stores/iron-fairies-kl), [published programme with Instagram](https://thecitylist.my/blog/the-iron-fairies-kl-merdeka-groove-weekend-30-31-august-2024) |
| fono | Kampung Attap | [Public venue profile and Instagram](https://www.findglocal.com/MY/Kuala-Lumpur/192912657869969/fono), [address cross-check](https://wanderlog.com/place/details/6984067/fono) |
| BoboKL | Bangsar | [Public venue metadata, photo, address and Instagram](https://www.cloudjoi.com/venues/bobokl), [organizer programme](https://www.cloudjoi.com/bobokl) |
| REXKL | Chinatown | [Official website and linked Instagram](https://rexkl.com/), [official link hub](https://linktr.ee/hellorexkl) |
| Jao Tim | Chinatown | [Official programme and linked Instagram](https://www.jaotim.com/), [address cross-check](https://jazznode.com/en/venues/my-kul-jao-tim) |
| Mantra | Bangsar | [Official website, photos and linked Instagram](https://mantrabarkl.com/), [address](https://mantrabarkl.com/contact/) |
| PS150 | Chinatown | [Official website, photo and linked Instagram](https://www.ps150.my/), [address cross-check](https://www.tatlerasia.com/dining/ps150-bar) |
| Locker & Loft | Damansara Kim, Selangor | [Official website, photo and linked Instagram](https://lockerandloft.com/), [address and music programme](https://www.findglocal.com/MY/Petaling-Jaya/1513232538973269/The-Locker-%26-Loft) |
| Live Fact | Kota Damansara, Selangor | [Official about page, photo, address and Instagram](https://www.livefact.my/about/) |

Live Fact's official about page does not establish a current individual event date; the directory asks visitors to consult its programme. PS150 is correctly classified as Kuala Lumpur from its Petaling Street address despite one third-party city label incorrectly saying Petaling Jaya. Opening hours and cover prices are deliberately omitted from venue profiles because these change by night and event.

## Extending coverage

Add another explicitly allowlisted adapter only after checking that source's access rules. Prefer an organizer feed or permitted public structured pages. Ticket2U, Ticketmelon, venue calendars and direct promoter feeds are useful next candidates. An HTML-only or client-only calendar may need a source-specific parser; do not substitute guessed dates or access private APIs to fill gaps. Broader organizer participation is necessary for credible city-wide coverage.
