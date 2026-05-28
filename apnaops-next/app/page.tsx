"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

export default function RootPage() {
  const router = useRouter();
  const authed = useAppStore((s) => s.session.authenticated);
  useEffect(() => {
    router.replace(authed ? "/home" : "/login");
  }, [authed, router]);
  return null;
}
