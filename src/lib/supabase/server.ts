import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component; middleware refreshes
            // the session, so this can be safely ignored here.
          }
        },
      },
    },
  );
}

// getUser() always makes a real network call to Supabase's Auth API (it
// deliberately never trusts a local cookie, unlike getSession()) - the
// dashboard layout and every page under it each called it independently,
// tripling that round-trip on every single navigation. React's cache()
// deduplicates identical calls within one request, so they now share a
// single network call instead of three.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getUser();
});
