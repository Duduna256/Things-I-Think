// Crew and equipment (demo back end). Being built: every call says so until it is.
import { DataError } from "./errors";
import type { CapacitySource } from "./source";

const soon = (): never => {
  throw new DataError("unavailable", "Crew and equipment isn't switched on yet.");
};

export const demoCapacity: CapacitySource = {
  async listResources() {
    return soon();
  },
  async upsertResource() {
    return soon();
  },
  async deleteResource() {
    return soon();
  },
  async getServiceNeeds() {
    return soon();
  },
  async getBusyResources() {
    return soon();
  },
};
