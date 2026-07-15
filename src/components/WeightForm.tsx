"use client";

import { useState, useTransition } from "react";
import { logWeight } from "@/lib/actions";
import type { WeightCheckIn, WeightUnit } from "@/lib/types";

export function WeightForm({
  today,
  unit,
  checkins,
}: {
  today: string;
  unit: WeightUnit;
  checkins: WeightCheckIn[];
}) {
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const trend =
    checkins.length >= 2
      ? Number(checkins[0].weight) - Number(checkins[1].weight)
      : null;

  return (
    <div className="space-y-4">
      <form
        className="rounded-2xl border border-card-border bg-card p-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setMsg(null);
            const value = Number(weight);
            if (!value || value <= 0) {
              setMsg("Enter a valid weight");
              return;
            }
            const res = await logWeight(date, value, unit, notes);
            if (res.error) setMsg(res.error);
            else {
              setMsg("Saved");
              setWeight("");
              setNotes("");
            }
          });
        }}
      >
        <h2 className="font-semibold">Log weight</h2>
        <label className="block text-xs text-muted">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs text-muted">
          Weight ({unit})
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="mt-1 w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm"
            required
          />
        </label>
        <label className="block text-xs text-muted">
          Notes
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Save check-in
        </button>
        {msg && <p className="text-xs text-muted">{msg}</p>}
      </form>

      {trend != null && (
        <p className="text-sm text-muted">
          Change vs previous:{" "}
          <span className={trend > 0 ? "text-warn" : "text-success"}>
            {trend > 0 ? "+" : ""}
            {trend.toFixed(1)} {unit}
          </span>
        </p>
      )}

      <div className="rounded-2xl border border-card-border bg-card divide-y divide-card-border">
        {checkins.length === 0 && (
          <p className="p-4 text-sm text-muted">No check-ins yet.</p>
        )}
        {checkins.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{c.date}</span>
            <span className="font-medium">
              {c.weight} {c.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
