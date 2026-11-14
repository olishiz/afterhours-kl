type Amplitude = typeof import("@amplitude/analytics-browser");

export type FilterName = "tonight" | "weekend" | "free" | "area" | "genre";

export interface AnalyticsEvents {
  "Landing Viewed": Record<string, never>;
  "Event List Viewed": { count: number; active_filters: Array<FilterName | "search">; active_filter_count: number };
  "Filter Applied": { filter: FilterName | "reset"; value: string | boolean | null };
  "Search Used": { query_length: number };
  "Event Detail Opened": {
    event_id: string;
    title: string;
    source: string;
    area: string;
    genre: string;
    is_free: boolean;
    kind: "event" | "venue";
    position: number | null;
  };
  "Outbound Ticket Clicked": { event_id: string; source: string; destination_host: string | null; link: "event_page" | "ticket"; kind: "event" | "venue" };
  "Theme Toggled": { theme: "light" | "dark" };
}

const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
let client: Promise<Amplitude | null> | null = null;

export function initAnalytics() {
  if (!apiKey || typeof window === "undefined" || client) return;
  // Imported lazily so builds without a key never download the SDK.
  client = import("@amplitude/analytics-browser")
    .then((amplitude) => {
      amplitude.init(apiKey, {
        serverZone: "US",
        // Local settings are the source of truth, so element capture cannot be switched on remotely.
        remoteConfig: { fetchRemoteConfig: false },
        trackingOptions: { ipAddress: false },
        autocapture: {
          pageViews: { trackHistoryChanges: "pathOnly" },
          sessions: true,
          attribution: true,
          formInteractions: false,
          fileDownloads: false,
          elementInteractions: false,
          frustrationInteractions: false,
          networkTracking: false,
          webVitals: false,
          pageUrlEnrichment: false,
        },
      });
      return amplitude;
    })
    .catch(() => null);
  track("Landing Viewed", {});
}

export function track<Name extends keyof AnalyticsEvents>(name: Name, props: AnalyticsEvents[Name]) {
  if (!client) return;
  client.then((amplitude) => amplitude?.track(name, props)).catch(() => undefined);
}

export function urlHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
