import { pdf, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

export async function generateAndOpenPdf(
  pdfDocument: ReactElement<DocumentProps>,
): Promise<void> {
  const blob = await pdf(pdfDocument).toBlob();
  const url = URL.createObjectURL(blob);

  // A real anchor click (rather than window.open) is the most reliable way
  // to open a freshly-generated blob in a new tab across mobile browsers -
  // window.open from inside an async function gets treated as a popup on
  // iOS Safari, even right after a user tap.
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
