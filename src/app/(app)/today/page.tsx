import { redirect } from "next/navigation";
import { loadDashboard } from "@/lib/data";
import { TodayActions } from "@/components/TodayActions";

export default async function TodayPage() {
  const data = await loadDashboard();
  if (!data) redirect("/login");

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted">Discipline</p>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-sm text-muted">{data.today}</p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Exercise streak" value={data.streaks.exercise} />
        <Stat label="Nutrition streak" value={data.streaks.nutrition} />
        <Stat label="Perfect streak" value={data.streaks.perfect} />
      </div>

      <TodayActions
        date={data.today}
        record={data.todayRecord}
        weightDue={data.weightDue}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-3 text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted leading-tight">{label}</div>
    </div>
  );
}
