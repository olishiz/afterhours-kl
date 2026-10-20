"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Camera, ChevronDown, Clock3, MapPin, Moon, Search, Sun, X } from "lucide-react";
import { events, isUpcoming, lastUpdated, type NightEvent } from "@/lib/events";
import { places, placesLastUpdated, type NightPlace } from "@/lib/places";
import { asset } from "@/lib/base-path";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/sites/afterhours/logo";
import { DetailSheet, ListingCover } from "@/components/sites/afterhours/detail-sheet";
import { applyTheme, readTheme, themeStorageKey, type ThemeName } from "@/components/sites/afterhours/theme";

const timeZone = "Asia/Kuala_Lumpur";
const clockFmt = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const weekdayFmt = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long" });
const dayMonthFmt = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short" });
const updatedFmt = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
type View = "events" | "places";

function dayKey(date: string | Date) {
  return dayFmt.format(new Date(date));
}

function isFree(price: string | null) {
  return !!price && /^free\b/i.test(price);
}

function inWeekend(event: NightEvent, now: Date) {
  if (!event.startAt) return false;
  const today = new Date(`${dayKey(now)}T00:00:00+08:00`);
  const weekday = new Date(today.getTime() + 8 * 3600000).getUTCDay();
  const daysToFriday = weekday === 0 ? -2 : weekday === 6 ? -1 : (5 - weekday + 7) % 7;
  const friday = today.getTime() + daysToFriday * 86400000;
  const start = Date.parse(event.startAt);
  return start >= friday && start < friday + 3 * 86400000;
}

function tonightWindow(event: NightEvent, now: Date) {
  if (!event.startAt) return false;
  const midnight = Date.parse(`${dayKey(now)}T00:00:00+08:00`);
  const hour = Number(clockFmt.format(now).slice(0, 2));
  const start = midnight + (hour < 6 ? -1 : 0) * 86400000 + 17 * 3600000;
  const eventStart = Date.parse(event.startAt);
  const eventEnd = event.endAt ? Date.parse(event.endAt) : eventStart + 6 * 3600000;
  return eventStart < start + 13 * 3600000 && eventEnd >= Math.max(start, now.getTime());
}

function placeEvent(place: NightPlace): NightEvent {
  return {
    id: `place-${place.id}`, title: place.name, venue: place.name, area: place.area, region: place.region,
    category: place.category, genres: place.genres, startAt: null, price: null, image: place.image,
    url: place.url, source: `${place.category} · ${place.area}`, description: place.description,
    kind: "venue", verifiedAt: place.verifiedAt,
  };
}

export function CityPage({ now }: { now: string }) {
  const [current, setCurrent] = useState(now);
  const [view, setView] = useState<View>("events");
  const [tonight, setTonight] = useState(false);
  const [weekend, setWeekend] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [area, setArea] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const discoverRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    const tick = () => setCurrent(new Date().toISOString());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const syncLocation = () => {
      const id = window.location.hash.slice(1);
      setSelectedId(id && id !== "discover" && id !== "events" ? id : null);
      setView(new URLSearchParams(window.location.search).get("view") === "places" || id.startsWith("place-") ? "places" : "events");
    };
    syncLocation();
    window.addEventListener("popstate", syncLocation);
    window.addEventListener("hashchange", syncLocation);
    return () => {
      window.removeEventListener("popstate", syncLocation);
      window.removeEventListener("hashchange", syncLocation);
    };
  }, []);

  const moment = useMemo(() => new Date(current), [current]);
  const upcoming = useMemo(() => events.filter((event) => isUpcoming(event, moment)).sort((a, b) => (a.startAt || "").localeCompare(b.startAt || "")), [moment]);
  const areas = [...new Set([...upcoming, ...places].map((item) => item.area))].sort((a, b) => a.localeCompare(b));
  const genres = [...new Set((view === "events" ? upcoming : places).flatMap((item) => [item.category, ...item.genres]))].sort((a, b) => a.localeCompare(b));
  const needle = query.trim().toLowerCase();

  const visible = upcoming.filter((event) => {
    if (tonight && !tonightWindow(event, moment)) return false;
    if (weekend && !inWeekend(event, moment)) return false;
    if (freeOnly && !isFree(event.price)) return false;
    if (area && event.area !== area && event.region !== area) return false;
    if (genre && event.category !== genre && !event.genres.includes(genre)) return false;
    return !needle || [event.title, event.venue, event.area, event.region, event.category, ...event.genres].join(" ").toLowerCase().includes(needle);
  });
  const visiblePlaces = places.filter((place) => {
    if (area && place.area !== area && place.region !== area) return false;
    if (genre && place.category !== genre && !place.genres.includes(genre)) return false;
    return !needle || [place.name, place.area, place.region, place.category, ...place.genres].join(" ").toLowerCase().includes(needle);
  });
  const groups = visible.reduce<Array<{ key: string; date: string; weekday: string; events: NightEvent[] }>>((list, event) => {
    const key = dayKey(event.startAt || "");
    const group = list.find((item) => item.key === key);
    if (group) group.events.push(event);
    else {
      const date = new Date(event.startAt || "");
      const tomorrow = new Date(moment.getTime() + 86400000);
      list.push({ key, date: key === dayKey(moment) ? "Today" : key === dayKey(tomorrow) ? "Tomorrow" : dayMonthFmt.format(date), weekday: weekdayFmt.format(date), events: [event] });
    }
    return list;
  }, []);

  const selectedPlace = places.find((place) => `place-${place.id}` === selectedId);
  const selected = selectedPlace ? placeEvent(selectedPlace) : upcoming.find((event) => event.id === selectedId) ?? null;
  const navList = selectedPlace
    ? (visiblePlaces.some((place) => place.id === selectedPlace.id) ? visiblePlaces : places).map(placeEvent)
    : selected && visible.some((event) => event.id === selected.id) ? visible : upcoming;
  const selectedIndex = selected ? navList.findIndex((event) => event.id === selected.id) : -1;
  const filtersActive = tonight || weekend || freeOnly || !!area || !!genre || !!needle;
  const total = view === "events" ? visible.length : visiblePlaces.length;

  function jumpToDiscover() {
    discoverRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }

  function selectView(next: View, scroll = true) {
    setView(next);
    setGenre(null);
    setTonight(false);
    setWeekend(false);
    setFreeOnly(false);
    const params = new URLSearchParams(window.location.search);
    if (next === "places") params.set("view", "places");
    else params.delete("view");
    window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
    setSelectedId(null);
    if (scroll) jumpToDiscover();
  }

  function openListing(id: string) {
    window.history.pushState({ afterhoursSheet: true }, "", `${window.location.pathname}${window.location.search}#${id}`);
    setSelectedId(id);
  }

  function stepListing(id: string) {
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${id}`);
    setSelectedId(id);
  }

  function closeListing() {
    setSelectedId(null);
    if (window.history.state?.afterhoursSheet) window.history.back();
    else {
      const params = new URLSearchParams(window.location.search);
      if (view === "places") params.set("view", "places");
      else params.delete("view");
      window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
    }
  }

  function clearFilters() {
    setTonight(false); setWeekend(false); setFreeOnly(false); setArea(null); setGenre(null); setQuery("");
  }

  function toggleTheme() {
    const next: ThemeName = readTheme() === "dark" ? "light" : "dark";
    try { localStorage.setItem(themeStorageKey, next); } catch { /* private mode */ }
    applyTheme(next);
  }

  function openSearch() {
    setSearchOpen((open) => !open);
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }

  return (
    <>
      <a className="skip-link" href="#discover">Skip to nightlife listings</a>
      <header className={cn("site-header", scrolled && "is-scrolled")}>
        <Link href="/" aria-label="afterhours home" className="brand-link" onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); clearFilters(); selectView("events", false); window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }}><Logo accent="currentColor" /></Link>
        <nav aria-label="Main navigation" className="header-nav">
          <time dateTime={current} className="header-clock">{clockFmt.format(moment)} GMT+8</time>
          <button type="button" className="nav-link" onClick={() => selectView("events")}>Discover Events</button>
          <button type="button" className="nav-places" onClick={() => selectView("places")}>Places <ArrowUpRight size={13} aria-hidden="true" /></button>
          <button type="button" className="theme-button" aria-label="Toggle color theme" onClick={toggleTheme}>
            <Sun className="icon-sun" size={16} aria-hidden="true" /><Moon className="icon-moon" size={16} aria-hidden="true" />
          </button>
        </nav>
      </header>

      <section className="city-hero" aria-labelledby="city-title">
        <picture>
          <source media="(max-width: 650px)" srcSet={asset("/sites/luma/kl-mobile.jpg")} />
          <img className="hero-image" src={asset("/sites/luma/kl-desktop.jpg")} alt="" fetchPriority="high" />
        </picture>
        <div className="hero-fader" />
        <div className="page-container hero-container">
          <div className="hero-content">
            <CityIcon />
            <p className="hero-eyebrow">What’s Happening in</p>
            <h1 id="city-title">Kuala Lumpur</h1>
            <p className="hero-clock"><Clock3 size={16} aria-hidden="true" /><time dateTime={current}>{clockFmt.format(moment)} GMT+8</time></p>
            <hr />
            <p className="hero-description">Discover club nights, live music and late-night spots in Kuala Lumpur &amp; Selangor. From the first drink to the last dance, find your kind of night.</p>
            <form className="hero-search" onSubmit={(event) => { event.preventDefault(); setSearchOpen(!!query); jumpToDiscover(); }} role="search">
              <label className="sr-only" htmlFor="hero-search">Search nightlife</label>
              <input id="hero-search" placeholder="Find your next night out" value={query} onChange={(event) => setQuery(event.target.value)} />
              <button type="submit">Explore <ArrowDown size={15} aria-hidden="true" /></button>
            </form>
          </div>
        </div>
      </section>

      <main id="discover" ref={discoverRef} className="discovery page-container">
        <div className="listing-column">
          <div className="listing-controls">
            <div className="listing-heading-row">
              <div className="view-switch" aria-label="Explore nightlife">
                <h2><button type="button" className={cn("view-button", view === "events" && "active")} aria-pressed={view === "events"} onClick={() => selectView("events", false)}>Events</button></h2>
                <h2><button type="button" className={cn("view-button", view === "places" && "active")} aria-pressed={view === "places"} onClick={() => selectView("places", false)}>Places</button></h2>
              </div>
              <div className="listing-actions">
                <span className="listing-count">{total} {view === "events" ? "upcoming" : "spots"}</span>
                <button type="button" className={cn("pill icon-button", searchOpen && "is-on")} aria-label="Search listings" aria-expanded={searchOpen} aria-controls="listing-search" onClick={openSearch}><Search size={16} aria-hidden="true" /></button>
              </div>
            </div>
            {searchOpen && (
              <div className="listing-search">
                <Search size={16} aria-hidden="true" />
                <input id="listing-search" ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events, spots, or music" aria-label="Search listings by name, venue, area, or genre" onKeyDown={(event) => { if (event.key === "Escape") { setSearchOpen(false); setQuery(""); } }} />
                <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); searchRef.current?.focus(); }}><X size={15} aria-hidden="true" /></button>
              </div>
            )}
            <div className="filter-row" role="group" aria-label={view === "events" ? "Filter events" : "Filter places"}>
              {view === "events" && <><Chip pressed={tonight} onClick={() => { setTonight(!tonight); setWeekend(false); }}>Tonight</Chip><Chip pressed={weekend} onClick={() => { setWeekend(!weekend); setTonight(false); }}>This weekend</Chip></>}
              <FilterSelect label="Area" value={area} options={["Kuala Lumpur", "Selangor", ...areas.filter((item) => item !== "Kuala Lumpur" && item !== "Selangor")]} onChange={setArea} />
              <FilterSelect label={view === "events" ? "Genre" : "Vibe"} value={genre} options={genres} onChange={setGenre} />
              {view === "events" && <Chip pressed={freeOnly} onClick={() => setFreeOnly(!freeOnly)}>Free</Chip>}
              {filtersActive && <button type="button" className="clear-filters" onClick={clearFilters}>Reset <X size={12} aria-hidden="true" /></button>}
            </div>
          </div>

          <p className="sr-only" aria-live="polite">{total} {view === "events" ? "events" : "places"} found</p>
          {total === 0 ? <div className="empty-state"><Moon size={28} strokeWidth={1.3} aria-hidden="true" /><h3>No {view === "events" ? "nights" : "spots"} found</h3><p>Try another area, a different vibe, or a fresh search.</p><button type="button" className="pill" onClick={clearFilters}>Clear filters</button></div> : view === "events" ? (
            <div className="event-timeline">
              <div className="timeline-line" aria-hidden="true" />
              {groups.map((group) => (
                <section key={group.key} className="date-group" aria-label={`${group.date}, ${group.weekday}`}>
                  <div className="date-heading"><span className="timeline-dot" aria-hidden="true" /><h3>{group.date} <span>{group.weekday}</span></h3></div>
                  <div className="date-events">{group.events.map((event) => <EventCard key={event.id} event={event} pressed={event.id === selectedId} onOpen={() => openListing(event.id)} />)}</div>
                </section>
              ))}
            </div>
          ) : (
            <div className="places-list">
              <p className="places-intro">Good music. Great rooms. A few local favourites to start your night.</p>
              {visiblePlaces.map((place) => <PlaceCard key={place.id} place={place} onOpen={() => openListing(`place-${place.id}`)} />)}
              <p className="places-note">An editorial shortlist. Check each venue’s latest programme before heading out.</p>
            </div>
          )}

          <footer className="page-footer">
            <Logo accent="currentColor" />
            <p>Your next good night starts here.</p>
            <div className="footer-meta"><span>Kuala Lumpur &amp; Selangor</span><span>All times in MYT</span></div>
            <p className="footer-fine">{view === "events" ? "Events" : "Places"} checked {updatedFmt.format(new Date(view === "events" ? lastUpdated : placesLastUpdated))}. Details and availability may change.</p>
            <p className="footer-fine">City photography via <a href="https://luma.com/kuala-lumpur" target="_blank" rel="noreferrer">Luma</a>.</p>
          </footer>
        </div>

        <aside className="city-sidebar" aria-label="Explore Kuala Lumpur">
          <div className="sidebar-content">
            <CityIcon purple />
            <h2>Kuala Lumpur</h2>
            <p>Good nights don’t find themselves. Discover what’s on, find your people, and make a night of it.</p>
            <button type="button" className="primary-button" onClick={() => { selectView(view === "events" ? "places" : "events"); clearFilters(); }}>{view === "events" ? "Explore nightlife spots" : "See upcoming events"}<ArrowUpRight size={16} aria-hidden="true" /></button>
            <a className="city-map" href="https://www.google.com/maps/search/?api=1&query=Kuala%20Lumpur%20Malaysia" target="_blank" rel="noreferrer" aria-label="Explore Kuala Lumpur and Selangor on the map">
              <iframe title="Map of Kuala Lumpur and Selangor" src="https://maps.google.com/maps?q=Kuala%20Lumpur%2C%20Malaysia&z=11&output=embed" loading="lazy" tabIndex={-1} aria-hidden="true" />
              <span><MapPin size={14} aria-hidden="true" /> KL &amp; Selangor <ArrowUpRight size={13} aria-hidden="true" /></span>
            </a>
            <div className="sidebar-section-heading"><h3>Places to know</h3><button type="button" onClick={() => { clearFilters(); selectView("places"); }}>View all <ArrowUpRight size={12} aria-hidden="true" /></button></div>
            <div className="sidebar-places">{places.filter((place) => ["kyo", "iron-fairies", "locker-loft"].includes(place.id)).slice(0, 3).map((place) => <button type="button" key={place.id} className="sidebar-place" onClick={() => openListing(`place-${place.id}`)}><ListingCover image={place.image} name={place.name} className="sidebar-place-image" /><span><strong>{place.name}</strong><small>{place.category} · {place.area}</small></span><ArrowUpRight size={14} aria-hidden="true" /></button>)}</div>
          </div>
        </aside>
      </main>

      {selected && <DetailSheet event={selected} titleId={titleId} hasPrev={selectedIndex > 0} hasNext={selectedIndex >= 0 && selectedIndex < navList.length - 1} onPrev={() => selectedIndex > 0 && stepListing(navList[selectedIndex - 1].id)} onNext={() => selectedIndex >= 0 && selectedIndex < navList.length - 1 && stepListing(navList[selectedIndex + 1].id)} onClose={closeListing} socialLinks={selectedPlace ? [{ label: "Instagram", url: selectedPlace.instagram }, { label: "Threads", url: selectedPlace.threads }].filter((link): link is { label: string; url: string } => !!link.url) : undefined} />}
    </>
  );
}

function EventCard({ event, pressed, onOpen }: { event: NightEvent; pressed: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-haspopup="dialog" aria-expanded={pressed} className="event-card">
      <div className="event-card-content">
        <time className="event-time" dateTime={event.startAt || undefined}>{event.startAt ? clockFmt.format(new Date(event.startAt)) : ""}</time>
        <h4>{event.title}</h4>
        <p className="event-host"><span className="source-avatar" aria-hidden="true">{event.source.slice(0, 1)}</span>Via {event.source}</p>
        <p className="event-location"><MapPin size={15} aria-hidden="true" /><span>{event.venue}</span></p>
        <div className="event-tags">{event.price && <span className={cn("price-tag", isFree(event.price) && "is-free")}>{event.price}</span>}<span className="category-tag">{event.category}</span></div>
      </div>
      <ListingCover image={event.image} name={event.title} className="event-cover" />
    </button>
  );
}

function PlaceCard({ place, onOpen }: { place: NightPlace; onOpen: () => void }) {
  return (
    <article className="place-card">
      <button type="button" className="place-main" onClick={onOpen} aria-haspopup="dialog">
        <ListingCover image={place.image} name={place.name} className="place-cover" />
        <div className="place-content"><span className="place-category">{place.category}</span><h3>{place.name}</h3><span className="event-location"><MapPin size={14} aria-hidden="true" />{place.area}, {place.region}</span><span className="place-description">{place.description}</span><span className="place-genres">{place.genres.slice(0, 3).join(" · ")}</span></div>
        <ArrowUpRight size={17} className="place-arrow" aria-hidden="true" />
      </button>
      {place.instagram && <a className="place-instagram" href={place.instagram} target="_blank" rel="noreferrer" aria-label={`${place.name} on Instagram`}><Camera size={14} aria-hidden="true" />Latest on Instagram <ArrowUpRight size={12} aria-hidden="true" /></a>}
    </article>
  );
}

function CityIcon({ purple = false }: { purple?: boolean }) {
  return (
    <div className={cn("city-icon", purple && "purple")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset("/sites/luma/kl-icon.png")} alt="" width={36} height={36} />
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string | null; options: string[]; onChange: (value: string | null) => void }) {
  return <label className={cn("pill filter-select", value && "is-on")}><span aria-hidden="true">{value || label}</span><select aria-label={label} value={value ?? ""} onChange={(event) => onChange(event.target.value || null)}><option value="">{label}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown size={12} aria-hidden="true" /></label>;
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-pressed={pressed} onClick={onClick} className="pill">{children}</button>;
}
