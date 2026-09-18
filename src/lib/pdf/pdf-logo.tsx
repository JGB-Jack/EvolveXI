import { Image, View } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";

export function PdfLogo({ clubLogoUrl }: { clubLogoUrl?: string | null }) {
  if (!clubLogoUrl) {
    return (
      <View style={{ alignItems: "center" }}>
        <Image src="/evolvexi-logo.png" style={pdfStyles.logo} />
      </View>
    );
  }

  return (
    <View style={pdfStyles.logoRow}>
      <Image src="/evolvexi-logo.png" style={pdfStyles.logo} />
      <Image src={clubLogoUrl} style={pdfStyles.logo} />
    </View>
  );
}
