// Shapes the dashboard's Server Actions send back. Types only, safe on both sides of the boundary.

export type FormResult = {
  ok?: boolean;
  // A sentence for the person: what happened, or what went wrong and how to fix it.
  message?: string;
  // Field name -> what's wrong with it.
  errors?: Record<string, string>;
} | null;

// The business form's starting values, as plain data for the client.
export interface BusinessFormValues {
  name: string;
  categoryId: string;
  areaId: string;
  blurb: string;
  address: string;
  phone: string; // as typed or pretty, e.g. "0772 123 456"
  visitMode: "salon" | "both" | "mobile";
  homeVisitFee: number;
  opensAt: string;
  closesAt: string;
  closedDays: number[];
  acceptsCash: boolean;
  skipProfessional: boolean;
  coverWord: string;
  palette: [string, string, string];
}
