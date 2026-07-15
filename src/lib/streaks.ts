import type { DailyRecord, ExerciseStatus, NutritionStatus } from "./types";
import { subDaysFromDateString } from "./dates";
import { isExerciseSatisfied, isNutritionSatisfied } from "./rules";

function streakFromToday(
  recordsByDate: Map<string, DailyRecord>,
  today: string,
  predicate: (record: DailyRecord | undefined) => boolean,
): number {
  let streak = 0;
  let cursor = today;
  // If today is not yet satisfied, start counting from yesterday
  const todayRecord = recordsByDate.get(today);
  if (!predicate(todayRecord)) {
    cursor = subDaysFromDateString(today, 1);
  }

  while (true) {
    const record = recordsByDate.get(cursor);
    if (!predicate(record)) break;
    streak += 1;
    cursor = subDaysFromDateString(cursor, 1);
  }
  return streak;
}

export function exerciseStreak(
  records: DailyRecord[],
  today: string,
): number {
  const map = new Map(records.map((r) => [r.date, r]));
  return streakFromToday(map, today, (r) =>
    r ? isExerciseSatisfied(r.exercise_status as ExerciseStatus) : false,
  );
}

export function nutritionStreak(
  records: DailyRecord[],
  today: string,
): number {
  const map = new Map(records.map((r) => [r.date, r]));
  return streakFromToday(map, today, (r) =>
    r ? isNutritionSatisfied(r.nutrition_status as NutritionStatus) : false,
  );
}

export function perfectDayStreak(
  records: DailyRecord[],
  today: string,
): number {
  const map = new Map(records.map((r) => [r.date, r]));
  return streakFromToday(
    map,
    today,
    (r) =>
      !!r &&
      isExerciseSatisfied(r.exercise_status) &&
      isNutritionSatisfied(r.nutrition_status),
  );
}
