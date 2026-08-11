import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/nav-bar";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("coach_id", user.id)
    .maybeSingle();

  if (!team) {
    redirect("/onboarding/team");
  }

  return (
    <div className="pitch-bg min-h-screen">
      <NavBar />
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}
