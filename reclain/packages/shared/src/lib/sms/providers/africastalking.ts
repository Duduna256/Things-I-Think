// Africa's Talking bulk SMS. Docs: https://developers.africastalking.com/docs/sms/sending/bulk
// Username "sandbox" sends to the sandbox simulator instead of real phones.
//
// No "server-only" marker here so the unit tests can load it. It's only ever loaded through
// src/lib/sms/index.ts, which carries the marker, and the API key is read from serverEnv.

import { serverEnv } from "../../env";
import type { SmsProvider, SmsResult } from "../index";

export const AT_LIVE_URL = "https://api.africastalking.com/version1/messaging";
export const AT_SANDBOX_URL = "https://api.sandbox.africastalking.com/version1/messaging";
export const AT_TIMEOUT_MS = 15_000;

export interface AfricasTalkingConfig {
  username: string;
  apiKey: string;
  senderId: string;
}

export function messagingUrl(username: string): string {
  return username === "sandbox" ? AT_SANDBOX_URL : AT_LIVE_URL;
}

// The request Africa's Talking expects: a form post with the key in a header.
export function buildRequest(config: AfricasTalkingConfig, to: string, message: string): { url: string; init: RequestInit } {
  const form = new URLSearchParams({ username: config.username, to, message });
  if (config.senderId) form.set("from", config.senderId);
  return {
    url: messagingUrl(config.username),
    init: {
      method: "POST",
      headers: {
        apiKey: config.apiKey,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    },
  };
}

type Fields = Record<string, unknown>;
const isObject = (v: unknown): v is Fields => typeof v === "object" && v !== null && !Array.isArray(v);

// Reads the reply. Success means the first recipient's status is "Success".
export function parseResponse(httpStatus: number, body: unknown, text = ""): SmsResult {
  const smd = isObject(body) && isObject(body.SMSMessageData) ? body.SMSMessageData : null;
  const first = smd && Array.isArray(smd.Recipients) && isObject(smd.Recipients[0]) ? smd.Recipients[0] : null;
  if (first && first.status === "Success") {
    return { ok: true, providerRef: typeof first.messageId === "string" ? first.messageId : null };
  }
  if (first) {
    const code = first.statusCode !== undefined ? ` (${String(first.statusCode)})` : "";
    return { ok: false, providerRef: null, error: `Africa's Talking: ${String(first.status ?? "Not sent")}${code}` };
  }
  const message = smd && typeof smd.Message === "string" ? smd.Message : text.trim().slice(0, 200);
  return { ok: false, providerRef: null, error: `Africa's Talking HTTP ${httpStatus}${message ? `: ${message}` : ""}` };
}

export function createAfricasTalkingProvider(config: Partial<AfricasTalkingConfig> = {}): SmsProvider {
  const settings = (): AfricasTalkingConfig => ({
    username: config.username ?? serverEnv.africasTalkingUsername,
    apiKey: config.apiKey ?? serverEnv.africasTalkingApiKey,
    senderId: config.senderId ?? serverEnv.africasTalkingSenderId,
  });

  return {
    name: "africastalking",
    async send(to: string, body: string): Promise<SmsResult> {
      const cfg = settings();
      if (!cfg.username || !cfg.apiKey) {
        return { ok: false, providerRef: null, error: "AT_USERNAME and AT_API_KEY aren't set. Add them, or set SMS_PROVIDER=console." };
      }
      const { url, init } = buildRequest(cfg, to, body);
      let res: Response;
      try {
        res = await fetch(url, { ...init, signal: AbortSignal.timeout(AT_TIMEOUT_MS) });
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        const error =
          name === "TimeoutError" || name === "AbortError"
            ? `Africa's Talking didn't answer within ${AT_TIMEOUT_MS / 1000} seconds.`
            : `Couldn't reach Africa's Talking: ${e instanceof Error ? e.message : String(e)}`;
        return { ok: false, providerRef: null, error };
      }
      // Errors (a wrong key, say) come back as plain text, so read text first and parse it.
      const text = await res.text().catch(() => "");
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      return parseResponse(res.status, json, text);
    },
  };
}

export const africasTalkingProvider: SmsProvider = createAfricasTalkingProvider();
