"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmHandler />
    </Suspense>
  );
}

function ConfirmHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();
      const next = searchParams.get("next") ?? "/home";

      // Supabase's default (uneditable without custom SMTP) email template
      // uses the implicit flow: session tokens arrive in the URL fragment,
      // which is never sent to a server — only client-side JS can read it.
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (!cancelled && !error) {
          router.replace(next);
          return;
        }
      }

      // PKCE flow: ?code=... (used if the project's flow type changes).
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled && !error) {
          router.replace(next);
          return;
        }
      }

      // Custom template flow: ?token_hash=...&type=... (if custom SMTP is
      // ever set up and the templates are edited to use this format).
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as "email" | "recovery",
        });
        if (!cancelled && !error) {
          router.replace(next);
          return;
        }
      }

      if (!cancelled) {
        router.replace("/login?confirmed=1");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Confirming...</p>
    </div>
  );
}
