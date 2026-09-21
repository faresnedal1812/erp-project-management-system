import { Router } from "express";
import * as ctrl from "../controllers/report.controller.js";
import asyncHandler from "../utils/asyncHandler.js";
import protect from "../middlewares/auth.middleware.js";
import requireCompany from "../middlewares/requireCompany.js";
import requirePermission from "../middlewares/requirePermission.js";
import validate from "../middlewares/validate.js";
import {
  projectProgressSchema,
  employeeWorkloadSchema,
  timeTrackingSchema,
  clientActivitySchema,
  vendorAgreementsSchema,
} from "../validators/report.validator.js";

const router = Router();

router.use(protect);
router.use(requireCompany);
router.use(requirePermission("READ", "REPORTS"));

// ── Swagger Tags ─────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: On-demand structured reports with JSON, CSV, Excel, and PDF export (requires READ:REPORTS)
 */

// ── Shared Parameter Definitions ────────────────────────────────
/**
 * @swagger
 * components:
 *   parameters:
 *     ReportFormat:
 *       in: query
 *       name: format
 *       description: Export format
 *       schema:
 *         type: string
 *         enum: [json, csv, excel, pdf]
 *         default: json
 *     ReportFrom:
 *       in: query
 *       name: from
 *       description: Start datetime (ISO 8601)
 *       schema:
 *         type: string
 *         format: date-time
 *     ReportTo:
 *       in: query
 *       name: to
 *       description: End datetime (ISO 8601)
 *       schema:
 *         type: string
 *         format: date-time
 */

// ── 1. Project Progress ───────────────────────────────────────────

/**
 * @swagger
 * /reports/projects/{projectId}/progress:
 *   get:
 *     summary: Project Progress Report
 *     description: |
 *       Returns a structured summary of a project's tasks (total, completed, pending, overdue),
 *       milestones, and completion percentage. Scoped strictly to the authenticated company.
 *       Supports optional date range to filter tasks by creation date.
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - $ref: '#/components/parameters/ReportFrom'
 *       - $ref: '#/components/parameters/ReportTo'
 *       - $ref: '#/components/parameters/ReportFormat'
 *     responses:
 *       200:
 *         description: Project progress data (or file download for non-JSON formats)
 *       403:
 *         description: Project does not belong to the authenticated company
 *       404:
 *         description: Project not found
 */
router.get(
  "/projects/:projectId/progress",
  validate(projectProgressSchema),
  asyncHandler(ctrl.getProjectProgressReport),
);

// ── 2. Employee Workload ──────────────────────────────────────────

/**
 * @swagger
 * /reports/employees/workload:
 *   get:
 *     summary: Employee Workload Report
 *     description: |
 *       Returns objective workload metrics per employee: tasks assigned, completed, open,
 *       overdue, and total logged hours. Optionally filter by a single `employeeId`.
 *       Only employees belonging to the authenticated company are included.
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         description: Optional filter to a single employee (must belong to this company)
 *         schema:
 *           type: string
 *           format: uuid
 *       - $ref: '#/components/parameters/ReportFrom'
 *       - $ref: '#/components/parameters/ReportTo'
 *       - $ref: '#/components/parameters/ReportFormat'
 *     responses:
 *       200:
 *         description: Employee workload data
 */
router.get(
  "/employees/workload",
  validate(employeeWorkloadSchema),
  asyncHandler(ctrl.getEmployeeWorkloadReport),
);

// ── 3. Time Tracking ────────────────────────────────────────────

/**
 * @swagger
 * /reports/time-tracking:
 *   get:
 *     summary: Time Tracking Report
 *     description: |
 *       Detailed log of completed time entries grouped by project or employee.
 *       Only includes entries with a recorded `endedAt` (completed timers).
 *       Supports filtering by `projectId`, `employeeId`, and date range.
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         description: Filter by a specific project (must belong to this company)
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: employeeId
 *         description: Filter by a specific employee (must belong to this company)
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: groupBy
 *         description: Group results by project or employee
 *         schema:
 *           type: string
 *           enum: [project, employee]
 *           default: project
 *       - $ref: '#/components/parameters/ReportFrom'
 *       - $ref: '#/components/parameters/ReportTo'
 *       - $ref: '#/components/parameters/ReportFormat'
 *     responses:
 *       200:
 *         description: Time tracking data grouped by project or employee
 */
router.get(
  "/time-tracking",
  validate(timeTrackingSchema),
  asyncHandler(ctrl.getTimeTrackingReport),
);

// ── 4. Client Activity ───────────────────────────────────────────

/**
 * @swagger
 * /reports/clients/{clientId}/activity:
 *   get:
 *     summary: Client Activity Report
 *     description: |
 *       Returns associated projects, documents, and meeting attendance for a specific client.
 *       Scoped strictly to the authenticated company. Client must belong to this company.
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - $ref: '#/components/parameters/ReportFrom'
 *       - $ref: '#/components/parameters/ReportTo'
 *       - $ref: '#/components/parameters/ReportFormat'
 *     responses:
 *       200:
 *         description: Client activity report data
 *       403:
 *         description: Client does not belong to the authenticated company
 *       404:
 *         description: Client not found
 */
router.get(
  "/clients/:clientId/activity",
  validate(clientActivitySchema),
  asyncHandler(ctrl.getClientActivityReport),
);

// ── 5. Vendor Agreements ─────────────────────────────────────────

/**
 * @swagger
 * /reports/vendors/{vendorId}/agreements:
 *   get:
 *     summary: Vendor Agreements & Documents Report
 *     description: |
 *       Returns all agreements (CONTRACT / AGREEMENT category documents), other documents,
 *       and meeting attendance for a specific vendor. Includes vendor identity details
 *       (tax ID, payment terms). Scoped strictly to the authenticated company.
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - $ref: '#/components/parameters/ReportFrom'
 *       - $ref: '#/components/parameters/ReportTo'
 *       - $ref: '#/components/parameters/ReportFormat'
 *     responses:
 *       200:
 *         description: Vendor agreements and document data
 *       403:
 *         description: Vendor does not belong to the authenticated company
 *       404:
 *         description: Vendor not found
 */
router.get(
  "/vendors/:vendorId/agreements",
  validate(vendorAgreementsSchema),
  asyncHandler(ctrl.getVendorAgreementsReport),
);

export default router;
