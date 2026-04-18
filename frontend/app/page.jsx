"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-provider";

export default function HomePage() {
  const router = useRouter();
  const { token, isReady } = useSession();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    router.replace(token ? "/dashboard" : "/login");
  }, [isReady, router, token]);

  return <div className="py-24 text-center text-slate-500">Loading platform...</div>;
}
