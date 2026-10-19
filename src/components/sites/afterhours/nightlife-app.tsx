"use client";

/* eslint-disable @next/next/no-img-element -- Credited event artwork comes from multiple listing providers. */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowDownUp, ArrowRight, ArrowUpRight, AudioLines, Bookmark, CalendarDays, Check, ChevronDown, Clock3, Compass, Disc3, ExternalLink, Globe2, Grid2X2, Heart, Info, List, MapPin, Moon, Search, SlidersHorizontal, Sparkles, Ticket, X } from "lucide-react";
import { events, lastUpdated, sources, type NightEvent } from "@/lib/events";

type Tab = "Discover" | "Calendar" | "Places" | "Saved";
type Period = "Upcoming" | "Tonight" | "This weekend" | "This month" | "Past nights";
const timeZone = "Asia/Kuala_Lumpur";
const serverNow = "1970-01-01T00:00:00.000Z";
let clientNow = "";
function subscribeNow(onChange: () => void) {
  const id = window.setInterval(() => { clientNow = new Date().toISOString(); onChange(); }, 60_000);
  return () => window.clearInterval(id);
}
function getClientNow() {
  if (!clientNow) clientNow = new Date().toISOString();
  return clientNow;
}
function getServerNow() { return serverNow; }
const shortDate = (date: string) => new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short" }).format(new Date(date));
const fullDate = (date: string) => new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
const time = (date: string) => new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(date));
const localDay = (date: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
const storageKey = "afterhours.saved.v1";
function subscribeSaved(callback: () => void) { window.addEventListener("storage", callback); window.addEventListener("afterhours-saved", callback); return () => { window.removeEventListener("storage", callback); window.removeEventListener("afterhours-saved", callback); }; }
function getSaved() { try { return localStorage.getItem(storageKey) || "[]"; } catch { return "[]"; } }
function toggleSaved(id: string) { try { const value: string[] = JSON.parse(getSaved()); localStorage.setItem(storageKey, JSON.stringify(value.includes(id) ? value.filter(item => item !== id) : [...value, id])); window.dispatchEvent(new Event("afterhours-saved")); } catch { /* Storage may be unavailable in private browsing. */ } }

function inPeriod(event: NightEvent, period: Period, now: Date) {
  if (!event.startAt) return false;
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 4 * 3600000);
  if (period === "Past nights") return end < now;
  if (end < now) return false;
  if (period === "Tonight") return localDay(start) === localDay(now);
  if (period === "This month") return localDay(start).slice(0, 7) === localDay(now).slice(0, 7);
  if (period === "This weekend") {
    const today = new Date(`${localDay(now)}T00:00:00+08:00`);
    const weekday = new Date(today.getTime() + 8 * 3600000).getUTCDay();
    const daysToFriday = weekday === 0 ? -2 : weekday === 6 ? -1 : (5 - weekday + 7) % 7;
    const friday = new Date(today.getTime() + daysToFriday * 86400000);
    return start >= friday && start < new Date(friday.getTime() + 3 * 86400000);
  }
  return true;
}

function downloadCalendar(eventList: NightEvent[]) {
  const escape = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
  const stamp = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Afterhours KL//Nightlife//EN", "CALSCALE:GREGORIAN"];
  for (const event of eventList.filter(item => item.startAt)) {
    lines.push("BEGIN:VEVENT", `UID:${escape(event.id)}@afterhours-kl`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(event.startAt!)}`, `SUMMARY:${escape(event.title)}`, `LOCATION:${escape(`${event.venue}, ${event.area}`)}`, `DESCRIPTION:${escape(`${event.description}\nOriginal listing: ${event.url}`)}`, `URL:${event.url}`);
    if (event.endAt) lines.push(`DTEND:${stamp(event.endAt)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = "afterhours-nights.ics"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Artwork({ event, className = "", eager = false }: { event: NightEvent; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const tone = event.id.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0) % 4;
  return <div className={`artwork tone-${tone} ${className}`}>
    {event.image && !failed ? <img src={event.image} alt={`${event.title} artwork`} loading={eager ? "eager" : "lazy"} referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <div className="artwork-fallback"><Disc3 strokeWidth={0.6} /><span>{event.venue}</span><strong>{event.title}</strong><small>AFTERHOURS / KLANG VALLEY</small></div>}
  </div>;
}

function EventCard({ event, saved, onOpen, view }: { event: NightEvent; saved: boolean; onOpen: () => void; view: "grid" | "list" }) {
  return <article className={`event-card ${view === "list" ? "list-card" : ""}`}>
    <div className="card-image-wrap"><button className="artwork-button" onClick={onOpen} aria-label={`View ${event.title}`}><Artwork event={event} /></button><span className="artwork-category">{event.category}</span><button className={`save-button ${saved ? "is-saved" : ""}`} aria-label={`${saved ? "Unsave" : "Save"} ${event.title}`} aria-pressed={saved} onClick={() => toggleSaved(event.id)}><Bookmark size={16} fill={saved ? "currentColor" : "none"} /></button></div>
    <div className="card-body"><div className="event-date">{event.startAt ? <><span>{shortDate(event.startAt)}</span><i />{time(event.startAt)}</> : <><span>THE CITY GUIDE</span><i />Venue</>}</div><button className="event-title" title={event.title} onClick={onOpen}><span>{event.title}</span><ArrowUpRight size={17} /></button><p className="event-venue"><MapPin size={13} />{event.venue}<span>· {event.area}</span></p><div className="card-bottom"><span>{event.genres.slice(0, 2).join(" · ") || event.category}</span><span>{event.kind === "venue" ? "Explore" : event.price || "See listing"}<ArrowUpRight size={12} /></span></div></div>
  </article>;
}

function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); const old = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = old; }; }, []);
  return <dialog ref={ref} aria-label={wide ? "Event details" : "About Afterhours and sources"} className={`modal ${wide ? "modal-wide" : ""}`} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><button className="modal-close icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button>{children}</dialog>;
}

export function NightlifeApp() {
  const [tab, setTab] = useState<Tab>("Discover");
  const [period, setPeriod] = useState<Period>("Upcoming");
  const [category, setCategory] = useState("All vibes");
  const [area, setArea] = useState("All areas");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState("Curated for you");
  const [selected, setSelected] = useState<NightEvent | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [copied, setCopied] = useState(false);
  const [limit, setLimit] = useState(12);
  const rawSaved = useSyncExternalStore(subscribeSaved, getSaved, () => "[]");
  const saved: string[] = useMemo(() => { try { const parsed: unknown = JSON.parse(rawSaved); return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []; } catch { return []; } }, [rawSaved]);
  const now = useSyncExternalStore(subscribeNow, getClientNow, getServerNow);
  const current = useMemo(() => new Date(now), [now]);
  const upcoming = useMemo(() => events.filter(event => event.kind === "event" && inPeriod(event, "Upcoming", current)).sort((a, b) => (a.startAt || "").localeCompare(b.startAt || "")), [current]);
  const featured = upcoming.find(event => event.featured && event.category === "Club nights") || upcoming.find(event => event.featured) || upcoming[0] || events[0];
  const categories = ["All vibes", ...new Set(events.map(event => event.category))];
  const areas = [...new Set(["All areas", "Kuala Lumpur", "Selangor", ...events.map(event => event.area)])];
  const filtered = useMemo(() => events.filter(event => {
    if (tab === "Places" && event.kind !== "venue") return false;
    if (tab !== "Places" && tab !== "Saved" && (event.kind !== "event" || !inPeriod(event, period, current))) return false;
    if (tab === "Saved" && !saved.includes(event.id)) return false;
    if (category !== "All vibes" && event.category !== category) return false;
    if (area !== "All areas" && event.area !== area && event.region !== area) return false;
    return `${event.title} ${event.venue} ${event.area} ${event.genres.join(" ")} ${event.category}`.toLowerCase().includes(query.toLowerCase());
  }).sort((a, b) => sort === "A to Z" && tab !== "Calendar" ? a.title.localeCompare(b.title) : sort === "Curated for you" && tab !== "Calendar" && period !== "Past nights" && a.featured !== b.featured ? Number(Boolean(b.featured)) - Number(Boolean(a.featured)) : sort === "Curated for you" && tab !== "Calendar" && period !== "Past nights" && a.featured && b.featured && a.category !== b.category ? ["Club nights", "Parties", "Jazz & Soul", "Live music", "Comedy"].indexOf(a.category) - ["Club nights", "Parties", "Jazz & Soul", "Live music", "Comedy"].indexOf(b.category) : period === "Past nights" ? (b.startAt || "").localeCompare(a.startAt || "") : (a.startAt || "").localeCompare(b.startAt || "")), [area, category, current, period, query, saved, sort, tab]);
  const groups = filtered.reduce<Record<string, NightEvent[]>>((acc, event) => { const key = event.startAt ? fullDate(event.startAt) : "Places for your next night"; (acc[key] ||= []).push(event); return acc; }, {});
  const reset = () => { setQuery(""); setArea("All areas"); setCategory("All vibes"); setPeriod("Upcoming"); setLimit(12); };
  const changeTab = (next: Tab) => { setTab(next); reset(); if (next !== "Discover") document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" }); };

  return <>
    <a className="skip-link" href="#discover">Skip to events</a>
    <header className="site-header"><div className="header-inner"><button className="brand" onClick={() => changeTab("Discover")} aria-label="Afterhours home"><span className="brand-mark"><AudioLines size={22} strokeWidth={2.3} /></span>afterhours<span className="brand-dot">.</span></button><nav aria-label="Main navigation">{(["Discover", "Calendar", "Places"] as Tab[]).map(item => <button className={tab === item ? "nav-active" : ""} key={item} onClick={() => changeTab(item)}>{item}</button>)}</nav><div className="header-actions"><span className="city-clock"><span className="live-dot" />KL, MY <span>GMT+8</span></span><button className="icon-button" aria-label="Search events" onClick={() => { setShowSearch(!showSearch); document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" }); }}><Search size={19} /></button><button className={`saved-nav ${tab === "Saved" ? "active" : ""}`} onClick={() => changeTab("Saved")}><Bookmark size={15} />Saved{saved.length > 0 && <span>{saved.length}</span>}</button></div></div></header>
    <main className="main-shell">
      <section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><div className="location-label"><span className="live-dot" />KUALA LUMPUR & SELANGOR<ArrowUpRight size={12} /></div><h1 id="hero-title">Less scrolling.<br />More <em>good nights.</em></h1><p>For the music, the people, and the stories tomorrow.<br className="desktop-break" /> Your guide to the Klang Valley after dark.</p><a className="hero-explore" href="#discover">Find your night<ArrowDown size={16} /></a><div className="hero-smallprint"><span className="tiny-orbit">✳</span> A little local knowledge goes a long way.</div></div><div className="hero-visual"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-star star-one">✳</div><div className="hero-star star-two">✦</div>{featured && <button className="featured-poster" onClick={() => setSelected(featured)}><Artwork event={featured} eager /><div className="featured-shade" /><div className="featured-top"><span><Sparkles size={11} /> ON OUR RADAR</span><ArrowUpRight size={17} /></div><div className="featured-bottom"><small>{featured.startAt ? `${shortDate(featured.startAt)} · ${featured.area}` : featured.area}</small><strong>{featured.title}</strong><span>{featured.venue}<ArrowRight size={16} /></span></div></button>}<div className="hero-caption"><span className="live-dot" />THE NIGHT IS STILL YOUNG<span>03°08′ N 101°41′ E</span></div></div></section>
      <section id="discover" className="discovery-section"><div className="section-title-row"><div><div className="eyebrow">GO WHERE YOU FEEL SOMETHING</div><h2>{tab === "Saved" ? "Your kind of nights" : tab === "Places" ? "Know a good place?" : tab === "Calendar" ? "Make a little room for fun" : "Find your next night out"}<span className="heading-dot">.</span></h2></div><button className="source-status" onClick={() => setShowSources(true)}><span className="live-dot" />From the source<Info size={13} /></button></div>
      <div className="discovery-toolbar"><div className="date-tabs" aria-label="Event date">{tab === "Places" ? <span className="places-label"><Compass size={16} /> The local address book</span> : tab === "Saved" ? <span className="places-label"><Bookmark size={15} /> Saved on this device</span> : (["Upcoming", "Tonight", "This weekend", "This month", "Past nights"] as Period[]).map(item => <button className={period === item ? "selected" : ""} key={item} onClick={() => setPeriod(item)}>{item === "Upcoming" && <Moon size={13} />}{item}</button>)}</div><div className="filter-buttons"><label className="select-wrap"><MapPin size={14} /><select aria-label="Filter by area" value={area} onChange={event => setArea(event.target.value)}>{areas.map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={12} /></label><button className={`filter-toggle ${showFilters ? "active" : ""}`} onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}><SlidersHorizontal size={15} /><span>Filters</span></button></div></div>
      {(showSearch || showFilters) && <div className="expanded-filters"><label className="search-field"><Search size={17} /><input aria-label="Search events, artists or venues" placeholder="Search events, artists, or a favourite spot…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery("")}><X size={16} /></button>}</label>{showFilters && <label className="sort-select"><ArrowDownUp size={14} /><select aria-label="Sort events" value={sort} onChange={event => setSort(event.target.value)}><option>Curated for you</option><option>Soonest first</option><option>A to Z</option></select><ChevronDown size={12} /></label>}</div>}
      <div className="category-row"><div className="category-scroll">{categories.map((item, index) => <button key={item} className={`category-chip ${category === item ? "selected" : ""}`} onClick={() => setCategory(item)}>{index === 0 ? <Sparkles size={13} /> : /club|dj|electronic/i.test(item) ? <Disc3 size={13} /> : /music|jazz/i.test(item) ? <AudioLines size={13} /> : <Ticket size={13} />}{item}</button>)}</div><div className="view-toggle" aria-label="Event layout"><button className={view === "grid" && tab !== "Calendar" ? "active" : ""} aria-label="Grid view" onClick={() => { setView("grid"); if (tab === "Calendar") setTab("Discover"); }}><Grid2X2 size={16} /></button><button className={view === "list" || tab === "Calendar" ? "active" : ""} aria-label="List view" onClick={() => setView("list")}><List size={17} /></button></div></div>
      <div className="results-caption" aria-live="polite"><span>{filtered.length} {tab === "Places" ? "places to know" : tab === "Saved" ? "saved favourites" : period === "Past nights" ? "past events" : "nights to look forward to"}{area !== "All areas" && ` in ${area}`}</span><span>All times in MYT <span className="caption-separator">/</span> Good company encouraged</span></div>
      {filtered.length === 0 ? <div className="empty-state"><Moon size={32} strokeWidth={1} /><h3>{tab === "Saved" ? "Keep the good ones close." : "A quiet night, for now."}</h3><p>{tab === "Saved" ? "Tap the bookmark on any event to build your own little night-out list." : "No verified listings match these filters. Try another date, area, or vibe."}</p><button className="primary-button" onClick={() => { reset(); if (tab === "Saved") setTab("Discover"); }}>Explore all nights<ArrowRight size={15} /></button></div> : tab === "Calendar" ? <div className="calendar-feed">{Object.entries(groups).map(([date, group]) => <div key={date} className="calendar-group"><h3><CalendarDays size={17} />{date}</h3><div>{group.map(event => <EventCard key={event.id} event={event} saved={saved.includes(event.id)} view="list" onOpen={() => setSelected(event)} />)}</div></div>)}</div> : <div className={`events-grid ${view === "list" ? "events-list" : ""}`}>{filtered.slice(0, limit).map(event => <EventCard key={event.id} event={event} saved={saved.includes(event.id)} view={view} onOpen={() => setSelected(event)} />)}</div>}
      {tab !== "Calendar" && filtered.length > limit && <button className="load-more" onClick={() => setLimit(limit + 12)}>More good nights<ArrowDown size={15} /></button>}<div className="listing-note"><Check size={13} /><p>Real listings. Original sources. Always check the organiser for the latest details.</p><button onClick={() => setShowSources(true)}>How we find nights<ArrowUpRight size={12} /></button></div></section>
      <section className="city-guide"><div className="guide-art"><span>KL</span><span>AFTER<br />DARK<span className="guide-spark">✳</span></span><div className="guide-grid" /></div><div className="guide-copy"><div className="eyebrow"><Compass size={13} />GET TO KNOW THE NEIGHBOURHOOD</div><h2>Same city.<br /><em>A different side.</em></h2><p>Hidden listening rooms. Familiar dance floors.<br />Find the places that make this city feel like yours.</p><button onClick={() => { changeTab("Places"); document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" }); }}>Explore the local address book<ArrowUpRight size={16} /></button></div><div className="guide-index"><span>THE KLANG VALLEY</span><strong>01—03</strong><Moon size={32} strokeWidth={0.8} /></div></section>
    </main>
    <footer className="site-footer"><div><span className="footer-brand">afterhours.</span><p>A good night is closer than you think.</p></div><div className="footer-links"><button onClick={() => setShowSources(true)}>About & sources<ArrowUpRight size={12} /></button><a href="https://github.com/olishiz/afterhours-kl/issues/new?title=Suggest%20an%20event&body=Event%20name%3A%0AOriginal%20event%20URL%3A%0AVenue%20and%20date%3A" target="_blank" rel="noreferrer">Suggest a night<ArrowUpRight size={12} /></a></div><div className="footer-credit"><span>MADE FOR NIGHTS LIKE THESE</span><span>Kuala Lumpur & Selangor <Heart size={11} /></span></div></footer>
    {selected && <Modal onClose={() => { setSelected(null); setCopied(false); }} wide><div className="event-detail"><Artwork event={selected} eager /><div className="detail-copy"><span className="detail-category">{selected.category} · {selected.region}</span><h2>{selected.title}</h2><div className="detail-facts"><p><CalendarDays size={19} /><span>{selected.startAt ? fullDate(selected.startAt) : "A place for your next night"}<small>{selected.startAt ? `${time(selected.startAt)} MYT${selected.endAt ? ` – ${time(selected.endAt)}` : ""}` : "Check the venue for opening hours and programme"}</small></span></p><p><MapPin size={19} /><span>{selected.venue}<small>{selected.area}, {selected.region}</small></span></p><p><Ticket size={19} /><span>{selected.price || "See original listing"}<small>Availability and admission are set by the organiser</small></span></p></div><p className="detail-description">{selected.description}</p><div className="detail-genres">{selected.genres.map(genre => <span key={genre}>{genre}</span>)}</div><a className="primary-button" href={selected.url} target="_blank" rel="noreferrer">{selected.kind === "venue" ? "Visit venue website" : "View original listing"}<ArrowUpRight size={16} /></a><div className="detail-actions"><button className="secondary-button" onClick={() => toggleSaved(selected.id)}><Bookmark size={15} fill={saved.includes(selected.id) ? "currentColor" : "none"} />{saved.includes(selected.id) ? "Saved" : "Save night"}</button>{selected.startAt && <button className="secondary-button" onClick={() => downloadCalendar([selected])}><CalendarDays size={15} />Add to calendar</button>}<button className="secondary-button" onClick={async () => { try { await navigator.clipboard.writeText(selected.url); setCopied(true); } catch { setCopied(false); } }}>{copied ? <Check size={15} /> : <ExternalLink size={15} />}{copied ? "Copied" : "Copy link"}</button></div><a className="map-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selected.venue} ${selected.area} Malaysia`)}`} target="_blank" rel="noreferrer">Find the venue on Maps<ArrowUpRight size={13} /></a><div className="detail-source"><Check size={12} />From {selected.source} · Checked {shortDate(selected.verifiedAt)}</div></div></div></Modal>}
    {showSources && <Modal onClose={() => setShowSources(false)}><div className="sources-content"><div className="modal-symbol"><Globe2 size={25} strokeWidth={1.3} /></div><div className="eyebrow">A LITTLE LOCAL KNOWLEDGE</div><h2>Good nights.<br />Straight from the source.</h2><p>Afterhours brings together public nightlife listings around Kuala Lumpur and Selangor. Each event links to its original organiser or ticket page, where you can confirm the programme and book.</p><p>We collect from accessible public sources. Some venues publish only on social media, so this guide doesn’t cover every night in the city. Places are venue recommendations, not scheduled events.</p><div className="sources-list">{sources.map((source, index) => <a href={source.url} target="_blank" rel="noreferrer" key={`${source.name}-${index}`}><span><Globe2 size={15} />{source.name}</span><ArrowUpRight size={15} /></a>)}</div><div className="sources-updated"><Clock3 size={13} />Listings last refreshed {fullDate(lastUpdated)}</div><p className="source-footnote">Saved nights stay in this browser. Ticket sales and event admission are handled by the original providers. This independent guide is inspired by Luma’s discovery layout.</p></div></Modal>}
  </>;
}
