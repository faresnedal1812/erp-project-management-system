import PDFDocument from "pdfkit";

const DEFAULT_MARGIN = 40;
const DEFAULT_ROW_HEIGHT = 22;
const DEFAULT_FONT_SIZE = 8;
const DEFAULT_HEADER_FONT_SIZE = 8;

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
};

const normalizeColumns = (columns, pageWidth) => {
  if (!columns || columns.length === 0) {
    return [];
  }

  const totalWeight = columns.reduce(
    (sum, column) => sum + (column.width ?? 1),
    0,
  );

  return columns.map((column) => ({
    ...column,
    width: (pageWidth * (column.width ?? 1)) / totalWeight,
  }));
};

const drawPageFooter = (doc) => {
  const range = doc.bufferedPageRange();

  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);

    const pageNumber = i + 1;
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor("#6B7280")
      .text(`Page ${pageNumber}`, doc.page.margins.left, doc.page.height - 25, {
        width: pageWidth,
        align: "center",
      });
  }
};

export const buildPdf = ({
  title,
  subtitle = "",
  sections = [],
  orientation = "portrait",
}) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: orientation,
      margin: DEFAULT_MARGIN,
      bufferPages: true,
    });

    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on("error", reject);

    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const pageBottom = doc.page.height - doc.page.margins.bottom - 20;

    const ensureSpace = (requiredHeight = 30) => {
      if (doc.y + requiredHeight > pageBottom) {
        doc.addPage();
      }
    };

    const drawTitle = () => {
      doc.font("Helvetica-Bold").fontSize(18).fillColor("#1E3A8A").text(title, {
        align: "center",
      });

      if (subtitle) {
        doc
          .moveDown(0.3)
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#6B7280")
          .text(subtitle, {
            align: "center",
          });
      }

      doc.moveDown(1);
    };

    const drawSectionTitle = (sectionTitle) => {
      ensureSpace(40);

      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor("#1E3A8A")
        .text(sectionTitle);

      doc.moveDown(0.35);
    };

    const drawDetails = (details = []) => {
      if (!details.length) {
        return;
      }

      const labelWidth = 120;
      const valueWidth = pageWidth - labelWidth;

      for (const detail of details) {
        ensureSpace(22);

        const startY = doc.y;

        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor("#374151")
          .text(formatValue(detail.label), doc.page.margins.left, startY, {
            width: labelWidth,
            continued: false,
          });
        const labelEndY = doc.y;

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#111827")
          .text(
            formatValue(detail.value),
            doc.page.margins.left + labelWidth,
            startY,
            {
              width: valueWidth,
              continued: false,
            },
          );
        const valueEndY = doc.y;

        const rowHeight = Math.max(labelEndY - startY, valueEndY - startY, 18);

        doc
          .strokeColor("#E5E7EB")
          .lineWidth(0.5)
          .moveTo(doc.page.margins.left, startY + rowHeight)
          .lineTo(doc.page.margins.left + pageWidth, startY + rowHeight)
          .stroke();

        doc.y = startY + rowHeight + 2;
      }

      doc.moveDown(0.5);
    };

    const drawSummary = (summary = {}) => {
      const entries = Object.entries(summary);

      if (!entries.length) {
        return;
      }

      ensureSpace(65);

      const gap = 8;
      const perRow = Math.min(4, entries.length);
      const boxWidth = (pageWidth - gap * (perRow - 1)) / perRow;
      const boxHeight = 48;

      for (let index = 0; index < entries.length; index++) {
        if (index > 0 && index % perRow === 0) {
          doc.y += boxHeight + gap;
          ensureSpace(boxHeight + gap);
        }

        const columnIndex = index % perRow;
        const x = doc.page.margins.left + columnIndex * (boxWidth + gap);

        const y = doc.y;

        doc
          .roundedRect(x, y, boxWidth, boxHeight, 4)
          .fillAndStroke("#F3F4F6", "#D1D5DB");

        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#6B7280")
          .text(formatValue(entries[index][0]), x + 8, y + 8, {
            width: boxWidth - 16,
            align: "center",
          });

        doc
          .font("Helvetica-Bold")
          .fontSize(13)
          .fillColor("#111827")
          .text(formatValue(entries[index][1]), x + 8, y + 22, {
            width: boxWidth - 16,
            align: "center",
          });
      }

      const rows = Math.ceil(entries.length / perRow);

      doc.y += rows * boxHeight + (rows - 1) * gap + 10;
    };

    const drawTable = (table) => {
      const {
        title: tableTitle,
        columns = [],
        rows = [],
        emptyMessage = "No data available.",
      } = table;

      if (!columns.length) {
        return;
      }

      if (tableTitle) {
        ensureSpace(35);

        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor("#374151")
          .text(tableTitle);

        doc.moveDown(0.4);
      }

      const normalizedColumns = normalizeColumns(columns, pageWidth);

      const drawHeader = () => {
        ensureSpace(DEFAULT_ROW_HEIGHT * 2);

        const headerY = doc.y;

        doc
          .rect(doc.page.margins.left, headerY, pageWidth, DEFAULT_ROW_HEIGHT)
          .fill("#1E3A8A");

        let x = doc.page.margins.left;

        for (const column of normalizedColumns) {
          doc
            .font("Helvetica-Bold")
            .fontSize(DEFAULT_HEADER_FONT_SIZE)
            .fillColor("#FFFFFF")
            .text(formatValue(column.label), x + 4, headerY + 7, {
              width: column.width - 8,
              height: DEFAULT_ROW_HEIGHT - 8,
              ellipsis: true,
              lineBreak: false,
            });

          x += column.width;
        }

        doc.y = headerY + DEFAULT_ROW_HEIGHT;
      };

      drawHeader();

      if (!rows.length) {
        ensureSpace(DEFAULT_ROW_HEIGHT);

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#6B7280")
          .text(emptyMessage);

        doc.moveDown(0.8);
        return;
      }

      rows.forEach((row, rowIndex) => {
        const rowHeight = DEFAULT_ROW_HEIGHT;

        if (doc.y + rowHeight > pageBottom) {
          doc.addPage();
          drawHeader();
        }

        const rowY = doc.y;

        if (rowIndex % 2 === 1) {
          doc
            .rect(doc.page.margins.left, rowY, pageWidth, rowHeight)
            .fill("#F9FAFB");
        }

        let x = doc.page.margins.left;

        for (const column of normalizedColumns) {
          const rawValue = column.getValue
            ? column.getValue(row)
            : row[column.key];

          doc
            .font("Helvetica")
            .fontSize(DEFAULT_FONT_SIZE)
            .fillColor("#111827")
            .text(formatValue(rawValue), x + 4, rowY + 7, {
              width: column.width - 8,
              height: rowHeight - 8,
              ellipsis: true,
              lineBreak: false,
            });

          x += column.width;
        }

        doc.y = rowY + rowHeight;

        doc
          .strokeColor("#E5E7EB")
          .lineWidth(0.3)
          .moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.margins.left + pageWidth, doc.y)
          .stroke();
      });

      doc.moveDown(0.8);
    };

    drawTitle();

    for (const section of sections) {
      drawSectionTitle(section.title);

      drawDetails(section.details);

      drawSummary(section.summary);

      for (const table of section.tables ?? []) {
        drawTable(table);
      }

      doc.moveDown(0.5);
    }

    drawPageFooter(doc);

    doc.end();
  });
};
