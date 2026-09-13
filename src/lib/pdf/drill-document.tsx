import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { DrillOutput } from "@/lib/claude/drill";
import { pdfStyles } from "./styles";

export function DrillDocument({ drill }: { drill: DrillOutput }) {
  return (
    <Document title={drill.name}>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.brand}>EvolveXI</Text>
        <Text style={pdfStyles.title}>{drill.name}</Text>

        <View style={pdfStyles.metaRow}>
          <Text style={pdfStyles.metaItem}>{drill.duration}</Text>
          <Text style={pdfStyles.metaItem}>{drill.format}</Text>
        </View>

        <Text style={pdfStyles.fieldLabel}>Objective</Text>
        <Text style={pdfStyles.fieldValue}>{drill.target}</Text>

        <Text style={pdfStyles.fieldLabel}>Setup</Text>
        <Text style={pdfStyles.fieldValue}>{drill.setup}</Text>

        <Text style={pdfStyles.fieldLabel}>Rule</Text>
        <Text style={pdfStyles.fieldValue}>{drill.constraint}</Text>

        <Text style={pdfStyles.fieldLabel}>Coaching point</Text>
        <Text style={pdfStyles.fieldValue}>{drill.coachingPoint}</Text>
      </Page>
    </Document>
  );
}
