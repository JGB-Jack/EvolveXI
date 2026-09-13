import { Image, View } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";

export function PdfLogo() {
  return (
    <View style={{ alignItems: "center" }}>
      <Image src="/evolvexi-logo.png" style={pdfStyles.logo} />
    </View>
  );
}
