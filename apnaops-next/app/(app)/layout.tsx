"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { AppSidebar } from "@/components/app-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const authed = useAppStore((s) => s.session.authenticated);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  React.useEffect(() => {
    if (mounted && !authed) router.replace("/login");
  }, [mounted, authed, router]);
  if (!mounted || !authed) return null;
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-14 px-6 md:px-10 py-8 max-w-screen-2xl">{children}</main>
    </div>
  );
}
