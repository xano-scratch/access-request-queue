// Small display helpers. Xano timestamps are epoch-milliseconds.

export function formatDateTime(epochms: number | null | undefined): string {
  if (epochms == null) return "—";
  const d = new Date(Number(epochms));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatRelative(epochms: number | null | undefined): string {
  if (epochms == null) return "—";
  const then = Number(epochms);
  if (Number.isNaN(then)) return "—";
  const diff = then - Date.now();
  const abs = Math.abs(diff);
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < hour) return rtf.format(Math.round(diff / min), "minute");
  if (abs < day) return rtf.format(Math.round(diff / hour), "hour");
  return rtf.format(Math.round(diff / day), "day");
}

export function titleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
