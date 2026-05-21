import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Service-role Supabase client. ONLY use server-side in server actions or
 * route handlers where you need to bypass RLS (e.g. upserting movies into
 * the cache table).
 */
export async function createServiceClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // service-role client doesn't need to set cookies
        },
      },
    }
  );
}
