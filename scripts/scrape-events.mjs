/**
 * Public-page event refresh. Node 22+, no dependencies or credentials.
 * Does not request private APIs, cookies, social feeds, or blocked sources.
 * Run: node scripts/scrape-events.mjs [--dry-run]
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.join(root, "src/data/events.json");
const agent = "AfterhoursKL/1.0 (public event discovery; respects robots.txt)";
const timeout = 25000;
const maxPages = 80;
const allowedHosts = new Set(["www.cloudjoi.com", "whereto.party", "luma.com", "api.luma.com"]);
const robotsCache = new Map();
const requestTimes = new Map();

export const adapters = [
  {
    id: "cloudjoi", name: "CloudJoi", url: "https://www.cloudjoi.com/",
    seeds: ["https://www.cloudjoi.com/", "https://www.cloudjoi.com/org/bobokl"],
    note: "Public Malaysian ticket listings; evening music, concerts and comedy in KL / Selangor. Ticket fees may apply.",
  },
  {
    id: "wheretoparty", name: "Where to Party", url: "https://whereto.party/in/kuala-lumpur",
    seeds: ["https://whereto.party/in/kuala-lumpur"],
    note: "Public organizer-submitted club nights. Confirm door policies with the organizer.",
  },
];

// Venue records deliberately carry no date, ticket price, or claimed recurring schedule.
export const venuePages = [
  { slug: "bobokl", category: "Jazz & Soul", genres: ["Jazz", "Soul"], description: "An intimate music and performance venue on Jalan Bangkung in Bangsar. Browse its published programme for the latest shows." },
  { slug: "rexkl", category: "Live music", genres: ["Electronic", "Rock"], description: "A creative and cultural venue at 80 Jalan Sultan in central Kuala Lumpur. Check the venue programme for performances and special events." },
  { slug: "656-kl-comedy-corner", category: "Comedy", genres: [], description: "A comedy venue in Bandar Sunway, with published stand-up and open-mic listings. Individual event pages carry showtimes and ticket information." },
  { slug: "1468-lords-subang-jaya", category: "Comedy", genres: [], description: "A Subang Jaya venue hosting published stand-up comedy nights. Consult the current programme before visiting." },
  { slug: "1253-studio-level-2-destage-at-jaya-one", category: "Comedy", genres: [], description: "A performance studio at DeStage, Jaya One in Petaling Jaya, with published comedy and stage events." },
  { slug: "1191-studio-yabai-x", category: "Comedy", genres: [], description: "A Kuala Lumpur performance space with published comedy and open-mic programmes. Check individual listings for admission and language." },
  { slug: "the-grand-theatre-jcpac", category: "Live music", genres: [], description: "The Grand Theatre at Jeffrey Cheah Performing Arts Centre in Bandar Sunway, with a published programme of concerts and stage performances." },
  { slug: "klpac-1", category: "Live music", genres: [], description: "Pentas 1 at the Kuala Lumpur Performing Arts Centre in Sentul. The published programme includes concerts and live performance." },
];

export function decodeText(value = "") {
  let text = String(value).replace(/<[^>]*>/g, " ").replace(/\\n/g, " ");
  const entities = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—" };
  for (let pass = 0; pass < 2; pass++) text = text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, key) => key[0] === "#" ? String.fromCodePoint(parseInt(key.slice(key[1]?.toLowerCase() === "x" ? 2 : 1), key[1]?.toLowerCase() === "x" ? 16 : 10)) : entities[key] ?? entity);
  return text.replace(/\s+/g, " ").trim();
}

export function toMalaysiaDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\d(?:T|$)/.test(value)) return null;
  // Date-only metadata does not establish a showtime. Do not invent one.
  if (value.length === 10) return null;
  const dated = /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}+08:00`;
  if (!Number.isFinite(Date.parse(dated))) return null;
  // CloudJoi and similar feeds publish stray seconds (20:30:57). Keep the minute.
  return dated.replace(/T(\d{2}:\d{2}):\d{2}(?:\.\d+)?/, "T$1:00");
}

export function malaysiaHour(iso) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));
}

export function isEvening(iso) {
  const hour = malaysiaHour(iso);
  return Number.isFinite(hour) && (hour >= 17 || hour < 5);
}

const nonNightlife = /workshop|masterclass|bootcamp|hackathon|\bconference\b|webinar|seminar|networking|meetup|devday|developer|\bstartup\b|founders?|certification|\byoga\b|wellness|meditation|journaling|shucking|tech talk|\bpanel\b|sandbox|coding|hack night|community exchange|get certified|mental health/i;
const lumaNightlife = /\b(?:club|rave|rooftop|\bdj\b|techno|trance|disco|jazz|soul|funk|hip-?hop|electronic|festival|\bgig\b|concert|karaoke|cabaret|orchestra|recital|comedy|stand-?up|open mic|\bjoke\b|\bjokes\b|\bparty\b|nightlife|\brock\b|\bmetal\b|\bindie\b|\bband\b|\bedm\b|boogie|amapiano|vinyl|screening|film night|dj set)\b|喜剧|派对/i;

export function isNightlife(title, description = "", category = "") {
  return !nonNightlife.test(`${title} ${category} ${description}`.slice(0, 500));
}

export function isLumaNightlife(title, description = "") {
  const text = `${title} ${description}`;
  return isNightlife(title, description) && lumaNightlife.test(text);
}

export function eventDayKey(startAt) {
  if (!startAt || !Number.isFinite(Date.parse(startAt))) return "undated";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(startAt));
}

// Listings without an end time remain visible for six hours after they start.
const nightWindowMs = 6 * 3600000;

export function isCurrentEvent(event, now) {
  if (!event || event.kind === "venue" || !event.startAt) return false;
  const start = Date.parse(event.startAt);
  if (!Number.isFinite(start)) return false;
  const end = event.endAt ? Date.parse(event.endAt) : start + nightWindowMs;
  return Number.isFinite(end) && end >= now;
}

export function robotAllows(robots, pathname, userAgent = agent) {
  const groups = [];
  let group = null;
  let sawRules = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].toLowerCase(), value = match[2].trim();
    if (key === "user-agent") {
      if (!group || sawRules) { group = { agents: [], rules: [] }; groups.push(group); sawRules = false; }
      group.agents.push(value.toLowerCase());
    } else if (group && ["allow", "disallow"].includes(key)) {
      sawRules = true;
      if (value) group.rules.push({ value, allow: key === "allow" });
    }
  }
  // Also respect explicit AI-agent exclusions when an assistant runs this scraper.
  const identities = [userAgent.toLowerCase(), "chatgpt-user", "gptbot"];
  const specific = groups.filter(g => g.agents.some(a => a !== "*" && identities.some(id => id.includes(a))));
  const relevant = specific.length ? specific : groups.filter(g => g.agents.includes("*"));
  const rules = relevant.flatMap(g => g.rules).filter(rule => {
    const expression = rule.value.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$");
    return new RegExp(`^${expression}`).test(pathname);
  }).sort((a, b) => b.value.length - a.value.length || Number(b.allow) - Number(a.allow));
  return rules[0]?.allow ?? true;
}

async function getRobots(origin) {
  if (!robotsCache.has(origin)) robotsCache.set(origin, (async () => {
    const response = await fetch(`${origin}/robots.txt`, { headers: { "User-Agent": agent }, signal: AbortSignal.timeout(timeout), redirect: "error" });
    if (response.status === 404) return "";
    if (!response.ok) throw new Error(`robots.txt returned ${response.status}; skipping host`);
    return response.text();
  })());
  return robotsCache.get(origin);
}

async function publicPage(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname)) throw new Error("URL outside source allowlist");
  if (!robotAllows(await getRobots(parsed.origin), parsed.pathname)) throw new Error("Excluded by robots.txt");
  const remaining = 650 - (Date.now() - (requestTimes.get(parsed.origin) ?? 0));
  if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
  requestTimes.set(parsed.origin, Date.now());
  const response = await fetch(parsed, { headers: { "User-Agent": agent, Accept: "text/html" }, signal: AbortSignal.timeout(timeout), redirect: "error" });
  if (!response.ok) throw new Error(`Public page returned ${response.status}`);
  if (!response.headers.get("content-type")?.includes("text/html")) throw new Error("Expected an HTML page");
  return response.text();
}

async function publicJson(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname)) throw new Error("URL outside source allowlist");
  if (!robotAllows(await getRobots(parsed.origin), parsed.pathname)) throw new Error("Excluded by robots.txt");
  const remaining = 650 - (Date.now() - (requestTimes.get(parsed.origin) ?? 0));
  if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
  requestTimes.set(parsed.origin, Date.now());
  const response = await fetch(parsed, { headers: { "User-Agent": agent, Accept: "application/json" }, signal: AbortSignal.timeout(timeout), redirect: "error" });
  if (!response.ok) throw new Error(`Public data returned ${response.status}`);
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Expected JSON");
  return response.json();
}

export function nextPayload(html) {
  const content = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!content) return null;
  try { return JSON.parse(content); } catch { return null; }
}

function walk(value, predicate, found = []) {
  if (!value || typeof value !== "object") return found;
  if (predicate(value)) found.push(value);
  for (const child of Object.values(value)) if (child && typeof child === "object") walk(child, predicate, found);
  return found;
}

export function jsonLdEvents(html) {
  const result = [];
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(match[1]), item => [item["@type"]].flat().some(type => /^(MusicEvent|Event|Festival|ComedyEvent)$/.test(type)), result); } catch { /* malformed source markup is skipped */ }
  }
  return result;
}

export function discoverLinks(html, origin, sourceId) {
  const links = [...html.matchAll(/href=["']([^"']+)["']/gi)].map(match => { try { return new URL(match[1].replace(/&amp;/g, "&"), origin); } catch { return null; } });
  return [...new Set(links.filter(url => url?.origin === origin && (sourceId === "cloudjoi" ? /^\/shows\/[\w-]+\/?$/.test(url.pathname) : /^\/events\/[\w-]+\/?$/.test(url.pathname))).map(url => `${url.origin}${url.pathname.replace(/\/$/, "")}`))];
}

export function classifyLocation(venue, title = "", fallback = "") {
  const text = `${venue.name ?? ""} ${venue.address_1 ?? ""} ${venue.address_2 ?? ""} ${venue.city ?? ""} ${venue.state?.name ?? ""} ${JSON.stringify(venue.address ?? "")} ${fallback}`;
  // Venue geography wins over incidental mentions of another city in an event title.
  if (/selangor|subang|sunway|petaling jaya|shah alam|puchong|damansara perdana|empire damansara|kota damansara|serdang|kajang|cyberjaya|sepang/i.test(text)) {
    const area = /subang|sunway/i.test(text) ? "Subang Jaya" : /shah alam/i.test(text) ? "Shah Alam" : /puchong/i.test(text) ? "Puchong" : /kajang/i.test(text) ? "Kajang" : /sepang/i.test(text) ? "Sepang" : /cyberjaya/i.test(text) ? "Cyberjaya" : /damansara/i.test(text) ? "Damansara" : /petaling|jaya one|pj\b/i.test(text) ? "Petaling Jaya" : "Selangor";
    return { area, region: "Selangor" };
  }
  if (/kuala lumpur|\bkl\b|bobokl|bangsar|bukit bintang|hartamas|ttdi|mesui|sentul|trec|bukit damansara|klpac/i.test(text)) {
    const area = /bobokl|bangsar|bangkung/i.test(text) ? "Bangsar" : /trec|iron fairies/i.test(text) ? "TREC" : /hartamas/i.test(text) ? "Sri Hartamas" : /ttdi|taman tun/i.test(text) ? "TTDI" : /bukit damansara|ykō|yko/i.test(text) ? "Bukit Damansara" : /sentul|klpac/i.test(text) ? "Sentul" : /petaling street|rexkl|chinatown/i.test(text) ? "Chinatown" : /mesui|pisco|bukit bintang|changkat/i.test(text) ? "Bukit Bintang" : "Kuala Lumpur";
    return { area, region: "Kuala Lumpur" };
  }
  // A source's city page is a valid fallback; unknown geographic locations are excluded.
  if (/kuala lumpur/i.test(fallback) && !/penang|ipoh|kuching|johor|melaka/i.test(text + title)) return { area: "Kuala Lumpur", region: "Kuala Lumpur" };
  return null;
}

export function classifyCategory(title, description = "", categories = []) {
  const text = `${title} ${description} ${categories.join(" ")}`;
  if (/comedy|stand.up|open.mic|jokes|喜剧/i.test(text)) return "Comedy";
  if (/jazz|bach|soul|cabaret/i.test(text)) return "Jazz & Soul";
  if (/halloween|horrors|sinful/i.test(text)) return "Parties";
  if (/festival|fest\b/i.test(text)) return "Festivals";
  if (/club|techno|house|trance|electronic|dj\b|dance floor|de la zona|berlin|vertigo|no borders/i.test(text)) return "Club nights";
  if (/screening|film night|cinema/i.test(text)) return "Film";
  return "Live music";
}

export function cleanEventDescription(description, event) {
  const text = decodeText(description);
  const navigationOnly = text.length < 70 && /(?:see\s+(?:above|below)|refer\s+to\s+(?:above|below)|click\s+(?:here|above|below)|read\s+more|learn\s+more|view\s+(?:more|details)|book\s+now|buy\s+tickets|coming\s+soon|details\s+to\s+follow)/i.test(text);
  if (text && !navigationOnly) return text.slice(0, 195);
  const venue = decodeText(event.venue);
  const area = decodeText(event.area);
  const place = area && !venue.toLowerCase().includes(area.toLowerCase()) ? `${venue} in ${area}` : venue;
  const opening = `${event.category || "Event"} at ${place}`;
  if (!event.startAt || !Number.isFinite(Date.parse(event.startAt))) return `${opening}.`;
  const date = new Date(event.startAt);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "long", year: "numeric" }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kuala_Lumpur", hour: "numeric", minute: "2-digit", hour12: true }).format(date);
  return `${opening}. Scheduled for ${day} at ${time} MYT.`;
}

function genresFrom(text, tags = []) {
  const genres = ["Techno", "House", "Trance", "Disco", "Jazz", "Soul", "Funk", "Rock", "Pop", "Hip-hop", "R&B", "Electronic"];
  return genres.filter(genre => new RegExp(`\\b${genre.replace(/[&-]/g, ".?")}\\b`, "i").test(`${text} ${tags.join(" ")}`)).slice(0, 3);
}

function priceLabel(prices, currency = "MYR") {
  const values = prices.map(Number).filter(Number.isFinite);
  if (!values.length) return null;
  const lowest = Math.min(...values);
  return lowest === 0 && Math.max(...values) === 0 ? "Free" : `${values.length > 1 ? "From " : ""}${currency === "MYR" ? "RM" : `${currency} `}${lowest.toLocaleString("en-MY", { maximumFractionDigits: 2 })}`;
}

function idFor(source, title, venue, date) {
  return `${source}-${createHash("sha1").update(`${title}|${venue}|${date}`).digest("hex").slice(0, 12)}`;
}

export function normalizeCloudjoi(html, url, verifiedAt) {
  const payload = nextPayload(html);
  const queries = payload?.props?.pageProps?.dehydratedState?.queries ?? [];
  const event = queries.find(query => query.queryKey?.[0] === "events" && typeof query.queryKey?.[1] === "string")?.state?.data;
  if (!event?.title || !event.venues?.length || !event.categories?.some(category => /^(Music|Concert|Comedy)$/i.test(category))) return [];
  if (["cancelled", "unpublished", "draft"].includes(event.status)) return [];
  const timings = queries.find(query => query.queryKey?.[0] === "event.timings")?.state?.data;
  const sessions = timings?.length ? timings : [{ starts_at: event.starts_at, ends_at: event.ends_at, venue: event.venues[0] }];
  return sessions.flatMap(session => {
    const venue = { ...event.venues[0], ...session.venue };
    if (venue.type === "online" || venue.is_cloud) return [];
    const location = classifyLocation(venue, event.title);
    const startAt = toMalaysiaDate(session.starts_at);
    if (!location || !startAt || !isEvening(startAt)) return [];
    const title = decodeText(event.title);
    const rawDescription = decodeText(event.description);
    const category = classifyCategory(title, rawDescription, event.categories);
    if (!isNightlife(title, rawDescription.slice(0, 240), category)) return [];
    const description = cleanEventDescription(rawDescription, { category, venue: venue.name, area: location.area, startAt });
    return [{
      id: idFor("cloudjoi", title, venue.name, startAt), title, venue: decodeText(venue.name), ...location,
      category, genres: genresFrom(`${title} ${rawDescription.slice(0, 195)}`, event.genres),
      startAt, endAt: toMalaysiaDate(session.ends_at), price: priceLabel(event.prices ?? event.price ?? [], event.currency?.code),
      image: event.cover ?? null, url, source: "CloudJoi", description, kind: "event", verifiedAt,
      featured: /wvc|melissa|gig for good|janelle/i.test(title),
    }];
  });
}

export function normalizeVenue(html, definition, verifiedAt) {
  const queries = nextPayload(html)?.props?.pageProps?.dehydratedState?.queries ?? [];
  const venue = queries.find(query => query.queryKey?.[0] === "venues" && typeof query.queryKey?.[1] === "string")?.state?.data;
  if (!venue?.name || venue.is_cloud || venue.type === "online") return null;
  const location = classifyLocation(venue);
  if (!location) return null;
  return {
    id: `venue-${definition.slug}`, title: decodeText(venue.name), venue: decodeText(venue.name), ...location,
    category: definition.category, genres: definition.genres, startAt: null, endAt: null, price: null,
    image: venue.banner ?? venue.logo ?? null, url: `https://www.cloudjoi.com/venues/${definition.slug}`,
    source: "CloudJoi", description: definition.description, kind: "venue", verifiedAt,
    featured: ["bobokl", "rexkl"].includes(definition.slug),
  };
}

export function normalizeJsonLd(html, url, verifiedAt) {
  return jsonLdEvents(html).flatMap(event => {
    if (/Cancelled|Postponed/.test(event.eventStatus ?? "")) return [];
    const venue = event.location?.[0] ?? event.location;
    if (!venue || event.eventAttendanceMode?.includes("OnlineEvent")) return [];
    const location = classifyLocation(venue, event.name, "Kuala Lumpur");
    const startAt = toMalaysiaDate(event.startDate);
    if (!location || !startAt || !isEvening(startAt)) return [];
    const rawDescription = decodeText(event.description);
    const category = classifyCategory(event.name, rawDescription);
    if (!isNightlife(event.name, rawDescription.slice(0, 240), category)) return [];
    const description = cleanEventDescription(rawDescription, { category, venue: venue.name, area: location.area, startAt });
    const offers = [event.offers ?? []].flat();
    const image = [event.image ?? []].flat()[0];
    // Price text is published in the page even when JSON-LD offers are absent.
    const visiblePrice = html.match(/(?:Free before[^<]{0,50}|(?:From |Starting )?RM\s?\d+(?:\.\d+)?|\d+(?:\.\d+)?\sMYR)/i)?.[0];
    const endAt = toMalaysiaDate(event.endDate);
    return [{
      id: idFor("wheretoparty", event.name, venue.name, startAt), title: decodeText(event.name), venue: decodeText(venue.name), ...location,
      category, genres: genresFrom(`${event.name} ${event.description}`),
      startAt, endAt: endAt && Date.parse(endAt) > Date.parse(startAt) ? endAt : null,
      price: priceLabel(offers.map(offer => offer.price).filter(value => value != null), offers[0]?.priceCurrency) ?? (decodeText(visiblePrice ?? "") || null),
      image: typeof image === "string" ? image : image?.url ?? null,
      url, source: "Where to Party", description, kind: "event", verifiedAt,
      featured: /neon|no borders|dash berlin/i.test(event.name),
    }];
  });
}

function moneyLabel(cents, currency) {
  const formatted = (cents / 100).toLocaleString("en-MY", { maximumFractionDigits: 2 });
  return !currency || currency.toLowerCase() === "myr" ? `RM${formatted}` : `${currency.toUpperCase()} ${formatted}`;
}

export function lumaPrice(info) {
  if (!info || typeof info !== "object") return null;
  if (info.is_free) return "Free";
  const cents = info.price?.cents;
  if (!Number.isFinite(cents)) return null;
  const max = info.max_price?.cents;
  const prefix = Number.isFinite(max) && max > cents ? "From " : "";
  return `${prefix}${moneyLabel(cents, info.price?.currency)}`;
}

export function lumaPlaceId(html) {
  const place = nextPayload(html)?.props?.pageProps?.initialData?.data?.place;
  if (place?.slug === "kuala-lumpur" && typeof place.api_id === "string" && /^discplace-[\w-]+$/.test(place.api_id)) return place.api_id;
  return null;
}

export function normalizeLuma(entry, verifiedAt) {
  const event = entry?.event;
  if (!event?.name || !event.url || !event.start_at) return [];
  if (event.location_type && event.location_type !== "offline") return [];
  if (event.visibility && event.visibility !== "public") return [];
  const geo = event.geo_address_info ?? {};
  const venueName = decodeText(geo.address || geo.city || geo.city_state || "");
  if (!venueName) return [];
  const location = classifyLocation({ name: venueName, address_1: geo.full_address || geo.short_address || "", city: geo.city || "", state: { name: geo.region || "" } }, event.name, "Kuala Lumpur");
  const startAt = toMalaysiaDate(event.start_at);
  if (!location || !startAt || !isEvening(startAt)) return [];
  const title = decodeText(event.name);
  if (!isLumaNightlife(title)) return [];
  const endAt = toMalaysiaDate(event.end_at);
  const category = classifyCategory(title, "");
  const description = cleanEventDescription("", { category, venue: venueName, area: location.area, startAt });
  const slug = String(event.url).replace(/^\/+/, "");
  if (!/^[\w-]+$/.test(slug)) return [];
  const image = typeof event.cover_url === "string" && event.cover_url.startsWith("https://") ? event.cover_url : null;
  return [{
    id: idFor("luma", title, venueName, startAt), title, venue: venueName, ...location,
    category, genres: genresFrom(title), startAt,
    endAt: endAt && Date.parse(endAt) > Date.parse(startAt) ? endAt : null,
    price: lumaPrice(entry.ticket_info), image, url: `https://luma.com/${slug}`,
    source: "Luma", description, kind: "event", verifiedAt, featured: false,
  }];
}

function withClock(event) {
  const startAt = event.startAt ? toMalaysiaDate(event.startAt) : null;
  const endAt = event.endAt ? toMalaysiaDate(event.endAt) : null;
  return { ...event, startAt, endAt: endAt && (!startAt || Date.parse(endAt) > Date.parse(startAt)) ? endAt : null };
}

export function dedupeEvents(events) {
  const unique = new Map();
  for (const event of events) {
    const normalize = text => String(text ?? "").normalize("NFKD").toLowerCase().replace(/[^a-z\d]/g, "");
    const key = `${normalize(event.title)}|${normalize(event.venue)}|${eventDayKey(event.startAt)}`;
    if (!unique.has(key) || event.source === "CloudJoi") unique.set(key, event);
  }
  return [...unique.values()].sort((a, b) => (a.startAt ?? "9999").localeCompare(b.startAt ?? "9999"));
}

function isWithinRetention(event, now) {
  return isCurrentEvent(event, now) && Date.parse(event.startAt) < now + 370 * 86400000;
}

export function hasEventMetadata(html, adapterId) {
  if (adapterId === "cloudjoi") {
    const queries = nextPayload(html)?.props?.pageProps?.dehydratedState?.queries ?? [];
    return queries.some(query => query.queryKey?.[0] === "events" && typeof query.queryKey?.[1] === "string" && query.state?.data?.title);
  }
  return jsonLdEvents(html).length > 0;
}

export function retainFailedRecords(previous, fresh, { source, failedUrls, visitedUrls, discoveryFailed, now }) {
  const ids = new Set(fresh.map(event => event.id));
  return previous.filter(event => event.source === source && !ids.has(event.id) && isWithinRetention(event, now) && (failedUrls.has(event.url) || (discoveryFailed && !visitedUrls.has(event.url))));
}

export async function refresh({ dryRun = false } = {}) {
  const verifiedAt = new Date().toISOString();
  const now = Date.parse(verifiedAt);
  let previous = { events: [], sources: [] };
  try { previous = JSON.parse(await readFile(destination, "utf8")); } catch { /* first run */ }
  const collected = [];
  const sources = [];
  for (const adapter of adapters) {
    const sourceEvents = [];
    const queue = new Set();
    const failures = [];
    const failedUrls = new Set();
    const visitedUrls = new Set();
    let discoveryFailed = false;
    let success = 0;
    for (const seed of adapter.seeds) {
      try {
        const html = await publicPage(seed);
        success++;
        const discovered = discoverLinks(html, new URL(seed).origin, adapter.id);
        // Home metadata narrows discovery without requesting irrelevant event pages.
        const candidates = walk(nextPayload(html), item => item.type === "event" && item.slug && item.categories?.some(category => /^(Music|Concert|Comedy)$/i.test(category)));
        if (adapter.id === "cloudjoi" && candidates.length) candidates.forEach(event => queue.add(`https://www.cloudjoi.com/shows/${event.slug}`));
        else discovered.forEach(link => queue.add(link));
      } catch (error) { discoveryFailed = true; failures.push(`${seed}: ${error.message}`); }
    }
    if (!queue.size) { discoveryFailed = true; failures.push("Discovery returned no recognizable event links; source markup may have changed."); }
    for (const url of [...queue].slice(0, maxPages)) {
      try {
        const html = await publicPage(url);
        if (!hasEventMetadata(html, adapter.id)) throw new Error("Expected event metadata missing; source markup may have changed");
        const events = adapter.id === "cloudjoi" ? normalizeCloudjoi(html, url, verifiedAt) : normalizeJsonLd(html, url, verifiedAt);
        sourceEvents.push(...events.filter(event => isWithinRetention(event, now)));
        visitedUrls.add(url);
        success++;
      } catch (error) { failedUrls.add(url); failures.push(`${url}: ${error.message}`); }
    }
    // Never resurrect an event successfully fetched as cancelled because another page failed.
    if (failures.length) sourceEvents.push(...retainFailedRecords(previous.events, sourceEvents, { source: adapter.name, failedUrls, visitedUrls, discoveryFailed, now }));
    const normalized = dedupeEvents(sourceEvents.map(withClock));
    collected.push(...normalized);
    sources.push({ id: adapter.id, name: adapter.name, url: adapter.url, status: !success ? "unavailable" : failures.length ? "partial" : "active", lastChecked: verifiedAt, count: normalized.length, note: `${adapter.note}${failures.length ? ` ${failures.length} requests failed; retained previously verified records where available.` : ""}` });
    console.log(`${adapter.name}: ${normalized.length} events, ${success} pages, ${failures.length} failures`);
    for (const failure of failures) console.warn(`  ${failure}`);
  }
  const luma = await collectLuma(previous, verifiedAt, now);
  collected.push(...luma.events);
  sources.push(luma.source);
  console.log(`${luma.source.name}: ${luma.events.length} events, status ${luma.source.status}`);
  const events = dedupeEvents(collected).filter(event => event.kind === "event" && isCurrentEvent(event, now));
  for (const source of sources) source.count = events.filter(event => event.source === source.name).length;
  if (!events.length) throw new Error("No verified events returned. Existing snapshot was not overwritten.");
  const snapshot = { lastUpdated: verifiedAt, timezone: "Asia/Kuala_Lumpur", coverage: "Public-source curation, not an exhaustive inventory. Times and prices remain subject to organizer changes.", events, sources };
  if (!dryRun) { await mkdir(path.dirname(destination), { recursive: true }); await writeFile(destination, `${JSON.stringify(snapshot, null, 2)}\n`); }
  console.log(`${events.length} upcoming nightlife events (${sources.map(source => `${source.name} ${source.count}`).join(", ")}). ${dryRun ? "Dry run; no files written." : "Snapshot saved."}`);
  return snapshot;
}

async function collectLuma(previous, verifiedAt, now) {
  const sourceName = "Luma";
  const pageUrl = "https://luma.com/kuala-lumpur";
  const note = "Public events from the Kuala Lumpur city calendar. Only nightlife listings are kept.";
  const sourceEvents = [];
  const failures = [];
  const visitedUrls = new Set();
  let success = 0;
  try {
    const html = await publicPage(pageUrl);
    success++;
    const placeId = lumaPlaceId(html);
    if (!placeId) throw new Error("Kuala Lumpur place id missing from the public city page");
    let cursor = "";
    const seenCursors = new Set();
    for (let page = 0; page < 8; page++) {
      const endpoint = new URL("https://api.luma.com/discover/get-paginated-events");
      endpoint.searchParams.set("discover_place_api_id", placeId);
      endpoint.searchParams.set("pagination_limit", "25");
      if (cursor) endpoint.searchParams.set("pagination_cursor", cursor);
      const payload = await publicJson(endpoint);
      success++;
      const entries = Array.isArray(payload?.entries) ? payload.entries : [];
      for (const entry of entries) {
        const slug = typeof entry?.event?.url === "string" ? entry.event.url.replace(/^\/+/, "") : "";
        if (slug) visitedUrls.add(`https://luma.com/${slug}`);
        sourceEvents.push(...normalizeLuma(entry, verifiedAt).filter(event => isWithinRetention(event, now)));
      }
      const next = payload?.has_more && typeof payload.next_cursor === "string" ? payload.next_cursor : "";
      if (!next || seenCursors.has(next)) break;
      seenCursors.add(next);
      cursor = next;
    }
  } catch (error) {
    failures.push(error.message);
  }
  if (failures.length) sourceEvents.push(...retainFailedRecords(previous.events ?? [], sourceEvents, { source: sourceName, failedUrls: new Set(), visitedUrls, discoveryFailed: true, now }));
  const events = dedupeEvents(sourceEvents.map(withClock));
  return {
    events,
    source: {
      id: "luma",
      name: sourceName,
      url: pageUrl,
      status: !success ? "unavailable" : failures.length ? "partial" : "active",
      lastChecked: verifiedAt,
      count: events.length,
      note: failures.length ? `${note} ${failures.length} requests failed; retained previously verified records where available. ${failures[0]}` : note,
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  refresh({ dryRun: process.argv.includes("--dry-run") }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
