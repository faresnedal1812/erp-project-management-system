import { Router } from "express";
import {
  getAuditLogs,
  getAuditLogById,
} from "../controllers/auditLog.controller.js";
import {
  auditLogQuerySchema,
  auditLogIdParamSchema,
} from "../validators/auditLog.validator.js";
import asyncHandler from "../utils/asyncHandler.js";
import validate from "../middlewares/validate.js";
import protect from "../middlewares/auth.middleware.js";
import requireCompany from "../middlewares/requireCompany.js";
import requirePermission from "../middlewares/requirePermission.js";

const router = Router();

router.use(protect);
router.use(requireCompany);

/**
 * @swagger
 * tags:
 *   name: AuditLogs
 *   description: Immutable audit trail for sensitive data mutations (Owner/Admin only)
 */

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: List all audit logs for the company
 *     description: Returns paginated audit logs. Restricted to company Owners and Admins.
 *     tags: [AuditLogs]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [Employee, Role, Department, Company, Project, CompanyMember]
 *         description: Filter by entity type
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific entity ID
 *       - in: query
 *         name: actorId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by actor (employeeId)
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action keyword (e.g. UPDATE, DELETE)
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date-time for range filter (ISO 8601)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date-time for range filter (ISO 8601)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated audit logs
 *       403:
 *         description: Only Owners and Admins can access audit logs
 */
router.get(
  "/",
  validate(auditLogQuerySchema),
  requirePermission("READ", "AUDIT_LOGS"),
  asyncHandler(getAuditLogs),
);

/**
 * @swagger
 * /audit-logs/{id}:
 *   get:
 *     summary: Get a single audit log entry by ID
 *     tags: [AuditLogs]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Audit log detail
 *       403:
 *         description: Only Owners and Admins can access audit logs
 *       404:
 *         description: Audit log not found
 */
router.get(
  "/:id",
  validate(auditLogIdParamSchema),
  requirePermission("READ", "AUDIT_LOGS"),
  asyncHandler(getAuditLogById),
);

export default router;
