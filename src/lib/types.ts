export type ExerciseStatus = "pending" | "completed" | "rest" | "failure";
export type NutritionStatus = "pending" | "healthy" | "failure";
export type WeightUnit = "kg" | "lb";

export type DailyRecord = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD in user timezone
  exercise_status: ExerciseStatus;
  nutrition_status: NutritionStatus;
  notes: string | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WeightCheckIn = {
  id: string;
  user_id: string;
  date: string;
  weight: number;
  unit: WeightUnit;
  notes: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string | null;
  timezone: string;
  weight_unit: WeightUnit;
  weigh_in_weekday: number; // 0=Sun .. 6=Sat
  weigh_in_time: string; // HH:MM
  created_at: string;
  updated_at: string;
};

export type ReminderPreference = {
  id: string;
  user_id: string;
  kind: "exercise" | "nutrition" | "end_of_day" | "weight";
  time_local: string; // HH:MM
  enabled: boolean;
  sort_order: number;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
};

export type DayView = {
  date: string;
  exercise_status: ExerciseStatus;
  nutrition_status: NutritionStatus;
  notes: string | null;
  weight: number | null;
  weight_unit: WeightUnit | null;
};

export type OutstandingRequirements = {
  exercise: boolean;
  nutrition: boolean;
  weight: boolean;
  badgeCount: number;
};
