import "server-only";
import { isDemo } from "../env";
import { demoSource } from "./demo";
import { supabaseSource } from "./supabase";
import type { DataSource } from "./source";

// The one object screens use to talk to the back end: `import { data } from "@/lib/data"`.
export const data: DataSource = isDemo ? demoSource : supabaseSource;

export { DataError, isDataError } from "./errors";
