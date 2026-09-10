// Single source of truth for "what application/opportunity deadlines matter
// right now". Used by the Applications calendar, the Overview "Upcoming
// deadlines" widget, and the header reminder banner/badge — so all three
// read the same real data instead of drifting into separate mock states.

export type DeadlineSourceItem = {
  id?: number | string;
  title: string;
  org: string;
  type?: string;
  status: string;
  /** Formatted display string, e.g. "20/09/2026", "Rolling", "No deadline". */
  deadline?: string | null;
  /** Real Date (or ISO/locale string) when available — always preferred over `deadline`. */
  deadlineDate?: Date | string | null;
};

export type UpcomingDeadline = {
  id: string;
  title: string;
  org: string;
  type?: string;
  status: string;
  date: Date;
  daysRemaining: number;
  urgent: boolean;
};

export const DEADLINE_REMINDER_DAYS = 7;
export const DEADLINE_URGENT_HOURS = 48;

// A dismissed reminder banner comes back on the next reminder "slot" rather
// than staying hidden indefinitely. Slots repeat every REMINDER_INTERVAL_HOURS
// hours, anchored so one always lands at REMINDER_ANCHOR_HOUR (8am) — the
// first nudge of a normal day — giving three checkpoints: 00:00, 08:00, 16:00.
export const REMINDER_ANCHOR_HOUR = 8;
export const REMINDER_INTERVAL_HOURS = 8;

// Statuses where a deadline still needs the user's attention. Resolved
// outcomes (accepted / declined / withdrawn) don't need a follow-through nudge.
const ACTIONABLE_STATUSES = new Set(["Not started", "Applied", "Interview", "Waiting"]);

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Accepts a real Date, an ISO/locale date string, or null/undefined.
 * Returns a valid Date or null — never throws, never returns an Invalid Date
 * (so placeholder strings like "Rolling" or "No deadline" are safely dropped).
 */
export function parseDeadlineDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The date PathFinder actually has for an item: prefer the real Date, fall back to the display string. */
export function resolveDeadlineDate(item: DeadlineSourceItem): Date | null {
  return parseDeadlineDate(item.deadlineDate ?? item.deadline ?? null);
}

/** Whole-day difference so "in 3 days" reads naturally regardless of time-of-day. */
export function getDaysRemaining(date: Date, now: Date = new Date()): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / msPerDay);
}

export function isUrgent(date: Date, now: Date = new Date()): boolean {
  const hours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hours >= 0 && hours <= DEADLINE_URGENT_HOURS;
}

/**
 * Deadlines worth surfacing as a reminder: an actionable application, due
 * within `days` from now (never overdue, never further out). Sorted soonest first.
 */
export function getUpcomingDeadlines(
  items: DeadlineSourceItem[],
  days: number = DEADLINE_REMINDER_DAYS,
  now: Date = new Date(),
): UpcomingDeadline[] {
  return items
    .filter(item => ACTIONABLE_STATUSES.has(item.status))
    .map((item): UpcomingDeadline | null => {
      const date = resolveDeadlineDate(item);
      if (!date) return null;
      const daysRemaining = getDaysRemaining(date, now);
      if (daysRemaining < 0 || daysRemaining > days) return null;
      return {
        id: String(item.id ?? `${item.title}-${item.org}`),
        title: item.title,
        org: item.org,
        type: item.type,
        status: item.status,
        date,
        daysRemaining,
        urgent: isUrgent(date, now),
      };
    })
    .filter((x): x is UpcomingDeadline => x !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * The reminder "slot" a moment in time falls into — a stable key that only
 * changes at 00:00 / 08:00 / 16:00 local time. Compare two moments' slot keys
 * to tell whether a dismissed-at-time reminder is due to resurface yet.
 */
export function getReminderSlotKey(
  date: Date = new Date(),
  anchorHour: number = REMINDER_ANCHOR_HOUR,
  intervalHours: number = REMINDER_INTERVAL_HOURS,
): string {
  const msPerHour = 1000 * 60 * 60;
  const intervalMs = intervalHours * msPerHour;
  const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const elapsedSinceAnchor = date.getTime() - (localMidnight + anchorHour * msPerHour);
  const slotsElapsed = Math.floor(elapsedSinceAnchor / intervalMs);
  return new Date(localMidnight + anchorHour * msPerHour + slotsElapsed * intervalMs).toISOString();
}

export type DeadlineMarkerTone = "green" | "coral" | "blue" | "grey";

/**
 * Calendar marker colour for one application's deadline, following the
 * PathFinder palette: green for an accepted outcome, coral only while the
 * deadline is still approaching and nothing has been done about it yet,
 * grey for closed-out applications, blue for everything else in progress.
 */
export function deadlineMarkerTone(status: string, date: Date, now: Date = new Date()): DeadlineMarkerTone {
  if (status === "Accepted") return "green";
  if (status === "Not this time" || status === "Withdrawn") return "grey";
  const daysRemaining = getDaysRemaining(date, now);
  if ((status === "Not started" || status === "Applied") && daysRemaining <= DEADLINE_REMINDER_DAYS) return "coral";
  return "blue";
}
