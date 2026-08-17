"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportButton() {
  return (
    <Button
      variant="outline"
      size="icon-lg"
      onClick={() => toast.info("Exporting rankings is coming soon")}
      aria-label="Export"
    >
      <Download className="size-5" />
    </Button>
  );
}
