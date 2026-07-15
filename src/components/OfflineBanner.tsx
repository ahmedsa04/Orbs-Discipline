"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  if (online) return null;
  return (
    <div className="mb-3 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
      You are offline. Open requirements and history need a connection to save.
    </div>
  );
}
