import type { NextRequest } from "next/server";
import { finishLogin } from "@shared/auth/finish";

// Supabase sends people here from an email link or from Google, with ?code= and our ?next=.
// We swap the code for a session (setting the log-in cookies) and carry on to `next`.
export async function GET(request: NextRequest) {
  return finishLogin(request);
}
