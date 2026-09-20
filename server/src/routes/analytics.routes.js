import { Router } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import protect from "../middlewares/auth.middleware.js";
import requireCompany from "../middlewares/requireCompany.js";
import requirePermission from "../middlewares/requirePermission.js";
import validate from "../middlewares/validate.js";
import * as ctrl from "../controllers/analytics.controller.js";
import {
  analyticsQuerySchema,
  projectVelocityQuerySchema,
  employeeProductivityQuerySchema,
} from "../validators/analytics.validator.js";

const router = Router();

router.use(protect);
router.use(requireCompany);
router.use(requirePermission("READ", "DASHBOARD"));

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Time-series analytics and historical data tracking for charts and metrics (requires READ:DASHBOARD)
 */

/**
 * @swagger
 * /analytics/overview:
 *   get:
 *     summary: Retrieve aggregate overview of all analytical data across categories
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: granularity
 *         required: false
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *     responses:
 *       200:
 *         description: Overview chart statistics
 */
router.get(
  "/overview",
  validate(analyticsQuerySchema),
  asyncHandler(ctrl.getOverview),
);

/**
 * @swagger
 * /analytics/tasks:
 *   get:
 *     summary: Task creation vs completion time-series data
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: granularity
 *         required: false
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *     responses:
 *       200:
 *         description: Task analytics
 */
router.get(
  "/tasks",
  validate(analyticsQuerySchema),
  asyncHandler(ctrl.getTasksAnalytics),
);

/**
 * @swagger
 * /analytics/projects/velocity:
 *   get:
 *     summary: Company-wide task velocity (completed work)
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: granularity
 *         required: false
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *     responses:
 *       200:
 *         description: Velocity tracking statistics
 */
router.get(
  "/projects/velocity",
  validate(analyticsQuerySchema),
  asyncHandler(ctrl.getVelocity),
);

/**
 * @swagger
 * /analytics/projects/{projectId}/velocity:
 *   get:
 *     summary: Project-specific task velocity (completed work)
 *     tags: [Analytics]
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
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: granularity
 *         required: false
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *     responses:
 *       200:
 *         description: Project specific velocity tracking statistics
 */
router.get(
  "/projects/:projectId/velocity",
  validate(projectVelocityQuerySchema),
  asyncHandler(ctrl.getProjectVelocity),
);

/**
 * @swagger
 * /analytics/employees/productivity:
 *   get:
 *     summary: Fetch objective employees productivity patterns over time
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: granularity
 *         required: false
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *     responses:
 *       200:
 *         description: Employees productivity analytics
 */
router.get(
  "/employees/productivity",
  validate(analyticsQuerySchema),
  asyncHandler(ctrl.getEmployeesProductivity),
);

/**
 * @swagger
 * /analytics/employees/{employeeId}/productivity:
 *   get:
 *     summary: Fetch objective employee productivity patterns over time
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: granularity
 *         required: false
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *     responses:
 *       200:
 *         description: Employee productivity analytics
 */
router.get(
  "/employees/:employeeId/productivity",
  validate(employeeProductivityQuerySchema),
  asyncHandler(ctrl.getEmployeeProductivity),
);

/**
 * @swagger
 * /analytics/meetings:
 *   get:
 *     summary: Trend of scheduled meetings and sum lengths
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: granularity
 *         required: false
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *     responses:
 *       200:
 *         description: Meeting duration analytics
 */
router.get(
  "/meetings",
  validate(analyticsQuerySchema),
  asyncHandler(ctrl.getMeetingsAnalytics),
);

export default router;
