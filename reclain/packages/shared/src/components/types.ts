export type FormResult = {
  ok?: boolean;
  // A sentence for the person: what happened, or what went wrong and how to fix it.
  message?: string;
  // Field name -> what's wrong with it.
  errors?: Record<string, string>;
} | null;
