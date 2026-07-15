import { redirect } from "next/navigation";
import { loadDashboard } from "@/lib/data";
import { WeightForm } from "@/components/WeightForm";

export default async function WeightPage() {
  const data = await loadDashboard();
  if (!data) redirect("/login");

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Weight</h1>
        <p className="text-sm text-muted">
          Weekly check-in day:{" "}
          {
            ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
              data.profile.weigh_in_weekday
            ]
          }{" "}
          at {data.profile.weigh_in_time}
        </p>
        {data.weightDue && (
          <p className="mt-2 text-sm text-warn">Check-in due this week.</p>
        )}
      </header>
      <WeightForm
        today={data.today}
        unit={data.profile.weight_unit}
        checkins={data.weightCheckins}
      />
    </div>
  );
}
