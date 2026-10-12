import "server-only";
import { serverEnv } from "../env";
import { data } from "../data";
import { internationalMsisdn, normalizeMsisdn } from "../phone";

export interface SmsResult {
  ok: boolean;
  providerRef: string | null;
  error?: string;
}

// Add a provider by writing one of these in providers/ and registering it below.
export interface SmsProvider {
  name: string;
  send(toInternational: string, body: string): Promise<SmsResult>;
}

const consoleProvider: SmsProvider = {
  name: "console",
  async send(to, body) {
    console.log(`[sms → ${to}] ${body}`);
    return { ok: true, providerRef: null };
  },
};

const providers: Record<string, () => Promise<SmsProvider>> = {
  console: async () => consoleProvider,
  africastalking: async () => (await import("./providers/africastalking")).africasTalkingProvider,
};

// Sends one SMS and records it in sms_log. Never throws: a failed SMS must not break a booking.
export async function sendSms(phone: string, body: string, meta: { kind: string; bookingId?: string | null }): Promise<SmsResult> {
  const msisdn = normalizeMsisdn(phone);
  if (!msisdn) return { ok: false, providerRef: null, error: "Not a Ugandan mobile number" };
  const provider = await (providers[serverEnv.smsProvider] ?? providers.console)();
  let result: SmsResult;
  try {
    result = await provider.send(internationalMsisdn(msisdn), body);
  } catch (e) {
    result = { ok: false, providerRef: null, error: e instanceof Error ? e.message : String(e) };
  }
  try {
    await data.server.logSms({
      bookingId: meta.bookingId ?? null,
      toPhone: msisdn,
      body,
      kind: meta.kind,
      provider: provider.name,
      status: result.ok ? "sent" : "failed",
      providerRef: result.providerRef,
      error: result.error ?? null,
    });
  } catch (e) {
    console.error("Couldn't write sms_log", e);
  }
  return result;
}
