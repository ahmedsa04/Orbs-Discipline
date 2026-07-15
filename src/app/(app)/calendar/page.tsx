import { redirect } from "next/navigation";
import Link from "next/link";
import { loadYear, getSessionUser } from "@/lib/data";
import { todayInTimezone } from "@/lib/dates";
import { CalendarGrid } from "@/components/CalendarGrid";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { user, supabase } = await getSessionUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  const today = todayInTimezone(profile?.timezone ?? "UTC");
  const params = await searchParams;
  const year = Number(params.year) || Number(today.slice(0, 4));
  const data = await loadYear(year);
  if (!data) redirect("/login");

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-xs text-muted">E = exercise · H = healthy · R = rest · X = fail · W = weight</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?year=${year - 1}`}
            className="rounded-lg border border-card-border px-2 py-1 text-sm"
          >
            ←
          </Link>
          <span className="tabular-nums font-semibold">{year}</span>
          <Link
            href={`/calendar?year=${year + 1}`}
            className="rounded-lg border border-card-border px-2 py-1 text-sm"
          >
            →
          </Link>
        </div>
      </header>
      <CalendarGrid
        year={year}
        records={data.records}
        weights={data.weights}
        today={today}
      />
    </div>
  );
}
