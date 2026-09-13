import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { SessionPlan } from "@/lib/claude/session-builder";
import { pdfStyles } from "./styles";

export function SessionDocument({ plan }: { plan: SessionPlan }) {
  return (
    <Document title="EvolveXI session plan">
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.brand}>EvolveXI</Text>
        <Text style={pdfStyles.title}>Your session</Text>

        <Text style={pdfStyles.sectionLabel}>1. Technical practice</Text>
        <Text style={pdfStyles.sectionTitle}>{plan.technicalPractice.name}</Text>
        <View style={pdfStyles.metaRow}>
          <Text style={pdfStyles.metaItem}>{plan.technicalPractice.duration}</Text>
          <Text style={pdfStyles.metaItem}>{plan.technicalPractice.format}</Text>
        </View>
        <Text style={pdfStyles.fieldLabel}>Setup</Text>
        <Text style={pdfStyles.fieldValue}>{plan.technicalPractice.setup}</Text>
        <Text style={pdfStyles.fieldLabel}>Rule</Text>
        <Text style={pdfStyles.fieldValue}>{plan.technicalPractice.constraint}</Text>
        <Text style={pdfStyles.fieldLabel}>Coaching point</Text>
        <Text style={pdfStyles.fieldValue}>{plan.technicalPractice.coachingPoint}</Text>

        <View style={pdfStyles.divider} />

        <Text style={pdfStyles.sectionLabel}>2. Small-sided game</Text>
        <Text style={pdfStyles.sectionTitle}>{plan.smallSidedGame.name}</Text>
        <View style={pdfStyles.metaRow}>
          <Text style={pdfStyles.metaItem}>{plan.smallSidedGame.duration}</Text>
          <Text style={pdfStyles.metaItem}>{plan.smallSidedGame.format}</Text>
        </View>
        <Text style={pdfStyles.fieldLabel}>Setup</Text>
        <Text style={pdfStyles.fieldValue}>{plan.smallSidedGame.setup}</Text>
        <Text style={pdfStyles.fieldLabel}>Coaching point</Text>
        <Text style={pdfStyles.fieldValue}>{plan.smallSidedGame.coachingPoint}</Text>
      </Page>
    </Document>
  );
}
