"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, ChevronUp, Link2, Map, MapPin, Moon, Search, Sun, X } from "lucide-react";
import { events, isUpcoming, lastUpdated, type NightEvent } from "@/lib/events";
import { asset } from "@/lib/base-path";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/sites/afterhours/logo";
import { applyTheme, readTheme, themeStorageKey, type ThemeName } from "@/components/sites/afterhours/theme";

const timeZone = "Asia/Kuala_Lumpur";
const skyline = asset("/photos/kl-night-skyline.jpg");

const clockFmt = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const weekdayFmt = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long" });
const dayMonthFmt = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short" });
const longDateFmt = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long", day: "numeric", month: "long" });
const monthFmt = new Intl.DateTimeFormat("en-GB", { timeZone, month: "short" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric" });
const updatedFmt = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "long", year: "numeric" });

function dayKey(date: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
}

function isFree(price: string | null) {
  return !!price && /^free\b/i.test(price);
}

function priceLabel(price: string | null) {
  if (!price) return "See listing";
  if (isFree(price)) return "Free";
  return price;
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

function mapUrl(event: NightEvent) {
  const query = [event.venue, event.area, event.region, "Malaysia"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function timeRange(event: NightEvent) {
  if (!event.startAt) return "";
  const start = clockFmt.format(new Date(event.startAt));
  if (!event.endAt) return start;
  const end = Date.parse(event.endAt);
  if (!Number.isFinite(end)) return start;
  return `${start} - ${clockFmt.format(new Date(event.endAt))}`;
}

export function CityPage({ now }: { now: string }) {
  const [current, setCurrent] = useState(now);
  const [tonight, setTonight] = useState(false);
  const [weekend, setWeekend] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [area, setArea] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [onHero, setOnHero] = useState(true);
  const eventsRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    const tick = () => setCurrent(new Date().toISOString());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const node = eventsRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      setOnHero(entry.boundingClientRect.top > 56);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.replace(/^#/, "");
      setSelectedId(id || null);
    };
    fromHash();
    window.addEventListener("popstate", fromHash);
    return () => window.removeEventListener("popstate", fromHash);
  }, []);

  const moment = useMemo(() => new Date(current), [current]);
  const upcoming = useMemo(
    () => events.filter((event) => isUpcoming(event, moment)).sort((a, b) => (a.startAt || "").localeCompare(b.startAt || "")),
    [moment],
  );
  const areas = useMemo(() => [...new Set(upcoming.map((event) => event.area))].sort((a, b) => a.localeCompare(b)), [upcoming]);
  const genres = useMemo(() => {
    const values = new Set<string>();
    for (const event of upcoming) {
      values.add(event.category);
      for (const name of event.genres) values.add(name);
    }
    const preferred = ["Club nights", "Parties", "Jazz & Soul", "Live music", "Comedy", "Film", "Festivals"];
    return [...values].sort((a, b) => {
      const left = preferred.indexOf(a);
      const right = preferred.indexOf(b);
      if (left === -1 && right === -1) return a.localeCompare(b);
      if (left === -1) return 1;
      if (right === -1) return -1;
      return left - right;
    });
  }, [upcoming]);

  const visible = upcoming.filter((event) => {
    if (tonight && dayKey(event.startAt || "") !== dayKey(moment)) return false;
    if (weekend && !inWeekend(event, moment)) return false;
    if (freeOnly && !isFree(event.price)) return false;
    if (area && event.area !== area && event.region !== area) return false;
    if (genre && event.category !== genre && !event.genres.includes(genre)) return false;
    const needle = query.trim().toLowerCase();
    if (needle) {
      const haystack = [event.title, event.venue, event.area, event.category, ...event.genres].join(" ").toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const groups = visible.reduce<Array<{ key: string; date: string; weekday: string; events: NightEvent[] }>>((list, event) => {
    const key = dayKey(event.startAt || "");
    const group = list.find((item) => item.key === key);
    if (group) group.events.push(event);
    else {
      const date = new Date(event.startAt || "");
      list.push({
        key,
        date: key === dayKey(moment) ? "Today" : dayMonthFmt.format(date),
        weekday: weekdayFmt.format(date),
        events: [event],
      });
    }
    return list;
  }, []);

  const selected = upcoming.find((event) => event.id === selectedId) ?? null;
  const navList = selected && visible.some((event) => event.id === selected.id) ? visible : upcoming;
  const selectedIndex = selected ? navList.findIndex((event) => event.id === selected.id) : -1;
  const filtersActive = tonight || weekend || freeOnly || !!area || !!genre || query.trim().length > 0;

  function openEvent(id: string) {
    const url = `${window.location.pathname}${window.location.search}#${id}`;
    window.history.pushState({ event: id }, "", url);
    setSelectedId(id);
  }

  function stepEvent(id: string) {
    const url = `${window.location.pathname}${window.location.search}#${id}`;
    window.history.replaceState({ event: id }, "", url);
    setSelectedId(id);
  }

  function closeEvent() {
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
    setSelectedId(null);
  }

  function clearFilters() {
    setTonight(false);
    setWeekend(false);
    setFreeOnly(false);
    setArea(null);
    setGenre(null);
    setQuery("");
  }

  function toggleTheme() {
    const next: ThemeName = readTheme() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(themeStorageKey, next);
    } catch {
      /* ignore */
    }
    applyTheme(next);
  }

  return (
    <>
      <a className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-lg focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--accent-text)]" href="#events">
        Skip to events
      </a>
      <header className={cn("sticky top-0 z-30 flex h-14 items-center transition-colors duration-200", onHero ? "bg-transparent text-white" : "border-b border-[var(--border)] bg-[var(--page)]/90 text-[var(--text)] backdrop-blur-md")}>
        <div className="mx-auto flex w-full max-w-[960px] items-center justify-between px-4">
          <Link href="/" aria-label="afterhours home" className="rounded-md">
            <Logo accent={onHero ? "#d9eda0" : "var(--accent)"} />
          </Link>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/olishiz/afterhours-kl"
              className={cn("text-sm font-medium", onHero ? "text-white/50 hover:text-white/80" : "text-[var(--text-secondary)] hover:text-[var(--text)]")}
            >
              GitHub
            </a>
            <button
              type="button"
              className={cn("pill size-[30px] px-0", onHero && "border-transparent bg-white/10 text-white/70 hover:bg-white/16")}
              aria-label="Toggle color theme"
              onClick={toggleTheme}
            >
              <Sun className="icon-sun size-4" aria-hidden="true" />
              <Moon className="icon-moon size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <section className="relative -mt-14 min-h-[44rem] text-white md:min-h-[42rem]">
        {/* Local skyline, not a hotlinked or third-party hero. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={skyline} alt="" className="absolute inset-0 size-full object-cover object-center" />
        <div className="hero-shade absolute inset-0" />
        <div className="relative z-[1] mx-auto flex min-h-[44rem] max-w-[960px] flex-col px-4 pt-72 pb-6 md:min-h-[42rem] md:pt-40 md:pb-16">
          <div className="max-w-[29rem]">
            <div className="mb-4 size-12 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20 md:size-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={skyline} alt="" className="size-full object-cover object-[center_40%]" />
            </div>
            <p className="text-xl leading-6 font-normal text-white md:text-[28px] md:leading-[34px]">What’s Happening in</p>
            <h1 className="text-[32px] leading-[1.2] font-medium text-white md:text-[52px]">Kuala Lumpur</h1>
            <p className="mt-3 text-sm text-white tabular-nums md:text-base">
              <time dateTime={current}>{clockFmt.format(moment)} GMT+8</time>
            </p>
            <div className="my-4 h-px bg-white/25" />
            <p className="max-w-[29rem] text-base leading-6 text-white">
              Club nights, live rooms and late tables from Bukit Bintang to Bangsar and across Selangor. A public list of what’s on after dark, with times in MYT.
            </p>
            <div className="mt-4 flex justify-end">
              <a
                href="https://www.google.com/maps/search/?api=1&query=Kuala%20Lumpur"
                target="_blank"
                rel="noreferrer"
                aria-label="Open Kuala Lumpur on the map"
                className="inline-flex size-[38px] items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors duration-200 hover:bg-white/16"
              >
                <Map className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <main ref={eventsRef} id="events" className="scroll-mt-14 bg-[var(--page)]">
        <div className="mx-auto max-w-[960px] px-4 pt-2 pb-16">
          <div className="max-w-[680px]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl leading-6 font-semibold md:text-2xl md:leading-7">Events</h2>
              <button
                type="button"
                className={cn("pill size-[30px] px-0", searchOpen && "is-on")}
                aria-label="Search events"
                aria-expanded={searchOpen}
                aria-controls="event-search"
                onClick={() => {
                  setSearchOpen((open) => {
                    const next = !open;
                    if (next) window.setTimeout(() => searchRef.current?.focus(), 0);
                    return next;
                  });
                }}
              >
                <Search className="size-4" aria-hidden="true" />
              </button>
            </div>

            {searchOpen && (
              <div className="mt-3">
                <input
                  id="event-search"
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search title, venue, or genre"
                  aria-label="Search by title, venue, or genre"
                  className="h-[38px] w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-base text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </div>
            )}

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap [&::-webkit-scrollbar]:hidden" role="toolbar" aria-label="Filter events">
              <Chip pressed={tonight} onClick={() => setTonight((value) => !value)}>Tonight</Chip>
              <Chip pressed={weekend} onClick={() => setWeekend((value) => !value)}>This weekend</Chip>
              <FilterSelect label="Area" value={area} options={areas} onChange={setArea} />
              <FilterSelect label="Genre" value={genre} options={genres} onChange={setGenre} />
              <Chip pressed={freeOnly} onClick={() => setFreeOnly((value) => !value)}>Free</Chip>
            </div>

            <p className="sr-only" aria-live="polite">{visible.length} {visible.length === 1 ? "event" : "events"}</p>

            <div className="relative mt-6">
              {groups.length > 0 && <div className="timeline-line" aria-hidden="true" />}
              {groups.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-base text-[var(--text-secondary)]">No nights match these filters.</p>
                  {filtersActive && (
                    <button type="button" className="mt-4 text-sm font-medium text-[var(--accent)]" onClick={clearFilters}>
                      Clear filters
                    </button>
                  )}
                </div>
              ) : groups.map((group) => (
                <section key={group.key} className="relative mb-6">
                  <div className="flex h-6 items-center gap-3">
                    <span className="relative z-[1] size-2 shrink-0 rounded-full bg-[var(--dot)]" aria-hidden="true" />
                    <p className="text-base leading-6">
                      <span className="font-medium text-[var(--text)]">{group.date}</span>{" "}
                      <span className="font-normal text-[var(--text-muted)]">{group.weekday}</span>
                    </p>
                  </div>
                  <div className="mt-3 ml-5 flex flex-col gap-3">
                    {group.events.map((event) => (
                      <EventCard key={event.id} event={event} pressed={event.id === selectedId} onOpen={() => openEvent(event.id)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <footer className="mt-10 border-t border-[var(--border)] pt-6 text-xs leading-5 text-[var(--text-muted)]">
              <p>Times in MYT. Event Page opens the original listing.</p>
              <p className="mt-1">Updated {updatedFmt.format(new Date(lastUpdated))}.</p>
              <p className="mt-1">
                Night photograph by <a className="underline decoration-[var(--border)] underline-offset-2" href="https://unsplash.com/@esmonde">Esmonde Yong</a> on <a className="underline decoration-[var(--border)] underline-offset-2" href="https://unsplash.com/photos/high-rise-building-during-night-time--9B08uduMyY">Unsplash</a>.
              </p>
            </footer>
          </div>
        </div>
      </main>

      {selected && (
        <EventSheet
          event={selected}
          titleId={titleId}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex >= 0 && selectedIndex < navList.length - 1}
          onPrev={() => selectedIndex > 0 && stepEvent(navList[selectedIndex - 1].id)}
          onNext={() => selectedIndex >= 0 && selectedIndex < navList.length - 1 && stepEvent(navList[selectedIndex + 1].id)}
          onClose={closeEvent}
        />
      )}
    </>
  );
}

function EventCard({ event, pressed, onOpen }: { event: NightEvent; pressed: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-expanded={pressed}
      className="flex w-full gap-3 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-3 text-left transition-colors duration-200 hover:bg-[var(--pill-hover)]"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-5 font-medium text-[var(--text)] tabular-nums">{event.startAt ? clockFmt.format(new Date(event.startAt)) : ""}</p>
        <h3 className="mt-1 line-clamp-2 text-lg leading-[1.2] font-medium text-[var(--text)]">{event.title}</h3>
        <p className="mt-2 truncate text-sm leading-5 text-[var(--text-secondary)]">{priceLabel(event.price)}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm leading-5 text-[var(--text-secondary)]">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{event.venue}</span>
        </p>
      </div>
      <Cover event={event} className="size-[90px] rounded-2xl md:size-[120px]" />
    </button>
  );
}

function EventSheet({
  event,
  titleId,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
}: {
  event: NightEvent;
  titleId: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copied = copiedId === event.id;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    const focusable = () => {
      if (!panel) return [];
      return [...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, select, textarea")];
    };
    function onKey(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Escape") {
        keyEvent.preventDefault();
        onCloseRef.current();
        return;
      }
      if (keyEvent.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (keyEvent.shiftKey && document.activeElement === first) {
        keyEvent.preventDefault();
        last.focus();
      } else if (!keyEvent.shiftKey && document.activeElement === last) {
        keyEvent.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${event.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(event.id);
    } catch {
      const input = document.createElement("textarea");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      setCopiedId(event.id);
    }
  }

  const when = event.startAt ? new Date(event.startAt) : null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" tabIndex={-1} className="absolute inset-0 bg-[var(--backdrop)]" aria-label="Dismiss event details" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="sheet-panel absolute inset-x-0 top-8 bottom-0 flex flex-col overflow-hidden rounded-t-[32px] bg-[var(--sheet)] md:inset-y-2 md:right-2 md:left-auto md:w-[550px] md:rounded-2xl"
      >
        <div className="flex shrink-0 items-center gap-1.5 px-3 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <IconButton label="Previous event" disabled={!hasPrev} onClick={onPrev}><ChevronUp className="size-4" /></IconButton>
            <IconButton label="Next event" disabled={!hasNext} onClick={onNext}><ChevronDown className="size-4" /></IconButton>
            <button type="button" className="pill" onClick={copyLink}>
              <Link2 className="size-3.5" aria-hidden="true" />
              {copied ? "Copied" : "Copy Link"}
            </button>
            <a className="pill" href={event.url} target="_blank" rel="noreferrer">
              Event Page
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>
          <IconButton label="Close" onClick={onClose}><X className="size-4" /></IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-8">
          <Cover event={event} className="mx-auto aspect-square w-full max-w-[280px] rounded-xl md:max-w-[360px]" />
          <h2 id={titleId} className="mt-5 text-[28px] leading-[1.15] font-medium tracking-[-0.02em] text-[var(--text)]">{event.title}</h2>
          <p className="mt-1 text-base text-[var(--text-secondary)]">{event.source}</p>

          {when && (
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] leading-none">
                <span className="text-[10px] font-medium tracking-[0.04em] text-[var(--text-muted)] uppercase">{monthFmt.format(when)}</span>
                <span className="text-lg leading-5 font-medium text-[var(--text)]">{dayFmt.format(when)}</span>
              </div>
              <div>
                <p className="font-medium text-[var(--text)]">{longDateFmt.format(when)}</p>
                <p className="text-sm text-[var(--text-secondary)] tabular-nums">{timeRange(event)}</p>
              </div>
            </div>
          )}

          <a href={mapUrl(event)} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-3 rounded-xl">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)]">
              <MapPin className="size-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-medium text-[var(--text)]">{event.venue}</span>
              <span className="block text-sm text-[var(--text-secondary)]">{event.area}, {event.region}</span>
            </span>
          </a>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-sm text-[var(--text-muted)]">Price</p>
            <p className="mt-1 text-xl font-medium text-[var(--text)]">{priceLabel(event.price)}</p>
            <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">Listed on {event.source}. Tickets and the full details stay on the original page.</p>
            <a href={event.url} target="_blank" rel="noreferrer" className="listing-link mt-4 flex h-[38px] items-center justify-center rounded-2xl text-base font-medium transition-opacity duration-200 hover:opacity-90">
              Event Page
            </a>
          </div>

          {event.description && (
            <div className="mt-6">
              <h3 className="text-base font-medium text-[var(--text)]">About</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{event.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Cover({ event, className }: { event: NightEvent; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!event.image || failed) {
    return <div className={cn("grid shrink-0 place-items-center bg-[var(--pill)] text-sm font-medium text-[var(--text-muted)]", className)} aria-hidden="true">{event.venue.slice(0, 1)}</div>;
  }
  return (
    // Event artwork is published by the listing source and is not part of this app's bundle.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={event.image} alt="" className={cn("shrink-0 bg-[var(--pill)] object-cover", className)} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="pill size-[30px] px-0 disabled:opacity-40" aria-label={label} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string | null; options: string[]; onChange: (value: string | null) => void }) {
  return (
    <label className={cn("pill relative pr-2", value && "is-on")}>
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="h-[30px] cursor-pointer appearance-none bg-transparent pr-4 text-sm font-medium text-inherit outline-none"
      >
        <option value="">{label}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2" aria-hidden="true" />
    </label>
  );
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className="pill">
      {children}
    </button>
  );
}
