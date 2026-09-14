import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { NavBar } from "@/components/nav-bar";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    data: { user },
  } = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("coach_id", user.id)
    .maybeSingle();

  if (!team) {
    redirect("/onboarding/team");
  }

  const userName = (user.user_metadata?.full_name as string) ?? "";

  return (
    <div className="pitch-bg min-h-screen">
      <NavBar userName={userName} />
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}
