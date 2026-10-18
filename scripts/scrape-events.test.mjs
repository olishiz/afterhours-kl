import test from "node:test";
import assert from "node:assert/strict";
import { robotAllows, toMalaysiaDate, classifyLocation, cleanEventDescription, normalizeCloudjoi, normalizeVenue, normalizeJsonLd, dedupeEvents, discoverLinks, hasEventMetadata, retainFailedRecords } from "./scrape-events.mjs";

test("robots follows longest path and explicit AI exclusions", () => {
  const rules = "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /shows/*/preview\nAllow: /api/public/";
  assert.equal(robotAllows(rules, "/shows/jazz"), true);
  assert.equal(robotAllows(rules, "/api/private"), false);
  assert.equal(robotAllows(rules, "/api/public/one"), true);
  assert.equal(robotAllows(rules, "/shows/one/preview"), false);
  assert.equal(robotAllows("User-agent: *\nAllow: /\nUser-agent: GPTBot\nDisallow: /", "/events"), false);
});

test("dates preserve source years and normalize only timezone-free showtimes", () => {
  assert.equal(toMalaysiaDate("2024-03-16T21:30:00"), "2024-03-16T21:30:00+08:00");
  assert.equal(toMalaysiaDate("2026-10-22T13:30:00Z"), "2026-10-22T13:30:00Z");
  assert.equal(toMalaysiaDate("2026-10-22"), null);
  assert.equal(toMalaysiaDate("not a date"), null);
});

test("geography uses venue state instead of misleading title keywords", () => {
  assert.deepEqual(classifyLocation({ name: "Lords", city: "Subang Jaya", state: { name: "Selangor" } }, "Live from KL"), { area: "Subang Jaya", region: "Selangor" });
  assert.equal(classifyLocation({ name: "PenangPAC", city: "George Town", state: { name: "Penang" } }, "KL band on tour"), null);
  assert.deepEqual(classifyLocation({ name: "BoboKL", city: "Kuala Lumpur" }), { area: "Bangsar", region: "Kuala Lumpur" });
});

test("empty or navigation-only descriptions become factual local event summaries", () => {
  const event = { category: "Comedy", venue: "BoboKL", area: "Bangsar", startAt: "2026-10-22T20:30:00+08:00" };
  const expected = "Comedy at BoboKL in Bangsar. Scheduled for 22 October 2026 at 8:30 pm MYT.";
  assert.equal(cleanEventDescription("See Above for Seating Details!", event), expected);
  assert.equal(cleanEventDescription("Click here to read more.", event), expected);
  assert.equal(cleanEventDescription("", event), expected);
  assert.equal(cleanEventDescription("An evening of original songs.", event), "An evening of original songs.");
  assert.equal(cleanEventDescription("全靠现场随机应变的无剧本即兴喜剧表演", event), "全靠现场随机应变的无剧本即兴喜剧表演");
  assert.equal(cleanEventDescription("Read more", { ...event, startAt: null }), "Comedy at BoboKL in Bangsar.");
});

test("CloudJoi makes one record per real evening session and excludes matinees", () => {
  const show = { title: "Test jazz", venues: [{ name: "BoboKL", city: "Kuala Lumpur" }], categories: ["Music"], prices: [100], cover: "https://cdn.example/cover.jpg", description: "A &amp; B", status: "open" };
  const queries = [
    { queryKey: ["events", "test"], state: { data: show } },
    { queryKey: ["event.timings", 1], state: { data: [
      { starts_at: "2026-10-21T20:30:00+08:00", ends_at: "2026-10-21T22:30:00+08:00" },
      { starts_at: "2026-10-22T20:30:00+08:00", ends_at: "2026-10-22T22:30:00+08:00" },
      { starts_at: "2026-10-22T15:00:00+08:00", ends_at: "2026-10-22T17:00:00+08:00" },
    ] } },
  ];
  const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { dehydratedState: { queries } } } })}</script>`;
  const events = normalizeCloudjoi(html, "https://www.cloudjoi.com/shows/test", "2026-10-18T00:00:00Z");
  assert.equal(events.length, 2);
  assert.equal(events[0].description, "A & B");
  assert.notEqual(events[0].id, events[1].id);
  assert.equal(events[0].price, "RM100");
});

test("JSON-LD drops cancelled events and impossible end-times", () => {
  const schema = { "@type": "Event", name: "Club night", location: { name: "Pisco Bar", address: { addressLocality: "Kuala Lumpur" } }, startDate: "2026-10-16T21:30:00", endDate: "2026-10-16", offers: { price: 0, priceCurrency: "MYR" } };
  const html = value => `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
  const events = normalizeJsonLd(html(schema), "https://whereto.party/events/test", "2026-10-18T00:00:00Z");
  assert.equal(events.length, 1);
  assert.equal(events[0].endAt, null);
  assert.equal(events[0].price, "Free");
  assert.equal(normalizeJsonLd(html({ ...schema, eventStatus: "https://schema.org/EventCancelled" }), "https://whereto.party/events/test", "2026-10-18T00:00:00Z").length, 0);
});

test("venue records do not invent a residency, ticket price, or showtime", () => {
  const venue = { name: "BoboKL", slug: "bobokl", city: "Kuala Lumpur", banner: "https://cdn.example/venue.jpg" };
  const html = `<script id="__NEXT_DATA__">${JSON.stringify({ props: { pageProps: { dehydratedState: { queries: [{ queryKey: ["venues", "bobokl"], state: { data: venue } }] } } } })}</script>`;
  const record = normalizeVenue(html, { slug: "bobokl", category: "Jazz & Soul", genres: ["Jazz"], description: "A music venue." }, "2026-10-18T00:00:00Z");
  assert.equal(record.kind, "venue");
  assert.equal(record.startAt, null);
  assert.equal(record.price, null);
  assert.equal(record.url, "https://www.cloudjoi.com/venues/bobokl");
});

test("deduplication retains distinct sessions and prefers ticket seller", () => {
  const one = { title: "An Event", venue: "BoboKL", startAt: "2026-10-21T20:30:17+08:00", source: "Where to Party" };
  const duplicate = { ...one, title: "An event!", source: "CloudJoi", startAt: "2026-10-21T20:30:00+08:00" };
  const another = { ...one, startAt: "2026-10-22T20:30:00+08:00" };
  const events = dedupeEvents([one, duplicate, another]);
  assert.equal(events.length, 2);
  assert.equal(events[0].source, "CloudJoi");
});

test("discovery is limited to allowlisted source paths and same origin", () => {
  const html = '<a href="/shows/one">One</a><a href="https://evil.example/shows/two">Two</a><a href="/api/private">API</a><a href="/shows/one">Duplicate</a>';
  assert.deepEqual(discoverLinks(html, "https://www.cloudjoi.com", "cloudjoi"), ["https://www.cloudjoi.com/shows/one"]);
});

test("unrelated outages never restore a successfully checked cancelled event", () => {
  const cancelled = { id: "cancelled", source: "CloudJoi", url: "https://www.cloudjoi.com/shows/cancelled", kind: "event", startAt: "2026-10-22T20:30:00+08:00" };
  const failed = { ...cancelled, id: "failed", url: "https://www.cloudjoi.com/shows/failed" };
  const options = { source: "CloudJoi", failedUrls: new Set([failed.url]), visitedUrls: new Set([cancelled.url]), discoveryFailed: true, now: Date.parse("2026-10-18T00:00:00Z") };
  assert.deepEqual(retainFailedRecords([cancelled, failed], [], options), [failed]);
});

test("HTTP success without expected event metadata is detected as parser failure", () => {
  assert.equal(hasEventMetadata("<html>New layout without data</html>", "cloudjoi"), false);
  assert.equal(hasEventMetadata('<script type="application/ld+json">{"@type":"WebPage"}</script>', "wheretoparty"), false);
  assert.equal(hasEventMetadata('<script type="application/ld+json">{"@type":"Event","name":"Cancelled show","eventStatus":"https://schema.org/EventCancelled"}</script>', "wheretoparty"), true);
});
