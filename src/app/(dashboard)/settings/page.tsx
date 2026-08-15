import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your team&apos;s question bank. Team and account settings are
          coming soon.
        </p>
      </div>

      <Link href="/settings/questions" className="block">
        <Card className="transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle>Question bank</CardTitle>
            <CardDescription>
              View, edit, or add custom questions for any pillar.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      <Card className="opacity-70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Profile set up</CardTitle>
            <CardDescription>
              Edit your name, personal details, and team info.
            </CardDescription>
          </div>
          <Badge className="bg-amber-500 text-white dark:bg-amber-600">
            Coming soon
          </Badge>
        </CardHeader>
      </Card>

      <Card className="opacity-70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Club set up</CardTitle>
            <CardDescription>
              Add your club motif to appear on reports.
            </CardDescription>
          </div>
          <Badge className="bg-amber-500 text-white dark:bg-amber-600">
            Coming soon
          </Badge>
        </CardHeader>
      </Card>

      <Card className="opacity-70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>FAQs</CardTitle>
            <CardDescription>
              Answers to common questions about using EvolveXI.
            </CardDescription>
          </div>
          <Badge className="bg-amber-500 text-white dark:bg-amber-600">
            Coming soon
          </Badge>
        </CardHeader>
      </Card>
    </div>
  );
}
