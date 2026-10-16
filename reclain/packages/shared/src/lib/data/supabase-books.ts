// Money and books (supabase back end). Being built: every call says so until it is.
import { DataError } from "./errors";
import type { BooksSource } from "./source";

const soon = (): never => {
  throw new DataError("unavailable", "Money and books isn't switched on yet.");
};

export const supabaseBooks: BooksSource = {
  async listAccounts() {
    return soon();
  },
  async listEntries() {
    return soon();
  },
  async recordSpend() {
    return soon();
  },
  async listPayouts() {
    return soon();
  },
  async adminRecordPayout() {
    return soon();
  },
};
