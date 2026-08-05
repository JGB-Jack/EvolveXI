import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your team&apos;s question bank. Team and account settings are
          coming soon.
        </p>
      </div>

      <Link href="/settings/questions" className="block">
        <Card className="transition-colors hover:bg-muted/50">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Question bank</CardTitle>
              <CardDescription>
                View, edit, or add custom questions for any pillar.
              </CardDescription>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}
