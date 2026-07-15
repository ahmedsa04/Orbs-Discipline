import { describe, expect, it } from "vitest";
import { canDeclareRest, finalizeDayStatuses, shouldFinalize } from "@/lib/rules";
import {
  evaluateReminders,
  weekNeedsWeightCheckIn,
  outstandingBadgeCount,
  weightCycleDates,
} from "@/lib/reminders";
import { exerciseStreak, nutritionStreak, perfectDayStreak } from "@/lib/streaks";
import { addDaysToDateString, timeReached, todayInTimezone } from "@/lib/dates";
import type { DailyRecord, ReminderPreference } from "@/lib/types";

describe("rest day rules", () => {
  it("blocks rest when previous day is rest", () => {
    expect(canDeclareRest({ previous: "rest" }).ok).toBe(false);
  });
  it("blocks rest when next day is rest", () => {
    expect(canDeclareRest({ next: "rest" }).ok).toBe(false);
  });
  it("allows rest when neighbors are clear", () => {
    expect(canDeclareRest({ previous: "completed", next: "pending" }).ok).toBe(true);
  });
});

describe("failure finalization", () => {
  it("turns pending into failure", () => {
    expect(
      finalizeDayStatuses({
        exercise_status: "pending",
        nutrition_status: "healthy",
      }),
    ).toEqual({
      exercise_status: "failure",
      nutrition_status: "healthy",
    });
  });
  it("keeps completed and rest", () => {
    expect(
      finalizeDayStatuses({
        exercise_status: "rest",
        nutrition_status: "pending",
      }),
    ).toEqual({
      exercise_status: "rest",
      nutrition_status: "failure",
    });
  });
  it("shouldFinalize only for past unfinalized days", () => {
    expect(shouldFinalize("2026-07-14", "2026-07-15", null)).toBe(true);
    expect(shouldFinalize("2026-07-15", "2026-07-15", null)).toBe(false);
    expect(shouldFinalize("2026-07-14", "2026-07-15", "2026-07-15T00:00:00Z")).toBe(
      false,
    );
  });
});

describe("dates", () => {
  it("computes today in timezone", () => {
    const d = todayInTimezone("UTC", new Date("2026-07-15T23:30:00Z"));
    expect(d).toBe("2026-07-15");
  });
  it("adds days to date strings", () => {
    expect(addDaysToDateString("2026-07-15", 1)).toBe("2026-07-16");
  });
  it("compares times", () => {
    expect(timeReached("14:00", "14:00")).toBe(true);
    expect(timeReached("13:59", "14:00")).toBe(false);
  });
});

describe("reminders", () => {
  const prefs: ReminderPreference[] = [
    {
      id: "e1",
      user_id: "u",
      kind: "exercise",
      time_local: "09:00",
      enabled: true,
      sort_order: 1,
    },
    {
      id: "n1",
      user_id: "u",
      kind: "nutrition",
      time_local: "12:00",
      enabled: true,
      sort_order: 2,
    },
    {
      id: "w1",
      user_id: "u",
      kind: "weight",
      time_local: "08:00",
      enabled: true,
      sort_order: 3,
    },
  ];

  it("skips exercise reminders when completed or rest", () => {
    const out = evaluateReminders({
      preferences: prefs,
      currentTime: "10:00",
      todayRecord: {
        id: "1",
        user_id: "u",
        date: "2026-07-15",
        exercise_status: "rest",
        nutrition_status: "pending",
        notes: null,
        finalized_at: null,
        created_at: "",
        updated_at: "",
      },
      weightDue: false,
      alreadySentKeys: new Set(),
      dateKey: "2026-07-15",
    });
    expect(out.some((c) => c.kind === "exercise")).toBe(false);
  });

  it("dedupes already sent reminders", () => {
    const out = evaluateReminders({
      preferences: prefs,
      currentTime: "15:00",
      todayRecord: null,
      weightDue: false,
      alreadySentKeys: new Set(["2026-07-15:e1:exercise"]),
      dateKey: "2026-07-15",
    });
    expect(out.some((c) => c.preferenceId === "e1")).toBe(false);
  });

  it("detects weight due after weigh-in time", () => {
    expect(
      weekNeedsWeightCheckIn([], "2026-07-15", 1, "09:00", "08:00"),
    ).toBe(true);
    expect(
      weekNeedsWeightCheckIn(
        [{ date: "2026-07-14" }],
        "2026-07-15",
        1,
        "09:00",
        "08:00",
      ),
    ).toBe(false);
  });

  it("builds weight cycle dates", () => {
    // 2026-07-15 is Wednesday (3). weigh-in Monday (1) => Mon Tue Wed
    expect(weightCycleDates("2026-07-15", 1)).toEqual([
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
    ]);
  });

  it("counts outstanding badge items", () => {
    expect(
      outstandingBadgeCount({
        exercise: "pending",
        nutrition: "healthy",
        weightDue: true,
      }),
    ).toBe(2);
  });
});

describe("streaks", () => {
  function rec(
    date: string,
    exercise_status: DailyRecord["exercise_status"],
    nutrition_status: DailyRecord["nutrition_status"],
  ): DailyRecord {
    return {
      id: date,
      user_id: "u",
      date,
      exercise_status,
      nutrition_status,
      notes: null,
      finalized_at: null,
      created_at: "",
      updated_at: "",
    };
  }

  it("counts exercise streak including today", () => {
    const records = [
      rec("2026-07-15", "completed", "healthy"),
      rec("2026-07-14", "rest", "healthy"),
      rec("2026-07-13", "completed", "failure"),
      rec("2026-07-12", "pending", "healthy"),
    ];
    expect(exerciseStreak(records, "2026-07-15")).toBe(3);
    expect(nutritionStreak(records, "2026-07-15")).toBe(2);
    expect(perfectDayStreak(records, "2026-07-15")).toBe(2);
  });
});
