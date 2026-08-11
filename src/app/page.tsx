import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="text-6xl font-bold tracking-tight text-primary">
        EvolveXI
      </span>
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
        Grassroots youth football coach: Watch, assess, and develop players
        across 5 pillars with detailed, AI-assisted player development
        reports.
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
