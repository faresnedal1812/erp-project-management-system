import buildProjectProgressPdf from "./project-progress.pdf.js";
import buildEmployeeWorkloadPdf from "./employee-workload.pdf.js";
import buildTimeTrackingPdf from "./time-tracking.pdf.js";
import buildClientActivityPdf from "./client-activity.pdf.js";
import buildVendorAgreementsPdf from "./vendor-agreements.pdf.js";

const pdfBuilders = {
  projectProgress: buildProjectProgressPdf,
  employeeWorkload: buildEmployeeWorkloadPdf,
  timeTracking: buildTimeTrackingPdf,
  clientActivity: buildClientActivityPdf,
  vendorAgreements: buildVendorAgreementsPdf,
};

export const buildReportPdf = async (reportType, data, options = {}) => {
  const builder = pdfBuilders[reportType];

  if (!builder) {
    throw new Error(`Unsupported PDF report type: ${reportType}`);
  }

  return builder(data, options);
};
