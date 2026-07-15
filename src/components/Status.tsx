import type { ExerciseStatus, NutritionStatus } from "@/lib/types";
import clsx from "clsx";

export function exerciseSymbol(status: ExerciseStatus | undefined): string {
  switch (status) {
    case "completed":
      return "E";
    case "rest":
      return "R";
    case "failure":
      return "X";
    default:
      return "·";
  }
}

export function nutritionSymbol(status: NutritionStatus | undefined): string {
  switch (status) {
    case "healthy":
      return "H";
    case "failure":
      return "X";
    default:
      return "·";
  }
}

type Tone = "success" | "rest" | "danger" | "pending" | "warn";

export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "success" && "bg-success/15 text-success",
        tone === "rest" && "bg-rest/15 text-rest",
        tone === "danger" && "bg-danger/15 text-danger",
        tone === "pending" && "bg-pending/20 text-muted",
        tone === "warn" && "bg-warn/15 text-warn",
      )}
    >
      {label}
    </span>
  );
}

export function exerciseTone(status: ExerciseStatus): Tone {
  if (status === "completed") return "success";
  if (status === "rest") return "rest";
  if (status === "failure") return "danger";
  return "pending";
}

export function nutritionTone(status: NutritionStatus): Tone {
  if (status === "healthy") return "success";
  if (status === "failure") return "danger";
  return "pending";
}
