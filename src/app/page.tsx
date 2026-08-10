import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="text-3xl font-semibold tracking-tight text-primary">
        EvolveXI
      </span>
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight">
        Watch. Assess. Develop.
      </h1>
      <p className="max-w-md text-muted-foreground">
        The player assessment app that guides grassroots football coaches to
        what good looks like - from U6 to U17.
      </p>
      <div className="flex gap-3">
        <Button render={<Link href="/register" />} size="lg">
          Start for free
        </Button>
        <Button render={<Link href="/login" />} size="lg" variant="outline">
          Log in
        </Button>
      </div>
    </div>
  );
}
