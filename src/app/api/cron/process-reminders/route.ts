import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { localDateTimeParts } from "@/lib/dates";
import { evaluateReminders, weekNeedsWeightCheckIn, outstandingBadgeCount } from "@/lib/reminders";
import type { DailyRecord, Profile, ReminderPreference, WeightCheckIn } from "@/lib/types";

/**
 * Cron endpoint: finalize past days + send due reminders.
 * Secure with CRON_SECRET header: Authorization: Bearer <CRON_SECRET>
 * Call from Supabase Cron or Vercel Cron every 5–15 minutes.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const authorized =
    (secret && auth === `Bearer ${secret}`) ||
    (process.env.NODE_ENV === "production" && isVercelCron && Boolean(secret));
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:owner@example.com";

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase service config missing" }, { status: 500 });
  }

  const admin = createClient(url, serviceKey);
  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  const { data: profiles, error } = await admin.from("profiles").select("*");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let notificationsSent = 0;
  let daysFinalized = 0;

  for (const profile of (profiles ?? []) as Profile[]) {
    const parts = localDateTimeParts(profile.timezone);
    const { data: finalized } = await admin.rpc("finalize_past_days", {
      p_user_id: profile.id,
      p_today: parts.date,
    });
    daysFinalized += Number(finalized ?? 0);

    const [{ data: todayRow }, { data: prefs }, { data: weights }, { data: subs }, { data: logs }] =
      await Promise.all([
        admin
          .from("daily_records")
          .select("*")
          .eq("user_id", profile.id)
          .eq("date", parts.date)
          .maybeSingle(),
        admin
          .from("reminder_preferences")
          .select("*")
          .eq("user_id", profile.id)
          .eq("enabled", true),
        admin
          .from("weight_checkins")
          .select("date")
          .eq("user_id", profile.id)
          .gte("date", parts.date.slice(0, 8) + "01")
          .limit(20),
        admin.from("push_subscriptions").select("*").eq("user_id", profile.id),
        admin
          .from("notification_logs")
          .select("dedupe_key")
          .eq("user_id", profile.id)
          .gte("sent_at", `${parts.date}T00:00:00Z`),
      ]);

    const weightDue = weekNeedsWeightCheckIn(
      (weights ?? []) as Pick<WeightCheckIn, "date">[],
      parts.date,
      profile.weigh_in_weekday,
      parts.time,
      profile.weigh_in_time,
    );

    const alreadySent = new Set((logs ?? []).map((l: { dedupe_key: string }) => l.dedupe_key));
    const candidates = evaluateReminders({
      preferences: (prefs ?? []) as ReminderPreference[],
      currentTime: parts.time,
      todayRecord: (todayRow as DailyRecord) ?? null,
      weightDue,
      alreadySentKeys: alreadySent,
      dateKey: parts.date,
    });

    const exercise = (todayRow as DailyRecord | null)?.exercise_status ?? "pending";
    const nutrition = (todayRow as DailyRecord | null)?.nutrition_status ?? "pending";
    const badgeCount = outstandingBadgeCount({ exercise, nutrition, weightDue });

    for (const candidate of candidates) {
      const dedupeKey = `${parts.date}:${candidate.preferenceId}:${candidate.kind}`;
      const { error: logErr } = await admin.from("notification_logs").insert({
        user_id: profile.id,
        preference_id: candidate.preferenceId,
        kind: candidate.kind,
        dedupe_key: dedupeKey,
        title: candidate.title,
        body: candidate.body,
      });
      if (logErr) continue; // already sent or conflict

      if (!publicKey || !privateKey || !subs?.length) continue;

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({
              title: candidate.title,
              body: candidate.body,
              url: candidate.url,
              badgeCount,
            }),
          );
          notificationsSent += 1;
        } catch (err: unknown) {
          const statusCode =
            err && typeof err === "object" && "statusCode" in err
              ? Number((err as { statusCode: number }).statusCode)
              : 0;
          if (statusCode === 404 || statusCode === 410) {
            await admin.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, notificationsSent, daysFinalized });
}

export async function GET(request: Request) {
  return POST(request);
}
