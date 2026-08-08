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

  const name = (user.user_metadata?.full_name as string) ?? "";

  return (
    <div className="min-h-screen bg-muted/30">
      <NavBar name={name} email={user.email ?? ""} />
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}
