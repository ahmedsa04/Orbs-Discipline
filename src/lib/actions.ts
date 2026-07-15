"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayInTimezone } from "@/lib/dates";
import type { ExerciseStatus, NutritionStatus, WeightUnit } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

async function getProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function ensureTodayAndFinalize() {
  const { supabase, user } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  const today = todayInTimezone(profile.timezone);
  await supabase.rpc("finalize_past_days", {
    p_user_id: user.id,
    p_today: today,
  });
  return { today, profile };
}

export async function setExerciseStatus(date: string, status: ExerciseStatus) {
  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("daily_records")
    .select("nutrition_status, notes")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  const { error } = await supabase.from("daily_records").upsert(
    {
      user_id: user.id,
      date,
      exercise_status: status,
      nutrition_status: existing?.nutrition_status ?? "pending",
      notes: existing?.notes ?? null,
    },
    { onConflict: "user_id,date" },
  );
  if (error) return { error: error.message };
  revalidatePath("/today");
  revalidatePath("/calendar");
  return { ok: true };
}

export async function setNutritionStatus(date: string, status: NutritionStatus) {
  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("daily_records")
    .select("exercise_status, notes")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  const { error } = await supabase.from("daily_records").upsert(
    {
      user_id: user.id,
      date,
      exercise_status: existing?.exercise_status ?? "pending",
      nutrition_status: status,
      notes: existing?.notes ?? null,
    },
    { onConflict: "user_id,date" },
  );
  if (error) return { error: error.message };
  revalidatePath("/today");
  revalidatePath("/calendar");
  return { ok: true };
}

export async function declareRest(date: string) {
  return setExerciseStatus(date, "rest");
}

export async function markExercised(date: string) {
  return setExerciseStatus(date, "completed");
}

export async function markHealthy(date: string) {
  return setNutritionStatus(date, "healthy");
}

export async function updateDayNotes(date: string, notes: string) {
  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("daily_records")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  const { error } = await supabase.from("daily_records").upsert(
    {
      user_id: user.id,
      date,
      exercise_status: existing?.exercise_status ?? "pending",
      nutrition_status: existing?.nutrition_status ?? "pending",
      notes,
    },
    { onConflict: "user_id,date" },
  );
  if (error) return { error: error.message };
  revalidatePath("/calendar");
  revalidatePath("/today");
  return { ok: true };
}

export async function correctDay(
  date: string,
  exercise_status: ExerciseStatus,
  nutrition_status: NutritionStatus,
) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("daily_records").upsert(
    {
      user_id: user.id,
      date,
      exercise_status,
      nutrition_status,
      // Keep finalized_at if already finalized; corrections remain audited
    },
    { onConflict: "user_id,date" },
  );
  if (error) return { error: error.message };
  revalidatePath("/calendar");
  revalidatePath("/today");
  return { ok: true };
}

export async function logWeight(date: string, weight: number, unit: WeightUnit, notes?: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("weight_checkins").upsert(
    {
      user_id: user.id,
      date,
      weight,
      unit,
      notes: notes || null,
    },
    { onConflict: "user_id,date" },
  );
  if (error) return { error: error.message };
  revalidatePath("/weight");
  revalidatePath("/today");
  return { ok: true };
}

export async function updateProfile(fields: {
  timezone?: string;
  weight_unit?: WeightUnit;
  weigh_in_weekday?: number;
  weigh_in_time?: string;
}) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update(fields).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/today");
  return { ok: true };
}

export async function updateReminderPreference(
  id: string,
  fields: { time_local?: string; enabled?: boolean },
) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("reminder_preferences")
    .update(fields)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
