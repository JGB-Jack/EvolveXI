import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { ReportContent } from "@/lib/claude/report";
import type { ParentReportContent } from "@/lib/claude/parent-report";
import { pdfStyles } from "./styles";
import { RadarChart } from "./radar-chart";
import { LineChart } from "./line-chart";

const PILLAR_NAME: Record<string, string> = {
  technical: "Technical",
  physical: "Physical",
  tactical: "Tactical",
  psychological: "Psychological",
  social: "Social",
};
const PILLAR_ORDER = ["technical", "physical", "tactical", "psychological", "social"];

function sortByPillarOrder<T extends { pillar_id: string }>(pillars: T[]): T[] {
  return [...pillars].sort(
    (a, b) => PILLAR_ORDER.indexOf(a.pillar_id) - PILLAR_ORDER.indexOf(b.pillar_id),
  );
}

export function ReportDocument({
  playerName,
  position,
  view,
  content,
  pillarAverages,
  currentDevelopment,
  scoreHistory,
}: {
  playerName: string;
  position: string;
  view: "coach" | "parent";
  content: ReportContent | ParentReportContent;
  pillarAverages: Record<string, number>;
  currentDevelopment: { pillarId: string; score: number }[];
  scoreHistory: { date: string; score: number }[];
}) {
  const isCoach = view === "coach";
  const trainingFocus = "trainingFocus" in content ? content.trainingFocus : null;

  return (
    <Document title={`${playerName} - ${isCoach ? "Coach" : "Parent"} report`}>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.brand}>EvolveXI</Text>
        <Text style={pdfStyles.title}>{playerName}</Text>
        <View style={pdfStyles.metaRow}>
          <Text style={pdfStyles.metaItem}>{position}</Text>
          <Text style={pdfStyles.metaItem}>{isCoach ? "Coach report" : "Parent report"}</Text>
        </View>

        <Text style={pdfStyles.fieldLabel}>Summary</Text>
        <Text style={pdfStyles.fieldValue}>{content.summary}</Text>

        {sortByPillarOrder(content.pillars).map((p) => (
          <View key={p.pillar_id} wrap={false}>
            <Text style={pdfStyles.fieldLabel}>
              {(PILLAR_NAME[p.pillar_id] ?? p.pillar_id) +
                ` (${(pillarAverages[p.pillar_id] ?? 0).toFixed(1)}/5)`}
            </Text>
            <Text style={pdfStyles.fieldValue}>{p.narrative}</Text>
          </View>
        ))}

        <Text style={pdfStyles.fieldLabel}>Key strengths</Text>
        {content.strengths.map((s, i) => (
          <Text key={i} style={pdfStyles.fieldValue}>
            {"• " + s}
          </Text>
        ))}

        <Text style={pdfStyles.fieldLabel}>
          {isCoach ? "Development priorities" : "Things to work on"}
        </Text>
        {content.priorities.map((p, i) => (
          <View key={i} wrap={false} style={{ marginBottom: 8 }}>
            <Text style={{ ...pdfStyles.fieldValue, marginBottom: 2 }}>
              {`${i + 1}. ${p.text}`}
            </Text>
            <Text style={pdfStyles.fieldValue}>
              {"selfPractice" in p ? p.selfPractice : p.practice}
            </Text>
          </View>
        ))}

        {isCoach && trainingFocus && (
          <>
            <Text style={pdfStyles.fieldLabel}>Recommended training focus</Text>
            <Text style={pdfStyles.fieldValue}>{trainingFocus}</Text>
          </>
        )}

        {currentDevelopment.length > 0 && (
          <View wrap={false} style={{ marginTop: 8 }}>
            <View style={pdfStyles.divider} />
            <Text style={pdfStyles.sectionLabel}>Current development</Text>
            <View style={{ alignItems: "center" }}>
              <RadarChart
                data={currentDevelopment.map(({ pillarId, score }) => ({
                  pillar: PILLAR_NAME[pillarId] ?? pillarId,
                  score,
                }))}
              />
            </View>
          </View>
        )}

        {scoreHistory.length >= 2 && (
          <View wrap={false} style={{ marginTop: 8 }}>
            <Text style={pdfStyles.sectionLabel}>Season trend</Text>
            <View style={{ alignItems: "center" }}>
              <LineChart data={scoreHistory} />
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
