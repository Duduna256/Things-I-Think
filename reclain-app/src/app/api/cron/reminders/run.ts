// The day-before reminder job, minus the plumbing. Pure (the route passes in the data layer
// and the SMS sender), so it's unit-tested in run.test.ts. Relative imports only, for the tests.

import { createHash, timingSafeEqual } from "node:crypto";
import { addDays, toInstant, todayLocal } from "../../../../lib/time";
import type { Booking } from "../../../../lib/types";

// Tomorrow in Kampala, as the UTC instants the database compares against.
export function reminderWindow(now: Date): { date: string; fromIso: string; toIso: string } {
  const date = addDays(todayLocal(now), 1);
  return { date, fromIso: toInstant(date, 0).toISOString(), toIso: toInstant(addDays(date, 1), 0).toISOString() };
}

function safeEqual(a: string, b: string): boolean {
  const x = createHash("sha256").update(a, "utf8").digest();
  const y = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(x, y);
}

export type CronAuth = { ok: true } | { ok: false; status: 401 | 503; error: string };

// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set in the project.
// Without a secret the job stays locked, except in demo mode where there's nothing real to protect.
export function checkCronAuth(header: string | null, secret: string, demo: boolean): CronAuth {
  if (!secret) {
    if (demo) return { ok: true };
    return { ok: false, status: 503, error: "CRON_SECRET isn't set, so reminders are locked. Add it in Vercel > Settings > Environment Variables." };
  }
  if (!header || !safeEqual(header.trim(), `Bearer ${secret}`)) {
    return { ok: false, status: 401, error: "Missing or wrong Authorization header." };
  }
  return { ok: true };
}

export interface ReminderDeps {
  enabled: boolean; // features.smsReminders
  listDue(fromIso: string, toIso: string): Promise<Booking[]>;
  send(booking: Booking): Promise<boolean>; // true when the SMS went out
  markSent(bookingId: string): Promise<void>;
  concurrency?: number;
  log?(message: string, detail?: unknown): void;
}

export interface ReminderSummary {
  ok: true;
  date: string; // the Kampala date the reminders are for
  due: number;
  sent: number;
  failed: number;
  failedRefs: string[];
  skipped?: string;
}

export async function runReminders(now: Date, deps: ReminderDeps): Promise<ReminderSummary> {
  const log = deps.log ?? ((message: string, detail?: unknown) => console.warn(message, detail ?? ""));
  const window = reminderWindow(now);
  const summary: ReminderSummary = { ok: true, date: window.date, due: 0, sent: 0, failed: 0, failedRefs: [] };
  if (!deps.enabled) return { ...summary, skipped: "SMS reminders are switched off (features.smsReminders)." };

  // The query already asks for these; checking again costs nothing and guards a rerun.
  const due = (await deps.listDue(window.fromIso, window.toIso)).filter(b => b.status === "confirmed" && !b.reminderSentAt);
  summary.due = due.length;

  const size = Math.max(1, deps.concurrency ?? 5);
  for (let i = 0; i < due.length; i += size) {
    await Promise.all(
      due.slice(i, i + size).map(async booking => {
        let sent = false;
        try {
          sent = await deps.send(booking);
        } catch (e) {
          log(`Reminder for ${booking.ref} threw`, e);
        }
        if (!sent) {
          summary.failed += 1;
          summary.failedRefs.push(booking.ref);
          return;
        }
        summary.sent += 1;
        try {
          await deps.markSent(booking.id);
        } catch (e) {
          // The SMS went, but the next run may send it again. Better twice than never.
          log(`Reminder for ${booking.ref} sent but not marked`, e);
        }
      }),
    );
  }
  return summary;
}
