import { BottomNav } from "@/components/BottomNav";
import { OfflineBanner } from "@/components/OfflineBanner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-4 pb-24 pt-4 safe-top">
      <OfflineBanner />
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
