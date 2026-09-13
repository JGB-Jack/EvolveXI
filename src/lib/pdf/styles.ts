import { StyleSheet } from "@react-pdf/renderer";

// Hex equivalents of the app's oklch theme tokens (globals.css) -
// react-pdf can't resolve CSS variables or oklch() at render time.
export const PDF_COLORS = {
  primary: "#8f4ecc",
  foreground: "#0a0a0a",
  mutedForeground: "#737373",
  border: "#e5e5e5",
};

export const pdfStyles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: PDF_COLORS.foreground,
  },
  brand: {
    fontSize: 10,
    fontWeight: 700,
    color: PDF_COLORS.primary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: PDF_COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 10,
  },
  metaItem: {
    fontSize: 10,
    color: PDF_COLORS.mutedForeground,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: PDF_COLORS.mutedForeground,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 1.4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.border,
    marginVertical: 14,
  },
});
