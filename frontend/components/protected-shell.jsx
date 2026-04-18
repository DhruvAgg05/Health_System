"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-provider";

export function ProtectedShell({ children }) {
  const router = useRouter();
  const { token, isReady } = useSession();

  useEffect(() => {
    if (isReady && !token) {
      router.replace("/login");
    }
  }, [isReady, router, token]);

  if (!isReady || !token) {
    return <div className="py-24 text-center text-slate-500">Loading secure workspace...</div>;
  }

  return <div>{children}</div>;
}
