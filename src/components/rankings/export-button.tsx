"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadWorkbook } from "@/lib/excel/download-workbook";
import { withTimeout } from "@/lib/utils";

const POSITION_LABEL: Record<string, string> = {
  defence: "Defence",
  midfield: "Midfield",
  attack: "Attack",
  goalkeeper: "Goalkeeper",
};

type Player = {
  playerId: string;
  name: string;
  position: string;
  squadNumber: number | null;
  overall: number;
  pillarAverages: Record<string, number | null>;
};

export function ExportButton({
  players,
  pillars,
}: {
  players: Player[];
  pillars: { id: string; name: string }[];
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleExport() {
    setDownloading(true);
    try {
      await withTimeout(
        downloadWorkbook("evolvexi-rankings.xlsx", [
          {
            name: "Rankings",
            columns: [
              { header: "Player", key: "name" },
              { header: "Position", key: "position" },
              { header: "Squad number", key: "squadNumber", width: 12 },
              { header: "Overall", key: "overall", width: 12 },
              ...pillars.map((p) => ({ header: p.name, key: p.id, width: 12 })),
            ],
            rows: players.map((p) => ({
              name: p.name,
              position: POSITION_LABEL[p.position] ?? p.position,
              squadNumber: p.squadNumber,
              overall: Math.round(p.overall * 100) / 100,
              ...Object.fromEntries(
                pillars.map((pillar) => [
                  pillar.id,
                  p.pillarAverages[pillar.id] ?? null,
                ]),
              ),
            })),
          },
        ]),
        15000,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export rankings.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="icon-lg"
      onClick={handleExport}
      disabled={downloading}
      aria-label="Export"
    >
      <Download className="size-5" />
    </Button>
  );
}
