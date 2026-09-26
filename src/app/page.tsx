import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthLinkErrorBanner } from "@/components/auth-link-error-banner";

export default function LandingPage() {
  return (
    <div className="pitch-bg flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <AuthLinkErrorBanner />
      <Image
        src="/evolvexi-logo.png"
        alt="EvolveXI"
        width={112}
        height={112}
        priority
        className="fade-in-step"
      />
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight">
        <span
          className="fade-in-step inline-block"
          style={{ animationDelay: "0.9s" }}
        >
          Watch.
        </span>{" "}
        <span
          className="fade-in-step inline-block"
          style={{ animationDelay: "1.8s" }}
        >
          Assess.
        </span>{" "}
        <span
          className="fade-in-step inline-block"
          style={{ animationDelay: "2.7s" }}
        >
          Develop.
        </span>
      </h1>
      <p
        className="fade-in-step max-w-md text-muted-foreground"
        style={{ animationDelay: "3.6s" }}
      >
        Built for grassroots football coaches: assess and develop players,
        get AI reports for coaches and parents, and turn to built-in AI
        tools for drills and sessions in seconds.
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
