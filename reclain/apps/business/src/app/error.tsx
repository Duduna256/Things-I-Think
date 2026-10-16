"use client";

import { DashError } from "@/components/dashboard/DashError";

export default function BusinessError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <DashError error={error} retry={retry} />;
}
