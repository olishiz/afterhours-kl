/** Public asset prefix. Empty at `/` (Vercel); `/afterhours-kl` when Pages sets PAGES_BASE_PATH. */
export function asset(path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
