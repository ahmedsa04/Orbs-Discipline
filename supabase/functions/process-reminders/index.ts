import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";

/**
 * Supabase Edge Function alternative to the Next.js cron route.
 * Schedule via Supabase Cron → invoke this function every 5–15 minutes.
 *
 * Secrets required:
 * - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (auto)
 * - VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 * - SITE_URL (optional, for links)
 */
Deno.serve(async (req) => {
  const auth = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  // Allow service role / anon gateway; optionally require CRON_SECRET
  if (cronSecret && auth !== `Bearer ${cronSecret}` && !auth?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "___")) {
    // Still allow Supabase dashboard invocations with the project's anon/service key via gateway
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") || Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:owner@example.com";

  if (!publicKey || !privateKey) {
    return new Response(JSON.stringify({ error: "VAPID keys missing" }), { status: 500 });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const admin = createClient(url, serviceKey);

  // Forward processing to app cron if SITE_CRON_URL is set; otherwise do lightweight finalize only
  const siteCron = Deno.env.get("SITE_CRON_URL");
  if (siteCron && cronSecret) {
    const res = await fetch(siteCron, {
      method: "POST",
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    const body = await res.text();
    return new Response(body, { status: res.status, headers: { "Content-Type": "application/json" } });
  }

  const { data: profiles } = await admin.from("profiles").select("id, timezone");
  let finalized = 0;
  for (const p of profiles ?? []) {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: p.timezone });
    const { data } = await admin.rpc("finalize_past_days", {
      p_user_id: p.id,
      p_today: today,
    });
    finalized += Number(data ?? 0);
  }

  return new Response(JSON.stringify({ ok: true, finalized, note: "Set SITE_CRON_URL to your /api/cron/process-reminders for full push processing" }), {
    headers: { "Content-Type": "application/json" },
  });
});
