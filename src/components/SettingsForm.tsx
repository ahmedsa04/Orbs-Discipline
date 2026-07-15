"use client";

import { useState, useTransition } from "react";
import { updateProfile, updateReminderPreference, signOut } from "@/lib/actions";
import type { Profile, ReminderPreference, WeightUnit } from "@/lib/types";
import { NotificationSetup } from "@/components/pwa/NotificationSetup";
import { useRouter } from "next/navigation";

const TIMEZONES = [
  "Asia/Riyadh",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

export function SettingsForm({
  profile,
  reminders,
}: {
  profile: Profile;
  reminders: ReminderPreference[];
}) {
  const router = useRouter();
  const [timezone, setTimezone] = useState(profile.timezone);
  const [unit, setUnit] = useState(profile.weight_unit);
  const [weekday, setWeekday] = useState(profile.weigh_in_weekday);
  const [weighTime, setWeighTime] = useState(profile.weigh_in_time);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <NotificationSetup />

      <form
        className="rounded-2xl border border-card-border bg-card p-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await updateProfile({
              timezone,
              weight_unit: unit as WeightUnit,
              weigh_in_weekday: weekday,
              weigh_in_time: weighTime,
            });
            setMsg(res.error || "Profile saved");
          });
        }}
      >
        <h2 className="font-semibold">Profile</h2>
        <label className="block text-xs text-muted">
          Timezone
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="mt-1 w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-muted">
          Weight unit
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as WeightUnit)}
            className="mt-1 w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm"
          >
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </label>
        <label className="block text-xs text-muted">
          Weigh-in weekday
          <select
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm"
          >
            {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
              (d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="block text-xs text-muted">
          Weigh-in time
          <input
            type="time"
            value={weighTime}
            onChange={(e) => setWeighTime(e.target.value)}
            className="mt-1 w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white"
        >
          Save profile
        </button>
        {msg && <p className="text-xs text-muted">{msg}</p>}
      </form>

      <div className="rounded-2xl border border-card-border bg-card p-4 space-y-3">
        <h2 className="font-semibold">Reminder schedule</h2>
        <p className="text-xs text-muted">
          Times are local to your timezone. Exercise reminders skip rest/completed days.
        </p>
        <ul className="space-y-3">
          {reminders.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-card-border p-2"
            >
              <span className="min-w-24 text-xs capitalize text-muted">{r.kind}</span>
              <input
                type="time"
                defaultValue={r.time_local}
                className="rounded-lg border border-card-border bg-background px-2 py-1 text-sm"
                onBlur={(e) => {
                  start(async () => {
                    await updateReminderPreference(r.id, {
                      time_local: e.target.value,
                    });
                  });
                }}
              />
              <label className="ml-auto flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  defaultChecked={r.enabled}
                  onChange={(e) => {
                    start(async () => {
                      await updateReminderPreference(r.id, {
                        enabled: e.target.checked,
                      });
                    });
                  }}
                />
                On
              </label>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="w-full rounded-xl border border-danger/40 py-3 text-sm text-danger"
        onClick={() =>
          start(async () => {
            await signOut();
            router.push("/login");
            router.refresh();
          })
        }
      >
        Sign out
      </button>
    </div>
  );
}
