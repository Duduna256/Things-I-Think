// What the log-in, sign-up and account forms accept. Shared by the Server Actions and the tests.

import { z } from "zod";
import { normalizeMsisdn } from "../../lib/phone";

export const PHONE_ERROR = "That doesn't look like a Ugandan mobile number. Try 0772 123 456.";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(254, "That email address is too long. Check it and try again.")
  .pipe(z.email("That email address doesn't look right. Try something like grace@example.com."));

// One space between words, no stray spaces at the ends.
const tidy = (s: string) => s.replace(/\s+/g, " ").trim();

const name = z
  .string()
  .max(200, "That name is a bit long. Keep it under 80 letters.")
  .transform(tidy)
  .pipe(z.string().min(2, "Add your name, so your pro knows who's coming.").max(80, "That name is a bit long. Keep it under 80 letters."));

const optionalName = z
  .string()
  .max(200, "That name is a bit long. Keep it under 80 letters.")
  .transform(tidy)
  .pipe(z.string().max(80, "That name is a bit long. Keep it under 80 letters."));

// Empty means "no phone". Anything else must be a Ugandan mobile number, stored as 9 digits.
const phone = z
  .string()
  .trim()
  .max(30, PHONE_ERROR)
  .transform((value, ctx) => {
    if (!value) return null;
    const msisdn = normalizeMsisdn(value);
    if (!msisdn) {
      ctx.addIssue({ code: "custom", message: PHONE_ERROR });
      return z.NEVER;
    }
    return msisdn;
  });

const currentPassword = z.string().min(1, "Enter your password.").max(200, "That password is too long. Check it and try again.");
const newPassword = z
  .string()
  .min(8, "Use at least 8 characters for your password.")
  .max(72, "Keep your password under 72 characters.")
  .refine(p => p.trim().length > 0, "A password made of spaces won't keep anyone out. Add some letters and numbers.");

export const linkSchema = z.object({ email, name: optionalName });
export const loginSchema = z.object({ email, password: currentPassword });
// Keys in the order the form shows them, so the first problem reported is the first on screen.
export const signupSchema = z.object({ name, phone, email, password: newPassword });
export const profileSchema = z.object({ fullName: name, phone });

// A form value as text. Missing fields and files count as "".
export function formText(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

// What someone typed, trimmed and cut short enough to send back to the form after an error.
// Every limit above is under 300, so checking the clipped value refuses the same things.
export function typed(fd: FormData, key: string): string {
  return formText(fd, key).trim().slice(0, 300);
}

export function firstIssue(error: z.ZodError): { field: string; message: string } {
  const issue = error.issues[0];
  return { field: String(issue?.path[0] ?? ""), message: issue?.message ?? "Check the form and try again." };
}
