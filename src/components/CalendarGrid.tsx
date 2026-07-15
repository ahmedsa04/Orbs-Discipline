"use client";

import { useMemo, useState, useTransition } from "react";
import { monthGrid } from "@/lib/dates";
import type { DailyRecord, WeightCheckIn } from "@/lib/types";
import {
  exerciseSymbol,
  nutritionSymbol,
  exerciseTone,
  nutritionTone,
  StatusPill,
} from "@/components/Status";
import { correctDay, updateDayNotes } from "@/lib/actions";
import clsx from "clsx";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function CalendarGrid({
  year,
  records,
  weights,
  today,
}: {
  year: number;
  records: DailyRecord[];
  weights: WeightCheckIn[];
  today: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const byDate = useMemo(() => {
    const m = new Map(records.map((r) => [r.date, r]));
    return m;
  }, [records]);
  const weightByDate = useMemo(
    () => new Map(weights.map((w) => [w.date, w])),
    [weights],
  );

  const selectedRecord = selected ? byDate.get(selected) : undefined;
  const selectedWeight = selected ? weightByDate.get(selected) : undefined;

  return (
    <div className="space-y-6">
      {MONTHS.map((name, month) => {
        const cells = monthGrid(year, month);
        return (
          <section key={name} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted">
              {name} {year}
            </h2>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((date, i) => {
                if (!date) return <div key={`e-${i}`} className="aspect-square" />;
                const rec = byDate.get(date);
                const hasWeight = weightByDate.has(date);
                const isToday = date === today;
                const dayNum = Number(date.slice(-2));
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelected(date)}
                    className={clsx(
                      "aspect-square rounded-lg border p-0.5 text-[10px] leading-tight",
                      isToday ? "border-accent" : "border-card-border",
                      selected === date ? "bg-accent/20" : "bg-card",
                    )}
                    aria-label={`${date} exercise ${rec?.exercise_status ?? "pending"} nutrition ${rec?.nutrition_status ?? "pending"}`}
                  >
                    <div className="font-medium">{dayNum}</div>
                    <div className="flex justify-center gap-0.5 font-mono">
                      <span
                        className={clsx(
                          rec?.exercise_status === "completed" && "text-success",
                          rec?.exercise_status === "rest" && "text-rest",
                          rec?.exercise_status === "failure" && "text-danger",
                          (!rec || rec.exercise_status === "pending") && "text-muted",
                        )}
                      >
                        {exerciseSymbol(rec?.exercise_status)}
                      </span>
                      <span
                        className={clsx(
                          rec?.nutrition_status === "healthy" && "text-success",
                          rec?.nutrition_status === "failure" && "text-danger",
                          (!rec || rec.nutrition_status === "pending") && "text-muted",
                        )}
                      >
                        {nutritionSymbol(rec?.nutrition_status)}
                      </span>
                      {hasWeight && <span className="text-warn">W</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {selected && (
        <DaySheet
          date={selected}
          record={selectedRecord}
          weight={selectedWeight}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function DaySheet({
  date,
  record,
  weight,
  onClose,
}: {
  date: string;
  record?: DailyRecord;
  weight?: WeightCheckIn;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [exercise, setExercise] = useState(record?.exercise_status ?? "pending");
  const [nutrition, setNutrition] = useState(record?.nutrition_status ?? "pending");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-3 sm:items-center sm:justify-center">
      <div className="w-full max-w-md rounded-2xl border border-card-border bg-background p-4 space-y-3 safe-bottom">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{date}</h3>
          <button type="button" onClick={onClose} className="text-muted text-sm">
            Close
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill label={`Exercise: ${exercise}`} tone={exerciseTone(exercise)} />
          <StatusPill label={`Nutrition: ${nutrition}`} tone={nutritionTone(nutrition)} />
          {weight && (
            <StatusPill
              label={`Weight: ${weight.weight}${weight.unit}`}
              tone="warn"
            />
          )}
        </div>

        <label className="block text-xs text-muted">
          Exercise
          <select
            className="mt-1 w-full rounded-xl border border-card-border bg-card px-3 py-2 text-sm"
            value={exercise}
            onChange={(e) => setExercise(e.target.value as typeof exercise)}
          >
            <option value="pending">pending</option>
            <option value="completed">completed</option>
            <option value="rest">rest</option>
            <option value="failure">failure</option>
          </select>
        </label>

        <label className="block text-xs text-muted">
          Nutrition
          <select
            className="mt-1 w-full rounded-xl border border-card-border bg-card px-3 py-2 text-sm"
            value={nutrition}
            onChange={(e) => setNutrition(e.target.value as typeof nutrition)}
          >
            <option value="pending">pending</option>
            <option value="healthy">healthy</option>
            <option value="failure">failure</option>
          </select>
        </label>

        <label className="block text-xs text-muted">
          Notes
          <textarea
            className="mt-1 w-full rounded-xl border border-card-border bg-card px-3 py-2 text-sm"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <button
          type="button"
          disabled={pending}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
          onClick={() =>
            start(async () => {
              setMsg(null);
              const a = await correctDay(date, exercise, nutrition);
              if (a.error) {
                setMsg(a.error);
                return;
              }
              const b = await updateDayNotes(date, notes);
              if (b.error) {
                setMsg(b.error);
                return;
              }
              setMsg("Saved. Corrections are kept in audit history.");
            })
          }
        >
          Save correction
        </button>
        {msg && <p className="text-xs text-muted">{msg}</p>}
      </div>
    </div>
  );
}
