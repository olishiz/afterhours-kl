"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Check, ChevronDown, ChevronsLeft, ChevronUp, Link2, MapPin } from "lucide-react";
import { track, urlHost } from "@/lib/analytics";
import type { NightEvent } from "@/lib/events";
import { cn } from "@/lib/utils";

const timeZone = "Asia/Kuala_Lumpur";
const dateFormat = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long", day: "numeric", month: "long" });
const monthFormat = new Intl.DateTimeFormat("en-GB", { timeZone, month: "short" });
const dayFormat = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric" });
const clockFormat = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const checkedFormat = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "long", year: "numeric" });

interface DetailSheetProps {
  event: NightEvent;
  titleId: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  socialLinks?: Array<{ label: string; url: string }>;
}

export function DetailSheet({ event, titleId, hasPrev, hasNext, onPrev, onNext, onClose, socialLinks = [] }: DetailSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [copyResult, setCopyResult] = useState<{ id: string; status: "copied" | "failed"; url: string } | null>(null);
  const result = copyResult?.id === event.id ? copyResult : null;
  const isEvent = event.kind === "event";
  const start = isEvent && event.startAt ? new Date(event.startAt) : null;
  const end = isEvent && event.endAt ? new Date(event.endAt) : null;
  const checked = new Date(event.verifiedAt);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.venue, event.area, event.region, "Malaysia"].join(", "))}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.documentElement.style.overflow;
    const previousGutter = document.documentElement.style.scrollbarGutter;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.scrollbarGutter = "stable";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    // showModal provides native focus containment and makes the page behind it inert.
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      document.documentElement.style.overflow = previousOverflow;
      document.documentElement.style.scrollbarGutter = previousGutter;
      document.body.style.overflow = previousBodyOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [event.id]);

  async function copyLink() {
    const url = window.location.href;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setCopyResult({ id: event.id, status: "copied", url });
      return;
    } catch {
      const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const input = document.createElement("textarea");
      input.value = url;
      input.readOnly = true;
      input.className = "fixed -left-[9999px] top-0";
      // Keep the fallback inside the modal so it is not part of the inert page.
      (dialogRef.current ?? document.body).appendChild(input);
      let copied = false;
      try {
        input.select();
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      } finally {
        input.remove();
        previousFocus?.focus({ preventScroll: true });
      }
      setCopyResult({ id: event.id, status: copied ? "copied" : "failed", url });
      if (!copied && contentRef.current) contentRef.current.scrollTop = 0;
    }
  }

  function trackOutbound(link: "event_page" | "ticket") {
    track("Outbound Ticket Clicked", { event_id: event.id, source: event.source, destination_host: urlHost(event.url), link, kind: event.kind });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(cancelEvent) => {
        cancelEvent.preventDefault();
        onClose();
      }}
      onClick={(clickEvent) => {
        if (clickEvent.target !== clickEvent.currentTarget) return;
        const bounds = clickEvent.currentTarget.getBoundingClientRect();
        if (clickEvent.clientX < bounds.left || clickEvent.clientX > bounds.right || clickEvent.clientY < bounds.top || clickEvent.clientY > bounds.bottom) onClose();
      }}
      className="sheet-panel fixed inset-2 m-0 h-[calc(100dvh-1rem)] max-h-none w-[calc(100%-1rem)] max-w-none flex-col overflow-hidden rounded-2xl border-0 bg-[var(--sheet)] p-0 text-[var(--text)] open:flex backdrop:bg-[var(--backdrop)] backdrop:backdrop-blur-[2px] md:left-auto md:w-[550px]"
    >
      <div className="flex shrink-0 items-center gap-1.5 px-3 py-2">
        <SheetButton label="Close details" onClick={onClose}><ChevronsLeft className="size-4" /></SheetButton>
        <button type="button" className="pill" aria-label={result?.status === "copied" ? "Link copied" : "Copy link"} onClick={copyLink}>
          {result?.status === "copied" ? <Check className="size-3.5" aria-hidden="true" /> : <Link2 className="size-3.5" aria-hidden="true" />}
          <span className="hidden min-[380px]:inline">{result?.status === "copied" ? "Copied" : "Copy Link"}</span>
        </button>
        <a className="pill" href={event.url} target="_blank" rel="noreferrer" onClick={() => trackOutbound("event_page")} aria-label={isEvent ? "Open original event page" : "Open official venue page"}>
          <span>{isEvent ? "Event Page" : "Venue Page"}</span>
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
        <div className="ml-auto flex gap-1.5">
          <SheetButton label={isEvent ? "Previous event" : "Previous place"} disabled={!hasPrev} onClick={onPrev}><ChevronUp className="size-4" /></SheetButton>
          <SheetButton label={isEvent ? "Next event" : "Next place"} disabled={!hasNext} onClick={onNext}><ChevronDown className="size-4" /></SheetButton>
        </div>
      </div>

      <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-8 md:px-6">
        {result?.status === "failed" && (
          <div className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--pill)] p-3">
            <p role="status" className="text-sm text-[var(--text-secondary)]">Couldn’t copy automatically. Select and copy this link.</p>
            <input aria-label="Shareable link" readOnly value={result.url} onFocus={(focusEvent) => focusEvent.target.select()} className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--sheet)] px-2 py-1.5 text-sm" />
          </div>
        )}
        <ListingCover image={event.image} name={event.title} className="mx-auto aspect-square w-full max-w-[280px] rounded-xl shadow-[0_3px_14px_rgba(0,0,0,0.12)]" />
        <h2 id={titleId} className="mt-6 text-[28px] leading-[1.15] font-semibold tracking-[-0.025em] md:text-[32px]">{event.title}</h2>
        <p className="mt-2 text-sm leading-5 text-[var(--text-muted)]">{isEvent ? `Listed on ${event.source}` : event.category}</p>

        <div className={cn("mt-6 grid gap-5", start && "sm:grid-cols-2")}>
          {start && Number.isFinite(start.getTime()) && (
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
                <span className="text-[10px] leading-3 font-medium text-[var(--text-muted)] uppercase">{monthFormat.format(start)}</span>
                <span className="text-lg leading-5 font-medium">{dayFormat.format(start)}</span>
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm leading-5 font-medium">{dateFormat.format(start)}</p>
                <p className="mt-0.5 text-sm leading-5 text-[var(--text-secondary)] tabular-nums">
                  {clockFormat.format(start)}{end && Number.isFinite(end.getTime()) ? ` – ${clockFormat.format(end)}` : ""} GMT+8
                </p>
              </div>
            </div>
          )}
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="group flex items-start gap-3 rounded-lg">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)]"><MapPin className="size-5" aria-hidden="true" /></span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-sm leading-5 font-medium group-hover:underline">{event.venue}</span>
              <span className="mt-0.5 block text-sm leading-5 text-[var(--text-secondary)]">{event.area}, {event.region}</span>
            </span>
          </a>
        </div>

        <div className="mt-6 rounded-2xl bg-[var(--pill)] p-4">
          <p className="text-sm font-medium">{isEvent ? "Tickets & admission" : "Plan your night"}</p>
          {isEvent && event.price && <p className="mt-1 text-xl leading-7 font-semibold">{event.price}</p>}
          <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">{isEvent ? "Get tickets and the latest details from the original listing." : "Explore the venue’s latest programme, reservations and entry details."}</p>
          <a href={event.url} target="_blank" rel="noreferrer" onClick={() => trackOutbound("ticket")} className="listing-link mt-4 flex min-h-[38px] items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-85">
            {isEvent ? "View event" : "Visit venue"}<ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
          {socialLinks.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{socialLinks.map((link) => <a key={link.url} className="pill" href={link.url} target="_blank" rel="noreferrer">{link.label}<ArrowUpRight className="size-3.5" aria-hidden="true" /></a>)}</div>}
        </div>

        {event.description && <section className="mt-7"><h3 className="border-b border-[var(--border)] pb-2 text-base font-medium">About {isEvent ? "the event" : "the place"}</h3><p className="mt-3 text-sm leading-6 whitespace-pre-line text-[var(--text-secondary)]">{event.description}</p></section>}
        {event.genres.length > 0 && <div className="mt-5 flex flex-wrap gap-1.5">{event.genres.map((genre) => <span key={genre} className="rounded-full bg-[var(--pill)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">{genre}</span>)}</div>}
        <p className="mt-7 text-xs leading-5 text-[var(--text-muted)]">Source: <a className="underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--text)]" href={event.url} target="_blank" rel="noreferrer">{event.source}</a>{Number.isFinite(checked.getTime()) ? ` · Checked ${checkedFormat.format(checked)}` : ""}</p>
        <span className="sr-only" role="status">{result?.status === "copied" ? "Link copied to clipboard." : ""}</span>
      </div>
    </dialog>
  );
}

export function ListingCover({ image, name, className }: { image: string | null; name: string; className: string }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  if (!image || failedImage === image) {
    const initials = name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("");
    return <div className={cn("grid shrink-0 place-items-center bg-[var(--pill)] text-3xl font-medium text-[var(--text-muted)]", className)} aria-hidden="true">{initials}</div>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" draggable={false} className={cn("shrink-0 bg-[var(--pill)] object-cover", className)} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedImage(image)} />
  );
}

function SheetButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" className="pill size-[30px] px-0 disabled:cursor-default disabled:opacity-30" aria-label={label} disabled={disabled} onClick={onClick}>{children}</button>;
}
