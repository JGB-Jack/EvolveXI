"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

type Status = "working" | "ready" | "verifying" | "failed";

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
  const [status, setStatus] = useState<Status>("working");

  const next = searchParams.get("next") ?? "/home";
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();

      // Supabase's default (uneditable without custom SMTP) email template
      // uses the implicit flow: session tokens arrive in the URL fragment,
      // which is never sent to a server — only client-side JS can read it.
      const hashParams = new URLSearchParams(window.location.hash.slice(1));

      // Supabase hands back an error (link expired or already used) in the
      // same places it would hand back tokens.
      if (
        hashParams.get("error_code") ||
        hashParams.get("error") ||
        searchParams.get("error_code")
      ) {
        if (!cancelled) setStatus("failed");
        return;
      }

      // Custom-template flow: ?token_hash=...&type=... The link is NOT
      // verified on load - the coach has to press the button. Email
      // security scanners open links automatically, and would otherwise use
      // up the one-time token before the coach ever clicks it.
      if (token_hash && type) {
        if (!cancelled) setStatus("ready");
        return;
      }

      let attempted = false;

      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");
      if (access_token && refresh_token) {
        attempted = true;
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
        attempted = true;
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled && !error) {
          router.replace(next);
          return;
        }
      }

      if (cancelled) return;
      if (attempted) {
        setStatus("failed");
      } else {
        router.replace("/login?confirmed=1");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams, token_hash, type, next]);

  async function handleConfirm() {
    setStatus("verifying");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token_hash ?? "",
      type: type as "email" | "recovery",
    });
    if (error) {
      setStatus("failed");
      return;
    }
    router.replace(next);
  }

  if (status === "working") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Confirming...</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>This link has expired</CardTitle>
            <CardDescription>
              Email links only work once, and some email providers use them
              up before you get to click. If you&apos;ve already confirmed
              your email, just log in with your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button render={<Link href="/login" />} className="w-full">
              Go to log in
            </Button>
            <p className="text-sm text-muted-foreground">
              Still stuck? Choose &quot;Forgot password?&quot; on the log in
              page to get a fresh link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isRecovery = type === "recovery";
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {isRecovery ? "Reset your password" : "Confirm your email"}
          </CardTitle>
          <CardDescription>
            {isRecovery
              ? "Press the button to continue and choose a new password."
              : "Press the button to finish setting up your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleConfirm}
            disabled={status === "verifying"}
            className="w-full"
          >
            {status === "verifying"
              ? "Confirming..."
              : isRecovery
                ? "Continue"
                : "Confirm my email"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
