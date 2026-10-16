import type { Area } from "./types";

// "Ntinda, Kampala", or just "Kampala" when the area is the region itself.
export function placeName(area: Area | undefined): string {
  if (!area) return "";
  return area.region === area.name ? area.name : `${area.name}, ${area.region}`;
}
