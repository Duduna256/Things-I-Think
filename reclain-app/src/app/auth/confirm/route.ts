import type { NextRequest } from "next/server";
import { finishLogin } from "../callback/finish";

// For custom Supabase email templates (confirm sign-up, magic link) that link here with
// ?token_hash=&type=&next=. Unlike ?code= links, these work on any device or browser.
export async function GET(request: NextRequest) {
  return finishLogin(request);
}
