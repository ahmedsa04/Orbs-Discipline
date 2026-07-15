import type {
  DailyRecord,
  ExerciseStatus,
  NutritionStatus,
  ReminderPreference,
  WeightCheckIn,
} from "./types";
import { isExerciseSatisfied, isNutritionSatisfied } from "./rules";
import { timeReached } from "./dates";

export type ReminderCandidate = {
  kind: ReminderPreference["kind"];
  title: string;
  body: string;
  url: string;
  preferenceId: string;
};

export function weightCycleDates(
  today: string,
  weighInWeekday: number,
): string[] {
  const todayWeekday = new Date(today + "T12:00:00").getDay();
  const daysSince = (todayWeekday - weighInWeekday + 7) % 7;
  return Array.from({ length: daysSince + 1 }, (_, i) => {
    const d = new Date(today + "T12:00:00");
    d.setDate(d.getDate() - (daysSince - i));
    return d.toISOString().slice(0, 10);
  });
}

export function weekNeedsWeightCheckIn(
  checkIns: Pick<WeightCheckIn, "date">[],
  today: string,
  weighInWeekday: number,
  currentTime: string,
  weighInTime: string,
): boolean {
  const todayWeekday = new Date(today + "T12:00:00").getDay();
  const daysSince = (todayWeekday - weighInWeekday + 7) % 7;
  if (daysSince === 0 && !timeReached(currentTime, weighInTime)) {
    return false;
  }
  const cycleDates = weightCycleDates(today, weighInWeekday);
  return !checkIns.some((c) => cycleDates.includes(c.date));
}

export function evaluateReminders(input: {
  preferences: ReminderPreference[];
  currentTime: string;
  todayRecord: DailyRecord | null;
  weightDue: boolean;
  alreadySentKeys: Set<string>;
  dateKey: string;
}): ReminderCandidate[] {
  const {
    preferences,
    currentTime,
    todayRecord,
    weightDue,
    alreadySentKeys,
    dateKey,
  } = input;

  const exercise: ExerciseStatus = todayRecord?.exercise_status ?? "pending";
  const nutrition: NutritionStatus = todayRecord?.nutrition_status ?? "pending";
  const candidates: ReminderCandidate[] = [];

  for (const pref of preferences) {
    if (!pref.enabled) continue;
    if (!timeReached(currentTime, pref.time_local)) continue;

    const dedupeKey = `${dateKey}:${pref.id}:${pref.kind}`;
    if (alreadySentKeys.has(dedupeKey)) continue;

    if (pref.kind === "exercise") {
      if (isExerciseSatisfied(exercise)) continue;
      candidates.push({
        kind: "exercise",
        title: "Exercise reminder",
        body: "You haven't exercised today. Move your body — or declare a rest if needed.",
        url: "/today?focus=exercise",
        preferenceId: pref.id,
      });
    } else if (pref.kind === "nutrition") {
      if (isNutritionSatisfied(nutrition)) continue;
      candidates.push({
        kind: "nutrition",
        title: "Eat healthy reminder",
        body: "Mark healthy eating for today when you've eaten well.",
        url: "/today?focus=nutrition",
        preferenceId: pref.id,
      });
    } else if (pref.kind === "end_of_day") {
      const exerciseOpen = !isExerciseSatisfied(exercise);
      const nutritionOpen = !isNutritionSatisfied(nutrition);
      if (!exerciseOpen && !nutritionOpen) continue;
      const parts = [
        exerciseOpen ? "exercise" : null,
        nutritionOpen ? "healthy eating" : null,
      ].filter(Boolean);
      candidates.push({
        kind: "end_of_day",
        title: "Day not complete",
        body: `Still open: ${parts.join(" & ")}. Unresolved days become failures.`,
        url: "/today",
        preferenceId: pref.id,
      });
    } else if (pref.kind === "weight") {
      if (!weightDue) continue;
      candidates.push({
        kind: "weight",
        title: "Weekly weight check-in",
        body: "Log your weight for this week.",
        url: "/weight",
        preferenceId: pref.id,
      });
    }
  }

  return candidates;
}

export function defaultReminderPreferences(userId: string): Omit<
  ReminderPreference,
  "id"
>[] {
  return [
    {
      user_id: userId,
      kind: "exercise",
      time_local: "09:00",
      enabled: true,
      sort_order: 1,
    },
    {
      user_id: userId,
      kind: "exercise",
      time_local: "14:00",
      enabled: true,
      sort_order: 2,
    },
    {
      user_id: userId,
      kind: "exercise",
      time_local: "18:00",
      enabled: true,
      sort_order: 3,
    },
    {
      user_id: userId,
      kind: "nutrition",
      time_local: "12:30",
      enabled: true,
      sort_order: 4,
    },
    {
      user_id: userId,
      kind: "nutrition",
      time_local: "20:00",
      enabled: true,
      sort_order: 5,
    },
    {
      user_id: userId,
      kind: "end_of_day",
      time_local: "21:30",
      enabled: true,
      sort_order: 6,
    },
    {
      user_id: userId,
      kind: "weight",
      time_local: "08:00",
      enabled: true,
      sort_order: 7,
    },
  ];
}

export function outstandingBadgeCount(input: {
  exercise: ExerciseStatus;
  nutrition: NutritionStatus;
  weightDue: boolean;
}): number {
  let n = 0;
  if (!isExerciseSatisfied(input.exercise)) n += 1;
  if (!isNutritionSatisfied(input.nutrition)) n += 1;
  if (input.weightDue) n += 1;
  return n;
}
