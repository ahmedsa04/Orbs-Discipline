import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:owner@example.com";
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", user.id);

  if (!subs?.length) {
    return NextResponse.json({ error: "No push subscriptions" }, { status: 400 });
  }

  const payload = JSON.stringify({
    title: "Discipline test",
    body: "Notifications are working.",
    url: "/today",
    badgeCount: 1,
  });

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        },
        payload,
      ),
    ),
  );

  return NextResponse.json({
    ok: true,
    sent: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  });
}
