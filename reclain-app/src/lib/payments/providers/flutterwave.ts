import "server-only";
import type { PaymentProvider } from "../types";

// Placeholder: replaced by the Flutterwave integration.
export const flutterwaveProvider: PaymentProvider = {
  name: "flutterwave",
  async start() {
    throw new Error("Flutterwave isn't set up yet.");
  },
  async verify() {
    throw new Error("Flutterwave isn't set up yet.");
  },
};
