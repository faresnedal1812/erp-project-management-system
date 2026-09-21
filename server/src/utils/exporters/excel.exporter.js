/**
 * Excel Exporter
 * Converts an array of flat objects to an .xlsx Buffer using exceljs.
 * Each key becomes a styled header column.
 */

import ExcelJS from "exceljs";

/**
 * @param {object[]} rows       - Array of flat objects (report data)
 * @param {string}   sheetName  - Name for the worksheet tab
 * @returns {Promise<Buffer>}   - Excel file buffer
 */
export const buildExcel = async (rows, sheetName = "Report") => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ERP System";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);

  if (!rows || rows.length === 0) {
    sheet.addRow(["No data available"]);
    return workbook.xlsx.writeBuffer();
  }

  const headers = Object.keys(rows[0]);

  // Styled header row
  sheet.columns = headers.map((h) => ({
    header: h,
    key: h,
    width: Math.max(h.length + 4, 15),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E40AF" }, // indigo-800
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  // Data rows
  rows.forEach((row) => sheet.addRow(row));

  // Freeze header row for readability
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  return workbook.xlsx.writeBuffer();
};
