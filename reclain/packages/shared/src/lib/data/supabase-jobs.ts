// The job log (supabase back end). Being built: every call says so until it is.
import { DataError } from "./errors";
import type { JobsSource } from "./source";

const soon = (): never => {
  throw new DataError("unavailable", "The job log isn't switched on yet.");
};

export const supabaseJobs: JobsSource = {
  async listJobEvents() {
    return soon();
  },
  async addJobEvent() {
    return soon();
  },
  async addJobPhoto() {
    return soon();
  },
};
