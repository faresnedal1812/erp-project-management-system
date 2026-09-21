import * as reportService from "../services/report.service.js";
import { buildCsv } from "../utils/exporters/csv.exporter.js";
import { buildExcel } from "../utils/exporters/excel.exporter.js";
import { buildPdf } from "../utils/exporters/pdf/pdf.renderer.js";
import { pdfFormatters } from "../utils/exporters/pdf/index.js";
import { buildReportPdf } from "../utils/exporters/pdf/index.js";

// ── Export Dispatcher ────────────────────────────────────────────

/**
 * Shape the report data for a flat export format (CSV / Excel / PDF).
 * Flattens the top-level summary keys and the rows array into one table.
 */
const flattenForExport = (data, rowsKey) => {
  if (Array.isArray(data)) return data.map(flatRow);
  if (Array.isArray(data[rowsKey])) return data[rowsKey].map(flatRow);
  return [flatRow(data)];
};

const flatRow = (obj) => {
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    if (Array.isArray(val)) result[key] = val.join("; ");
    else if (val instanceof Date) result[key] = val.toISOString();
    else if (typeof val === "object" && val !== null)
      result[key] = JSON.stringify(val);
    else result[key] = val ?? "";
  }
  return result;
};

/**
 * Sends the report in the requested format.
 * @param {object} res        - Express response
 * @param {object|object[]} data - Report data
 * @param {string} format     - 'json' | 'csv' | 'excel' | 'pdf'
 * @param {string} filename   - Base filename (without extension)
 * @param {string} pdfTitle   - Title for the PDF report
 */
const sendReport = async (
  res,
  data,
  format,
  filename,
  pdfTitle,
  reportType,
  pdfOptions = {},
) => {
  if (format === "json") {
    return res.status(200).json({
      success: true,
      data,
    });
  }

  let rows = [];

  switch (reportType) {
    case "projectProgress":
      rows = data.tasks ? data.tasks.map(flatRow) : [];
      break;

    case "employeeWorkload":
      rows = Array.isArray(data)
        ? data.map((emp) =>
            flatRow({
              ...emp,
              tasks: emp.tasks?.map((t) => t.title).join(", ") || "",
            }),
          )
        : [];
      break;

    case "timeTracking":
      rows = Array.isArray(data)
        ? data.flatMap((group) => group.entries || []).map(flatRow)
        : [];
      break;

    case "clientActivity":
      if (data.projects && data.documents) {
        rows = [
          ...data.projects.map((p) => flatRow({ RecordType: "Project", ...p })),
          ...data.documents.map((d) =>
            flatRow({ RecordType: "Document", ...d }),
          ),
        ];
      }
      break;

    case "vendorAgreements":
      if (data.agreements && data.otherDocuments) {
        rows = [
          ...data.agreements.map((a) =>
            flatRow({ RecordType: "Agreement", ...a }),
          ),
          ...data.otherDocuments.map((d) =>
            flatRow({ RecordType: "Other Document", ...d }),
          ),
        ];
      }
      break;

    default:
      rows = flattenForExport(data, "tasks");
      break;
  }

  if (format === "csv") {
    const csv = buildCsv(rows);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.csv"`,
    );

    return res.send(csv);
  }

  if (format === "excel") {
    const buffer = await buildExcel(rows, pdfTitle);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.xlsx"`,
    );

    return res.send(buffer);
  }

  if (format === "pdf") {
    const buffer = await buildReportPdf(reportType, data, pdfOptions);

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.pdf"`,
    );

    return res.send(buffer);
  }

  return res.status(400).json({
    success: false,
    message: `Unsupported export format: ${format}`,
  });
};

// ── Controller Functions ─────────────────────────────────────────

export const getProjectProgressReport = async (req, res) => {
  const { companyId } = req;
  const { projectId } = req.validated.params;
  const { from, to, format = "json" } = req.validated.query;

  const data = await reportService.getProjectProgressReport(
    companyId,
    projectId,
    { from, to },
  );
  return sendReport(
    res,
    data,
    format,
    "project-progress-report",
    "Project Progress Report",
    "projectProgress",
  );
};

export const getEmployeeWorkloadReport = async (req, res) => {
  const { companyId } = req;
  const { from, to, format = "json", employeeId } = req.validated.query;

  const data = await reportService.getEmployeeWorkloadReport(companyId, {
    from,
    to,
    employeeId,
  });
  return sendReport(
    res,
    data,
    format,
    "employee-workload-report",
    "Employee Workload Report",
    "employeeWorkload",
  );
};

export const getTimeTrackingReport = async (req, res) => {
  const { companyId } = req;
  const {
    from,
    to,
    format = "json",
    projectId,
    employeeId,
    groupBy = "project",
  } = req.validated.query;

  const data = await reportService.getTimeTrackingReport(companyId, {
    from,
    to,
    projectId,
    employeeId,
    groupBy,
  });
  return sendReport(
    res,
    data,
    format,
    "time-tracking-report",
    "Time Tracking Report",
    "timeTracking",
    {
      groupBy,
    },
  );
};

export const getClientActivityReport = async (req, res) => {
  const { companyId } = req;
  const { clientId } = req.validated.params;
  const { from, to, format = "json" } = req.validated.query;

  const data = await reportService.getClientActivityReport(
    companyId,
    clientId,
    { from, to },
  );
  return sendReport(
    res,
    data,
    format,
    "client-activity-report",
    "Client Activity Report",
    "clientActivity",
  );
};

export const getVendorAgreementsReport = async (req, res) => {
  const { companyId } = req;
  const { vendorId } = req.validated.params;
  const { from, to, format = "json" } = req.validated.query;

  const data = await reportService.getVendorAgreementsReport(
    companyId,
    vendorId,
    { from, to },
  );
  return sendReport(
    res,
    data,
    format,
    "vendor-agreements-report",
    "Vendor Agreements Report",
    "vendorAgreements",
  );
};
