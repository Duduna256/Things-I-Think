import "server-only";
import type { SmsProvider } from "../index";

// Placeholder: replaced by the Africa's Talking integration.
export const africasTalkingProvider: SmsProvider = {
  name: "africastalking",
  async send() {
    return { ok: false, providerRef: null, error: "Africa's Talking isn't set up yet." };
  },
};
