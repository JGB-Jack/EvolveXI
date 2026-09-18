import ExcelJS from "exceljs";

export type WorkbookSheet = {
  name: string;
  columns: { header: string; key: string; width?: number }[];
  rows: Record<string, string | number | boolean | null>[];
};

// Builds a multi-tab .xlsx workbook client-side and triggers a
// save-to-device download - unlike the PDF reports (meant to be viewed/
// shared), an export is meant to be saved and opened later in a
// spreadsheet app.
export async function downloadWorkbook(
  filename: string,
  sheets: WorkbookSheet[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    worksheet.columns = sheet.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 18,
    }));
    worksheet.getRow(1).font = { bold: true };
    worksheet.addRows(sheet.rows);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
