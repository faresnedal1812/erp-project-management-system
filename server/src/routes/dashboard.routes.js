import { Router } from "express";
import { getDashboard } from "../controllers/dashboard.controller.js";
import asyncHandler from "../utils/asyncHandler.js";
import protect from "../middlewares/auth.middleware.js";
import requireCompany from "../middlewares/requireCompany.js";
import requirePermission from "../middlewares/requirePermission.js";

const router = Router();

router.use(protect);
router.use(requireCompany);

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Company-scoped aggregated statistics and metrics
 */

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get company dashboard statistics
 *     description: |
 *       Returns aggregated real-time metrics for the authenticated user's company.
 *       All metrics are scoped to the company. Uses database-level aggregation for efficiency.
 *
 *       **Access**: Any company member with the `READ:DASHBOARD` permission.
 *       OWNER and ADMIN members are **not** required to have an Employee profile to access this endpoint.
 *
 *       **Metrics included**:
 *       - Projects: total, by status, top active by open task count
 *       - Tasks: total, by status, by priority, open count, overdue count
 *       - Employees: total active, grouped by department
 *       - Meetings: count for the current week (company timezone)
 *       - Documents: total uploaded
 *       - Clients: total & active
 *       - Vendors: total & active
 *       - Time Tracking: total minutes & entries this week (company timezone)
 *       - Upcoming Deadlines: open tasks & incomplete milestones due within 7 days
 *       - Recent Activity: last 10 activity log entries
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     projects:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         byStatus:
 *                           type: object
 *                           example: { "PLANNING": 2, "ACTIVE": 5, "ON_HOLD": 1, "COMPLETED": 3, "CANCELLED": 1 }
 *                         topActiveProjects:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               openTaskCount:
 *                                 type: integer
 *                     tasks:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         byStatus:
 *                           type: object
 *                           example: { "BACKLOG": 10, "TODO": 20, "IN_PROGRESS": 15 }
 *                         byPriority:
 *                           type: object
 *                           example: { "LOW": 10, "MEDIUM": 40, "HIGH": 25, "CRITICAL": 9 }
 *                         openCount:
 *                           type: integer
 *                         overdueCount:
 *                           type: integer
 *                     employees:
 *                       type: object
 *                       properties:
 *                         totalActive:
 *                           type: integer
 *                         byDepartment:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               departmentId:
 *                                 type: string
 *                               departmentName:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                     meetings:
 *                       type: object
 *                       properties:
 *                         thisWeek:
 *                           type: integer
 *                     documents:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                     clients:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                     vendors:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                     timeTracking:
 *                       type: object
 *                       properties:
 *                         totalMinutesThisWeek:
 *                           type: integer
 *                         totalEntriesThisWeek:
 *                           type: integer
 *                     upcomingDeadlines:
 *                       type: object
 *                       properties:
 *                         tasks:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               title:
 *                                 type: string
 *                               dueDate:
 *                                 type: string
 *                                 format: date-time
 *                               priority:
 *                                 type: string
 *                               projectId:
 *                                 type: string
 *                         milestones:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               dueDate:
 *                                 type: string
 *                                 format: date-time
 *                               projectId:
 *                                 type: string
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           action:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           meta:
 *                             type: object
 *                           employee:
 *                             type: object
 *                           project:
 *                             type: object
 *                           task:
 *                             type: object
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Missing READ:DASHBOARD permission or not a company member
 */
router.get(
  "/",
  requirePermission("READ", "DASHBOARD"),
  asyncHandler(getDashboard),
);

export default router;
