// Run: node --import tsx --test src/app/api/cron/reminders/run.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Booking } from "@shared/lib/types";
import { checkCronAuth, reminderWindow, runReminders } from "./run";

test("the window is tomorrow in Kampala, from midnight to midnight", () => {
  // 15:00 UTC on Monday 12 October is 18:00 in Kampala: the cron's usual time.
  assert.deepEqual(reminderWindow(new Date("2026-10-12T15:00:00Z")), {
    date: "2026-10-13",
    fromIso: "2026-10-12T21:00:00.000Z",
    toIso: "2026-10-13T21:00:00.000Z",
  });
  // 21:30 UTC is already 00:30 on the 13th in Kampala, so "tomorrow" is the 14th.
  assert.equal(reminderWindow(new Date("2026-10-12T21:30:00Z")).date, "2026-10-14");
  // Month end.
  assert.equal(reminderWindow(new Date("2026-10-31T10:00:00Z")).date, "2026-11-01");
});

test("cron auth wants the exact bearer secret", () => {
  assert.deepEqual(checkCronAuth("Bearer s3cret", "s3cret", false), { ok: true });
  assert.equal(checkCronAuth("Bearer wrong", "s3cret", false).ok, false);
  assert.equal(checkCronAuth("s3cret", "s3cret", false).ok, false);
  assert.equal(checkCronAuth(null, "s3cret", false).ok, false);
  const wrong = checkCronAuth("Bearer wrong", "s3cret", true);
  assert.ok(!wrong.ok && wrong.status === 401, "demo mode still checks a secret that is set");
});

test("without CRON_SECRET the job is locked, except in demo mode", () => {
  const live = checkCronAuth(null, "", false);
  assert.ok(!live.ok && live.status === 503);
  assert.ok(!live.ok && /CRON_SECRET/.test(live.error));
  assert.deepEqual(checkCronAuth(null, "", true), { ok: true });
});

const booking = (id: string, over: Partial<Booking> = {}) => ({ id, ref: `RCL-${id}`, status: "confirmed", reminderSentAt: null, ...over }) as Booking;

test("switched off: nothing is looked up or sent", async () => {
  let looked = false;
  const r = await runReminders(new Date("2026-10-12T15:00:00Z"), {
    enabled: false,
    listDue: async () => {
      looked = true;
      return [];
    },
    send: async () => true,
    claim: async () => true,
    release: async () => undefined,
  });
  assert.equal(looked, false);
  assert.equal(r.sent, 0);
  assert.ok(r.skipped);
});

test("claims each reminder, sends it, and releases the ones that failed", async () => {
  const claimed = new Set<string>();
  const released: string[] = [];
  let asked: [string, string] | null = null;
  const r = await runReminders(new Date("2026-10-12T15:00:00Z"), {
    enabled: true,
    listDue: async (from, to) => {
      asked = [from, to];
      return [
        booking("a"),
        booking("b"),
        booking("c"),
        booking("d", { reminderSentAt: "2026-10-12T15:00:00Z" }), // already done
        booking("e", { status: "cancelled" }), // not happening
        booking("f"),
      ];
    },
    send: async b => {
      if (b.id === "b") return false;
      if (b.id === "c") throw new Error("gateway down");
      return true;
    },
    claim: async id => {
      if (id === "f") throw new Error("database blip");
      if (claimed.has(id)) return false;
      claimed.add(id);
      return true;
    },
    release: async id => {
      released.push(id);
    },
    log: () => undefined,
  });
  assert.deepEqual(asked, ["2026-10-12T21:00:00.000Z", "2026-10-13T21:00:00.000Z"]);
  assert.equal(r.date, "2026-10-13");
  assert.equal(r.due, 4);
  assert.equal(r.sent, 1);
  assert.equal(r.failed, 3);
  assert.deepEqual(r.failedRefs.sort(), ["RCL-b", "RCL-c", "RCL-f"]);
  assert.deepEqual(released.sort(), ["b", "c"], "failed sends are released for the next run");
});

test("two runs at the same time text each person once", async () => {
  const stamped = new Set<string>();
  const texts: string[] = [];
  const deps = {
    enabled: true,
    listDue: async () => [booking("a"), booking("b")],
    send: async (b: Booking) => {
      await new Promise(res => setTimeout(res, 2));
      texts.push(b.id);
      return true;
    },
    // Like the database's "update ... where reminder_sent_at is null returning id".
    claim: async (id: string) => {
      await new Promise(res => setTimeout(res, 1));
      if (stamped.has(id)) return false;
      stamped.add(id);
      return true;
    },
    release: async (id: string) => {
      stamped.delete(id);
    },
  };
  const now = new Date("2026-10-12T15:00:00Z");
  const [x, y] = await Promise.all([runReminders(now, deps), runReminders(now, deps)]);
  assert.deepEqual(texts.sort(), ["a", "b"]);
  assert.equal(x.sent + y.sent, 2);
  assert.equal(x.alreadyTaken + y.alreadyTaken, 2);
});

test("sends a few at a time", async () => {
  let inFlight = 0;
  let most = 0;
  const due = Array.from({ length: 12 }, (_, i) => booking(String(i)));
  const r = await runReminders(new Date("2026-10-12T15:00:00Z"), {
    enabled: true,
    concurrency: 3,
    listDue: async () => due,
    send: async () => {
      inFlight += 1;
      most = Math.max(most, inFlight);
      await new Promise(res => setTimeout(res, 2));
      inFlight -= 1;
      return true;
    },
    claim: async () => true,
    release: async () => undefined,
  });
  assert.equal(r.sent, 12);
  assert.equal(most, 3);
});
