// Verification (demo back end). Being built: every call says so until it is.
import { DataError } from "./errors";
import type { VerificationSource } from "./source";

const soon = (): never => {
  throw new DataError("unavailable", "Verification isn't switched on yet.");
};

export const demoVerification: VerificationSource = {
  async listChecks() {
    return soon();
  },
  async submitCheck() {
    return soon();
  },
  async getEvidenceUrl() {
    return soon();
  },
  async adminReviewCheck() {
    return soon();
  },
  async adminSetTier() {
    return soon();
  },
};
