export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(
  value: string | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatDateTime(value: string | Date, locale: string): string {
  return formatDate(value, locale, { dateStyle: "medium", timeStyle: "short" });
}

export function formatNumber(
  value: number,
  locale: string,
  maximumFractionDigits = 0,
): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Safely read a JSONB array of strings (AI issues) without trusting its shape. */
export function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}
