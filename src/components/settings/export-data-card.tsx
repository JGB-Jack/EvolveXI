"use client";

import { useState } from "react";
import { toast } from "sonner";
import { exportTeamData } from "@/lib/actions/export";
import { withTimeout } from "@/lib/utils";
import { downloadWorkbook } from "@/lib/excel/download-workbook";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Download, FileSpreadsheet } from "lucide-react";

export function ExportDataCard() {
  const [downloading, setDownloading] = useState(false);

  async function handleExport() {
    setDownloading(true);
    try {
      const result = await withTimeout(exportTeamData(), 15000);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      await downloadWorkbook("evolvexi-export.xlsx", [
        {
          name: "Players",
          columns: [
            { header: "First name", key: "firstName" },
            { header: "Last name", key: "lastName" },
            { header: "Squad number", key: "squadNumber", width: 12 },
            { header: "Primary position", key: "primaryPosition" },
            { header: "Secondary position", key: "secondaryPosition" },
            { header: "Date of birth", key: "dob" },
            { header: "Gender", key: "gender" },
            { header: "Active", key: "active", width: 10 },
          ],
          rows: result.players,
        },
        {
          name: "Sessions & Ratings",
          columns: [
            { header: "Session date", key: "sessionDate" },
            { header: "Session type", key: "sessionType" },
            { header: "Opponent", key: "opponent" },
            { header: "Player first name", key: "playerFirstName" },
            { header: "Player last name", key: "playerLastName" },
            { header: "Position played", key: "positionPlayed" },
            { header: "Pillar", key: "pillar" },
            { header: "Question", key: "question", width: 50 },
            { header: "Score", key: "score", width: 10 },
          ],
          rows: result.ratings,
        },
        {
          name: "Session Overall Scores",
          columns: [
            { header: "Session date", key: "sessionDate" },
            { header: "Session type", key: "sessionType" },
            { header: "Opponent", key: "opponent" },
            { header: "Player first name", key: "playerFirstName" },
            { header: "Player last name", key: "playerLastName" },
            { header: "Position played", key: "positionPlayed" },
            { header: "Overall score", key: "overallScore", width: 14 },
          ],
          rows: result.sessionOverallScores,
        },
        {
          name: "Squad Rankings",
          columns: [
            { header: "Player first name", key: "playerFirstName" },
            { header: "Player last name", key: "playerLastName" },
            { header: "Squad number", key: "squadNumber", width: 12 },
            { header: "Position", key: "position" },
            { header: "Overall score", key: "overallScore", width: 14 },
            { header: "Technical", key: "technical", width: 12 },
            { header: "Physical", key: "physical", width: 12 },
            { header: "Tactical", key: "tactical", width: 12 },
            { header: "Psychological", key: "psychological", width: 14 },
            { header: "Social", key: "social", width: 12 },
          ],
          rows: result.squadRankings,
        },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export data.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card className="border-b-2 border-b-primary">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="primary-gradient flex size-7 shrink-0 items-center justify-center rounded-md text-primary-foreground">
            <FileSpreadsheet className="size-4" />
          </span>
          <CardTitle>Export data</CardTitle>
        </div>
        <CardDescription>
          Download all your players, sessions, and ratings as an Excel
          workbook.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleExport} disabled={downloading}>
          <Download className="size-4" />
          {downloading ? "Preparing..." : "Download"}
        </Button>
      </CardContent>
    </Card>
  );
}
