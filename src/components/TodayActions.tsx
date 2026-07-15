"use client";

import { useState, useTransition } from "react";
import {
  declareRest,
  markExercised,
  markHealthy,
  setExerciseStatus,
  setNutritionStatus,
} from "@/lib/actions";
import type { DailyRecord } from "@/lib/types";
import { StatusPill, exerciseTone, nutritionTone } from "@/components/Status";

export function TodayActions({
  date,
  record,
  weightDue,
}: {
  date: string;
  record: DailyRecord;
  weightDue: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ error?: string; ok?: boolean }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-card-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Exercise</h2>
          <StatusPill
            label={record.exercise_status}
            tone={exerciseTone(record.exercise_status)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={pending || record.exercise_status === "completed"}
            onClick={() => run(() => markExercised(date))}
            className="rounded-xl bg-success/90 px-3 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Exercised
          </button>
          <button
            type="button"
            disabled={pending || record.exercise_status === "rest"}
            onClick={() => run(() => declareRest(date))}
            className="rounded-xl bg-rest/90 px-3 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Rest day
          </button>
        </div>
        {record.exercise_status !== "pending" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setExerciseStatus(date, "pending"))}
            className="text-xs text-muted underline"
          >
            Reset exercise
          </button>
        )}
        <p className="text-xs text-muted">Rest cannot be used two days in a row.</p>
      </div>

      <div className="rounded-2xl border border-card-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Healthy eating</h2>
          <StatusPill
            label={record.nutrition_status}
            tone={nutritionTone(record.nutrition_status)}
          />
        </div>
        <button
          type="button"
          disabled={pending || record.nutrition_status === "healthy"}
          onClick={() => run(() => markHealthy(date))}
          className="w-full rounded-xl bg-accent px-3 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          Ate healthy
        </button>
        {record.nutrition_status !== "pending" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setNutritionStatus(date, "pending"))}
            className="text-xs text-muted underline"
          >
            Reset nutrition
          </button>
        )}
      </div>

      {weightDue && (
        <a
          href="/weight"
          className="block rounded-2xl border border-warn/40 bg-warn/10 p-4 text-sm"
        >
          <strong className="text-warn">Weekly weight check-in due</strong>
          <p className="text-muted mt-1">Tap to log your weight.</p>
        </a>
      )}

      {error && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
