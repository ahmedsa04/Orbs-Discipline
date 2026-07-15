import type { ExerciseStatus, NutritionStatus } from "./types";
import { addDaysToDateString, subDaysFromDateString } from "./dates";

export function canDeclareRest(
  neighborStatuses: { previous?: ExerciseStatus | null; next?: ExerciseStatus | null },
): { ok: boolean; reason?: string } {
  if (neighborStatuses.previous === "rest") {
    return { ok: false, reason: "Cannot rest two days in a row (previous day is rest)." };
  }
  if (neighborStatuses.next === "rest") {
    return { ok: false, reason: "Cannot rest two days in a row (next day is rest)." };
  }
  return { ok: true };
}

export function finalizeDayStatuses(input: {
  exercise_status: ExerciseStatus;
  nutrition_status: NutritionStatus;
}): { exercise_status: ExerciseStatus; nutrition_status: NutritionStatus } {
  return {
    exercise_status:
      input.exercise_status === "pending" ? "failure" : input.exercise_status,
    nutrition_status:
      input.nutrition_status === "pending" ? "failure" : input.nutrition_status,
  };
}

export function shouldFinalize(
  date: string,
  today: string,
  finalizedAt: string | null,
): boolean {
  if (finalizedAt) return false;
  return date < today;
}

export function restNeighborDates(date: string): { previous: string; next: string } {
  return {
    previous: subDaysFromDateString(date, 1),
    next: addDaysToDateString(date, 1),
  };
}

export function isExerciseSatisfied(status: ExerciseStatus): boolean {
  return status === "completed" || status === "rest";
}

export function isNutritionSatisfied(status: NutritionStatus): boolean {
  return status === "healthy";
}
