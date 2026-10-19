"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { events, isUpcoming, lastUpdated, type NightEvent } from "@/lib/events";
import { cn } from "@/lib/utils";

const timeZone = "Asia/Kuala_Lumpur";

function localDay(date: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
}

function clock(date: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(date));
}

function dateLabel(date: string, now: Date) {
  const day = localDay(date);
  const today = localDay(now);
  const tomorrow = localDay(new Date(Date.parse(`${today}T12:00:00+08:00`) + 86400000));
  if (day === today) return "Today";
  if (day === tomorrow) return "Tomorrow";
  return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(new Date(date));
}

function isFree(price: string | null) {
  return !!price && /^free\b/i.test(price);
}

function inWeekend(event: NightEvent, now: Date) {
  if (!event.startAt) return false;
  const today = new Date(`${localDay(now)}T00:00:00+08:00`);
  const weekday = new Date(today.getTime() + 8 * 3600000).getUTCDay();
  const daysToFriday = weekday === 0 ? -2 : weekday === 6 ? -1 : (5 - weekday + 7) % 7;
  const friday = today.getTime() + daysToFriday * 86400000;
  const start = Date.parse(event.startAt);
  return start >= friday && start < friday + 3 * 86400000;
}

function Cover({ event }: { event: NightEvent }) {
  const [failed, setFailed] = useState(false);
  if (!event.image || failed) {
    return <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-[#232323] text-sm font-medium text-[#959595] sm:size-20" aria-hidden="true">{event.venue.slice(0, 1)}</div>;
  }
  return (
    // Event artwork is published by the listing source and is not part of this app's bundle.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={event.image} alt="" className="size-16 shrink-0 rounded-lg bg-[#232323] object-cover sm:size-20" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  );
}

export function CityPage({ now }: { now: string }) {
  const [current, setCurrent] = useState(now);
  const [tonight, setTonight] = useState(false);
  const [weekend, setWeekend] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [area, setArea] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setCurrent(new Date().toISOString());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const moment = useMemo(() => new Date(current), [current]);
  const upcoming = useMemo(() => events.filter(event => isUpcoming(event, moment)).sort((a, b) => (a.startAt || "").localeCompare(b.startAt || "")), [moment]);
  const areas = useMemo(() => [...new Set(upcoming.map(event => event.area))].sort((a, b) => a.localeCompare(b)), [upcoming]);
  const genres = useMemo(() => {
    const values = new Set<string>();
    for (const event of upcoming) {
      values.add(event.category);
      for (const genreName of event.genres) values.add(genreName);
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

  const visible = upcoming.filter(event => {
    if (tonight && localDay(event.startAt || "") !== localDay(moment)) return false;
    if (weekend && !inWeekend(event, moment)) return false;
    if (freeOnly && !isFree(event.price)) return false;
    if (area && event.area !== area && event.region !== area) return false;
    if (genre && event.category !== genre && !event.genres.includes(genre)) return false;
    return true;
  });

  const groups = visible.reduce<Array<{ label: string; events: NightEvent[] }>>((list, event) => {
    const label = dateLabel(event.startAt || "", moment);
    const group = list.find(item => item.label === label);
    if (group) group.events.push(event);
    else list.push({ label, events: [event] });
    return list;
  }, []);

  const filtersActive = tonight || weekend || freeOnly || !!area || !!genre;
  const countLabel = `${visible.length} ${visible.length === 1 ? "event" : "events"}`;

  return (
    <>
      <a className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-[#d9eda0] focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-[#101010]" href="#events">Skip to events</a>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#101010]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[760px] items-center px-4 sm:px-6">
          <p className="text-[17px] font-medium tracking-[-0.04em] text-white">afterhours<span className="text-[#d9eda0]">.</span></p>
        </div>
      </header>
      <main className="mx-auto max-w-[760px] px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
        <p className="text-sm font-medium text-[#d4d4d4]">Kuala Lumpur and Selangor</p>
        <h1 className="mt-1 text-[2rem] leading-[1.15] font-medium tracking-[-0.03em] text-white sm:text-[3.25rem] sm:leading-[1.2]">Kuala Lumpur</h1>
        <p className="mt-3 max-w-xl text-base leading-6 text-[#959595] sm:text-lg sm:leading-7">Club nights, DJ sets, gigs and late nights across the city and Selangor.</p>
        <p className="mt-3 text-sm text-[#d4d4d4]">{countLabel}</p>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="toolbar" aria-label="Filter events">
          <Chip pressed={tonight} onClick={() => setTonight(value => !value)}>Tonight</Chip>
          <Chip pressed={weekend} onClick={() => setWeekend(value => !value)}>This weekend</Chip>
          <FilterSelect label="Area" value={area} options={areas} onChange={setArea} />
          <FilterSelect label="Genre" value={genre} options={genres} onChange={setGenre} />
          <Chip pressed={freeOnly} onClick={() => setFreeOnly(value => !value)}>Free</Chip>
        </div>

        <div id="events" className="mt-8">
          {groups.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-base text-[#d4d4d4]">No nights match these filters.</p>
              {filtersActive && <button className="mt-4 text-sm font-medium text-[#d9eda0]" onClick={() => { setTonight(false); setWeekend(false); setFreeOnly(false); setArea(null); setGenre(null); }}>Clear filters</button>}
            </div>
          ) : groups.map(group => (
            <section key={group.label} className="mb-8">
              <h2 className="sticky top-14 z-10 bg-[#101010]/95 py-2 text-sm font-medium text-white backdrop-blur-md">{group.label}</h2>
              <div>
                {group.events.map(event => (
                  <a key={event.id} href={event.url} target="_blank" rel="noreferrer" className="group flex items-start gap-3 border-b border-white/10 py-3 transition-colors duration-200 outline-none last:border-b-0 hover:bg-white/[0.04] focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-[#d9eda0] sm:gap-4 sm:px-2 sm:-mx-2">
                    <time className="w-[4.75rem] shrink-0 pt-0.5 text-[13px] leading-5 text-[#959595]" dateTime={event.startAt || undefined}>{event.startAt ? clock(event.startAt) : ""}</time>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base leading-snug font-medium text-white sm:text-lg">{event.title}</h3>
                      <p className="mt-0.5 truncate text-sm text-[#d4d4d4]">{event.venue} · {event.area}</p>
                      <p className="mt-1 text-[13px] leading-5 text-[#959595]">
                        <span className="text-[#d4d4d4]">{event.price || "See listing"}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-medium text-[#d9eda0] group-hover:underline">{event.source}</span>
                      </p>
                    </div>
                    <Cover event={event} />
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-10 border-t border-white/10 pt-6 text-xs leading-5 text-[#959595]">
          <p>Times in MYT. Each listing opens the original source.</p>
          <p className="mt-1">Updated {new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "long", year: "numeric" }).format(new Date(lastUpdated))}.</p>
        </footer>
      </main>
    </>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string | null; options: string[]; onChange: (value: string | null) => void }) {
  const selected = !!value;
  return (
    <label className={cn("relative h-[30px] shrink-0 rounded-full text-sm font-medium transition-colors duration-200", selected ? "bg-[#d9eda0] text-[#101010]" : "bg-white/[0.06] text-[#d4d4d4] hover:bg-white/10")}>
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value ?? ""}
        onChange={event => onChange(event.target.value || null)}
        className="h-[30px] cursor-pointer appearance-none rounded-full bg-transparent py-0 pr-7 pl-2.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#d9eda0]"
      >
        <option value="">{label}</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[10px]" aria-hidden="true">▾</span>
    </label>
  );
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "h-[30px] shrink-0 rounded-full px-2.5 text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#d9eda0]",
        pressed ? "bg-[#d9eda0] text-[#101010]" : "bg-white/[0.06] text-[#d4d4d4] hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}
