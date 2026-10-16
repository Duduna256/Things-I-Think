// GET /api/cron/reminders
// Vercel Cron calls this every day at 15:00 UTC (18:00 in Kampala, see vercel.json) with
// "Authorization: Bearer <CRON_SECRET>". It texts everyone with a confirmed booking tomorrow
// and answers with a short summary. Run it by hand with:
//   curl -H "Authorization: Bearer $CRON_SECRET" https://<your-site>/api/cron/reminders

import { NextResponse, type NextRequest } from "next/server";
import { features } from "@/config/features";
import { data } from "@/lib/data";
import { isDemo, serverEnv } from "@/lib/env";
import { sendReminder } from "@/lib/notify";
import { checkCronAuth, runReminders } from "./run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function GET(request: NextRequest) {
  const auth = checkCronAuth(request.headers.get("authorization"), serverEnv.cronSecret, isDemo);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  try {
    const summary = await runReminders(new Date(), {
      enabled: features.smsReminders,
      listDue: (fromIso, toIso) => data.server.listRemindersDue(fromIso, toIso),
      send: booking => sendReminder(booking),
      claim: id => data.server.claimReminder(id),
      release: id => data.server.releaseReminder(id),
      log: (message, detail) => console.error(`[reminders] ${message}`, detail ?? ""),
    });
    return json(summary);
  } catch (e) {
    console.error("[reminders] run failed", e);
    return json({ ok: false, error: "Couldn't load tomorrow's bookings. Check the database connection, then run it again." }, 500);
  }
}
