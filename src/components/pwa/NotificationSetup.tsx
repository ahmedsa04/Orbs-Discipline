"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function isStandaloneClient() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function currentPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export function NotificationSetup() {
  const [status, setStatus] = useState("");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    currentPermission,
  );
  const [standalone] = useState(isStandaloneClient);

  async function enable() {
    setStatus("Requesting permission…");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("Push is not available in this browser.");
        return;
      }
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setStatus("Permission denied. Enable notifications in iOS Settings.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) {
        setStatus("Missing VAPID public key env.");
        return;
      }

      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        }));

      const json = sub.toJSON();
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus("Not signed in.");
        return;
      }

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh!,
          auth: json.keys!.auth!,
          user_agent: navigator.userAgent,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );

      if (error) {
        setStatus(error.message);
        return;
      }
      setStatus("Notifications enabled.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to enable notifications");
    }
  }

  async function sendTest() {
    setStatus("Sending test…");
    const res = await fetch("/api/push/test", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setStatus(res.ok ? "Test notification queued." : body.error || "Test failed");
  }

  return (
    <div className="rounded-2xl border border-card-border bg-card p-4 space-y-3">
      <h2 className="text-base font-semibold">Notifications (iPhone)</h2>
      <ol className="text-sm text-muted space-y-1 list-decimal list-inside">
        <li>Open this site in Safari</li>
        <li>Share → Add to Home Screen</li>
        <li>Open Discipline from the Home Screen icon</li>
        <li>Tap Enable notifications below</li>
      </ol>
      {!standalone && (
        <p className="text-xs text-warn">
          You are not in standalone mode. On iPhone, push only works after Add to Home Screen.
        </p>
      )}
      <p className="text-xs text-muted">Permission: {permission}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={enable}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white"
        >
          Enable notifications
        </button>
        <button
          type="button"
          onClick={sendTest}
          className="rounded-xl border border-card-border px-4 py-2.5 text-sm"
        >
          Send test
        </button>
      </div>
      {status && <p className="text-xs text-muted">{status}</p>}
    </div>
  );
}
