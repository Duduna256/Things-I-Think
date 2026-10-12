"use client";

import "@/styles/dashboard.css";
import { DashError } from "@/components/dashboard/DashError";

export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <DashError error={error} retry={retry} />;
}
