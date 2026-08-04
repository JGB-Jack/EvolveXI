"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addCustomQuestion } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function AddQuestionButton({
  teamId,
  pillarId,
  variant,
}: {
  teamId: string;
  pillarId: string;
  variant: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await addCustomQuestion(teamId, pillarId, variant);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add question");
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={loading}
    >
      <Plus className="size-4" />
      Add custom question
    </Button>
  );
}
