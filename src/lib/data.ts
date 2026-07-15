import { createClient } from "@/lib/supabase/server";
import { todayInTimezone } from "@/lib/dates";
import { weekNeedsWeightCheckIn } from "@/lib/reminders";
import { localDateTimeParts } from "@/lib/dates";
import {
  exerciseStreak,
  nutritionStreak,
  perfectDayStreak,
} from "@/lib/streaks";
import type { DailyRecord, Profile, WeightCheckIn } from "@/lib/types";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function loadDashboard() {
  const { supabase, user } = await getSessionUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const today = todayInTimezone(profile.timezone);
  await supabase.rpc("finalize_past_days", {
    p_user_id: user.id,
    p_today: today,
  });

  const lookbackStart = new Date(today + "T12:00:00");
  lookbackStart.setDate(lookbackStart.getDate() - 400);

  const [{ data: records }, { data: weights }, { data: reminders }] =
    await Promise.all([
      supabase
        .from("daily_records")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", lookbackStart.toISOString().slice(0, 10))
        .order("date", { ascending: false }),
      supabase
        .from("weight_checkins")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(52),
      supabase
        .from("reminder_preferences")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order"),
    ]);

  const dailyRecords = (records ?? []) as DailyRecord[];
  const weightCheckins = (weights ?? []) as WeightCheckIn[];
  const todayRecord =
    dailyRecords.find((r) => r.date === today) ??
    ({
      id: "",
      user_id: user.id,
      date: today,
      exercise_status: "pending",
      nutrition_status: "pending",
      notes: null,
      finalized_at: null,
      created_at: "",
      updated_at: "",
    } satisfies DailyRecord);

  const parts = localDateTimeParts(profile.timezone);
  const weightDue = weekNeedsWeightCheckIn(
    weightCheckins,
    today,
    profile.weigh_in_weekday,
    parts.time,
    profile.weigh_in_time,
  );

  return {
    profile: profile as Profile,
    today,
    todayRecord,
    dailyRecords,
    weightCheckins,
    reminders: reminders ?? [],
    weightDue,
    streaks: {
      exercise: exerciseStreak(dailyRecords, today),
      nutrition: nutritionStreak(dailyRecords, today),
      perfect: perfectDayStreak(dailyRecords, today),
    },
  };
}

export async function loadYear(year: number) {
  const { supabase, user } = await getSessionUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const [{ data: records }, { data: weights }] = await Promise.all([
    supabase
      .from("daily_records")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end),
    supabase
      .from("weight_checkins")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end),
  ]);

  return {
    profile: profile as Profile,
    year,
    records: (records ?? []) as DailyRecord[],
    weights: (weights ?? []) as WeightCheckIn[],
  };
}

export async function loadDayDetail(date: string) {
  const { supabase, user } = await getSessionUser();
  if (!user) return null;

  const [{ data: record }, { data: weight }, { data: audit }] = await Promise.all([
    supabase
      .from("daily_records")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle(),
    supabase
      .from("weight_checkins")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle(),
    supabase
      .from("daily_record_audit")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("created_at", { ascending: false }),
  ]);

  return { record, weight, audit: audit ?? [] };
}
