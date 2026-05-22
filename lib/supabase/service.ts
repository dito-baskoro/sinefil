import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. ONLY use server-side in server actions or
 * route handlers where you need to bypass RLS (e.g. upserting movies into
 * the cache table). Uses the plain JS client so no user session cookie
 * overrides the service-role key.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
