"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!agreedToPrivacy) {
      setError("Please confirm you've read the data notice below.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/home`,
      },
    });
    setLoading(false);

    if (error) {
      const status = (error as { status?: number }).status;
      let message: string;
      if (status && status >= 500) {
        // Supabase's SDK wraps 5xx responses as AuthRetryableFetchError and
        // its .message is a useless literal "{}" - it discards the real
        // reason from the server's response body. A signup 500 here is
        // almost always the confirmation email failing to send (e.g.
        // Resend's sandbox mode only allows sending to the account's own
        // verified address), so say that instead of showing "{}".
        message =
          "Couldn't send the confirmation email (server error). If you're using Resend in sandbox mode, it only allows sending to the account's own verified email - check your Resend dashboard.";
      } else {
        message =
          (typeof error.message === "string" && error.message) ||
          "Something went wrong creating your account. Please try again.";
      }
      setError(
        message.toLowerCase().includes("already registered")
          ? "An account with this email already exists."
          : message,
      );
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We&apos;ve sent a confirmation link to {email}. Click it to
              activate your account and continue.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your EvolveXI account</CardTitle>
          <CardDescription>
            Start assessing your squad in minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Data notice — pilot test period</p>
              <p className="mt-1">
                EvolveXI is currently in a short pilot test. Any data you
                enter — including player names and dates of birth — is
                stored only to run the app during this test, is not shared
                with anyone outside the pilot, and will be permanently
                deleted once the test period ends.
              </p>
            </div>
            <div
              onClick={() => setAgreedToPrivacy((v) => !v)}
              className="flex cursor-pointer items-start gap-2"
            >
              <Checkbox
                checked={agreedToPrivacy}
                className="pointer-events-none mt-0.5"
              />
              <span className="text-sm">
                I&apos;ve read the data notice above and agree to it.
              </span>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !agreedToPrivacy}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
