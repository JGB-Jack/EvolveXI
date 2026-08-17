"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => toast.info("Exporting rankings is coming soon")}
    >
      <Download className="size-4" />
      Export
    </Button>
  );
}
