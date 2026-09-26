"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Supabase sends a coach back to the site root with error details in the URL
// when an email link has expired or already been used - without this they
// just see the landing page with no explanation.
export function AuthLinkErrorBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    if (hashParams.get("error_code") || queryParams.get("error_code")) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md space-y-3 rounded-lg border bg-card p-4 text-left text-sm shadow-lg">
      <p className="font-medium">That email link has expired</p>
      <p className="text-muted-foreground">
        Email links only work once, and some email providers use them up
        before you get to click. If you&apos;ve already confirmed your email,
        just log in with your password.
      </p>
      <Button render={<Link href="/login" />} size="sm">
        Go to log in
      </Button>
    </div>
  );
}
