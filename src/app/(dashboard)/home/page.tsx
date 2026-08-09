import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Users, ClipboardList, FileText, Settings } from "lucide-react";

const MENU_ITEMS = [
  { href: "/squad", label: "Squad", icon: Users },
  { href: "/sessions", label: "Sessions", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = (user?.user_metadata?.full_name as string) ?? "coach";

  const { data: team } = await supabase
    .from("teams")
    .select("name, age_band")
    .eq("coach_id", user!.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Welcome, {name}</h1>
        <p className="text-white/70">
          {team?.name} &middot; {team?.age_band}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {MENU_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="block">
            <Card className="flex flex-col items-center justify-center gap-2 py-8 transition-colors hover:bg-muted/50">
              <Icon className="size-8 text-primary" />
              <span className="text-base font-medium">{label}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
