/**
 * PDF Exporter
 * Converts a report object { title, subtitle, rows, columns } to a PDF Buffer using pdfkit.
 * Renders a styled table with header row and alternating row colours.
 */

import PDFDocument from "pdfkit";

/**
 * @param {object}   opts
 * @param {string}   opts.title       - Report title (H1)
 * @param {string}   [opts.subtitle]  - Optional subtitle / date range
 * @param {string[]} opts.columns     - Column header labels
 * @param {string[][]} opts.rows      - Array of string arrays (one per row)
 * @returns {Promise<Buffer>}
 */
export const buildPdf = ({ title, subtitle = "", columns, rows }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Title block ──────────────────────────────────────────────
    doc
      .fontSize(18)
      .fillColor("#1E3A8A")
      .font("Helvetica-Bold")
      .text(title, { align: "center" });

    if (subtitle) {
      doc
        .moveDown(0.3)
        .fontSize(10)
        .fillColor("#6B7280")
        .font("Helvetica")
        .text(subtitle, { align: "center" });
    }

    doc.moveDown(1);

    // ── Table ────────────────────────────────────────────────────
    const colCount = columns.length;
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = pageWidth / colCount;
    const rowHeight = 20;
    const headerFill = "#1E3A8A";
    const altFill = "#EFF6FF";

    let x = doc.page.margins.left;
    let y = doc.y;

    const drawRow = (cells, isHeader = false, isAlt = false) => {
      // Row background
      if (isHeader) {
        doc.rect(x, y, pageWidth, rowHeight).fill(headerFill);
      } else if (isAlt) {
        doc.rect(x, y, pageWidth, rowHeight).fill(altFill);
      }

      doc
        .fontSize(8)
        .font(isHeader ? "Helvetica-Bold" : "Helvetica")
        .fillColor(isHeader ? "#FFFFFF" : "#111827");

      cells.forEach((cell, i) => {
        doc.text(String(cell ?? ""), x + i * colWidth + 4, y + 5, {
          width: colWidth - 8,
          ellipsis: true,
          lineBreak: false,
        });
      });

      y += rowHeight;

      // Pagination
      if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    };

    drawRow(columns, true);
    rows.forEach((row, idx) => drawRow(row, false, idx % 2 === 1));

    if (rows.length === 0) {
      doc
        .moveDown()
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#6B7280")
        .text("No data available for this report.", { align: "center" });
    }

    doc.end();
  });
};
