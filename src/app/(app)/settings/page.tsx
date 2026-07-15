import { redirect } from "next/navigation";
import { loadDashboard } from "@/lib/data";
import { SettingsForm } from "@/components/SettingsForm";
import type { ReminderPreference } from "@/lib/types";

export default async function SettingsPage() {
  const data = await loadDashboard();
  if (!data) redirect("/login");

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted">{data.profile.email}</p>
      </header>
      <SettingsForm
        profile={data.profile}
        reminders={data.reminders as ReminderPreference[]}
      />
    </div>
  );
}
