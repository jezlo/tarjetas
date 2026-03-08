/**
 * Formats a UTC ISO date string according to the given IANA timezone.
 *
 * The backend stores all datetimes in UTC and serialises them via Python's
 * `datetime.isoformat()`, which does NOT append a 'Z' or '+00:00' offset.
 * Without an explicit UTC marker some browsers interpret the value as local
 * time, producing wrong results when the display timezone differs from the
 * browser's locale.  This function normalises the input by appending 'Z'
 * when no timezone information is present, then formats the value using
 * `Intl.DateTimeFormat` for reliable cross-browser support.
 *
 * @param {string|null} iso      - UTC ISO timestamp (e.g. "2024-01-01T12:00:00")
 * @param {string}      timezone - IANA timezone name (e.g. "America/New_York")
 * @param {string}      [fallback='—'] - Returned when `iso` is falsy
 * @returns {string}
 */
export function formatDateWithTimezone(iso, timezone, fallback = '—') {
  if (!iso) return fallback;
  try {
    // Append 'Z' when the string has no timezone offset so it is treated as UTC
    const normalized = /Z|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(normalized));
  } catch {
    return new Date(iso).toLocaleString();
  }
}
