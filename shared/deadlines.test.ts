import { describe, expect, it } from "vitest";
import {
  DEADLINE_REMINDER_DAYS,
  deadlineMarkerTone,
  getDaysRemaining,
  getReminderSlotKey,
  getUpcomingDeadlines,
  isUrgent,
  parseDeadlineDate,
  resolveDeadlineDate,
} from "./deadlines";

const NOW = new Date(2026, 8, 10); // 10 Sep 2026, matches the fixed "today" this feature is tested against

describe("parseDeadlineDate", () => {
  it("returns null for missing or placeholder values", () => {
    expect(parseDeadlineDate(null)).toBeNull();
    expect(parseDeadlineDate(undefined)).toBeNull();
    expect(parseDeadlineDate("No deadline")).toBeNull();
    expect(parseDeadlineDate("Rolling")).toBeNull();
    expect(parseDeadlineDate("Check official site")).toBeNull();
  });

  it("parses a real Date through untouched", () => {
    const date = new Date(2026, 8, 20);
    expect(parseDeadlineDate(date)?.getTime()).toBe(date.getTime());
  });

  it("parses a parseable display string", () => {
    expect(parseDeadlineDate("20 Sep 2026")?.getDate()).toBe(20);
  });
});

describe("resolveDeadlineDate", () => {
  it("prefers the real deadlineDate over the display string", () => {
    const real = new Date(2026, 8, 20);
    const resolved = resolveDeadlineDate({ title: "A", org: "B", status: "Applied", deadline: "Rolling", deadlineDate: real });
    expect(resolved?.getTime()).toBe(real.getTime());
  });

  it("falls back to the display string when no real date is set", () => {
    const resolved = resolveDeadlineDate({ title: "A", org: "B", status: "Applied", deadline: "20 Sep 2026" });
    expect(resolved?.getDate()).toBe(20);
  });
});

describe("getDaysRemaining", () => {
  it("counts whole days regardless of time-of-day", () => {
    expect(getDaysRemaining(new Date(2026, 8, 20, 23, 59), NOW)).toBe(10);
    expect(getDaysRemaining(new Date(2026, 8, 10, 0, 1), NOW)).toBe(0);
    expect(getDaysRemaining(new Date(2026, 8, 5), NOW)).toBe(-5);
  });
});

describe("isUrgent", () => {
  it("is true within 48 hours and false beyond it", () => {
    expect(isUrgent(new Date(NOW.getTime() + 47 * 3600000), NOW)).toBe(true);
    expect(isUrgent(new Date(NOW.getTime() + 49 * 3600000), NOW)).toBe(false);
    expect(isUrgent(new Date(NOW.getTime() - 3600000), NOW)).toBe(false);
  });
});

describe("getUpcomingDeadlines", () => {
  const applications = [
    { id: 1, title: "CAPACITI WIL", org: "Capaciti", status: "Accepted", deadlineDate: new Date(2026, 8, 20) },
    { id: 2, title: "Digital Skills Internship", org: "YES", status: "Applied", deadlineDate: new Date(2026, 8, 12) },
    { id: 3, title: "BSc Computer Science", org: "UP", status: "Not started", deadlineDate: new Date(2026, 9, 30) },
    { id: 4, title: "Withdrawn thing", org: "X", status: "Withdrawn", deadlineDate: new Date(2026, 8, 11) },
    { id: 5, title: "Overdue thing", org: "Y", status: "Applied", deadlineDate: new Date(2026, 8, 1) },
    { id: 6, title: "No deadline thing", org: "Z", status: "Applied", deadline: "No deadline" },
  ];

  it("only surfaces actionable applications due within the reminder window, soonest first", () => {
    const result = getUpcomingDeadlines(applications, DEADLINE_REMINDER_DAYS, NOW);
    expect(result.map(r => r.title)).toEqual(["Digital Skills Internship"]);
    expect(result[0].daysRemaining).toBe(2);
  });

  it("excludes resolved statuses like Accepted and Withdrawn even inside the window", () => {
    const result = getUpcomingDeadlines(applications, DEADLINE_REMINDER_DAYS, NOW);
    expect(result.find(r => r.title === "CAPACITI WIL")).toBeUndefined();
    expect(result.find(r => r.title === "Withdrawn thing")).toBeUndefined();
  });

  it("excludes overdue deadlines and ones outside the window", () => {
    const result = getUpcomingDeadlines(applications, DEADLINE_REMINDER_DAYS, NOW);
    expect(result.find(r => r.title === "Overdue thing")).toBeUndefined();
    expect(result.find(r => r.title === "BSc Computer Science")).toBeUndefined();
  });
});

describe("getReminderSlotKey", () => {
  it("keeps the same key across one 8-hour slot", () => {
    const morning = getReminderSlotKey(new Date(2026, 8, 10, 8, 0));
    const stillMorning = getReminderSlotKey(new Date(2026, 8, 10, 15, 59));
    expect(morning).toBe(stillMorning);
  });

  it("changes key once the next slot begins, anchored at 8am/4pm/midnight", () => {
    const morning = getReminderSlotKey(new Date(2026, 8, 10, 8, 0));
    const afternoon = getReminderSlotKey(new Date(2026, 8, 10, 16, 0));
    const midnight = getReminderSlotKey(new Date(2026, 8, 11, 0, 0));
    const nextMorning = getReminderSlotKey(new Date(2026, 8, 11, 8, 0));
    expect(new Set([morning, afternoon, midnight, nextMorning]).size).toBe(4);
  });

  it("assigns the early-morning hours (before 8am) to the previous slot, not a new one", () => {
    const justBeforeAnchor = getReminderSlotKey(new Date(2026, 8, 10, 7, 59));
    const midnightSlot = getReminderSlotKey(new Date(2026, 8, 10, 0, 0));
    expect(justBeforeAnchor).toBe(midnightSlot);
  });

  it("the 8am slot key is exactly 8am local time", () => {
    const key = getReminderSlotKey(new Date(2026, 8, 10, 8, 30));
    expect(new Date(key).getHours()).toBe(8);
    expect(new Date(key).getMinutes()).toBe(0);
  });
});

describe("deadlineMarkerTone", () => {
  it("is green for an accepted application regardless of date", () => {
    expect(deadlineMarkerTone("Accepted", new Date(2026, 8, 20), NOW)).toBe("green");
  });

  it("is coral for an approaching deadline still Not started or Applied", () => {
    expect(deadlineMarkerTone("Not started", new Date(2026, 8, 12), NOW)).toBe("coral");
    expect(deadlineMarkerTone("Applied", new Date(2026, 8, 12), NOW)).toBe("coral");
  });

  it("is not coral once the deadline is far in the future", () => {
    expect(deadlineMarkerTone("Applied", new Date(2026, 10, 1), NOW)).toBe("blue");
  });

  it("is grey for closed-out applications", () => {
    expect(deadlineMarkerTone("Not this time", new Date(2026, 8, 12), NOW)).toBe("grey");
    expect(deadlineMarkerTone("Withdrawn", new Date(2026, 8, 12), NOW)).toBe("grey");
  });
});
