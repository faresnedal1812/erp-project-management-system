import { Router } from "express";
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/project.controller.js";
import {
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
} from "../controllers/projectMember.controller.js";
import {
  projectIdParamSchema,
  createProjectSchema,
  updateProjectSchema,
  getAllProjectsSchema,
} from "../validators/project.validator.js";
import {
  projectMemberParamSchema,
  addProjectMemberSchema,
  updateProjectMemberSchema,
} from "../validators/projectMember.validator.js";
import {
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "../controllers/milestone.controller.js";
import {
  milestoneParamSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
} from "../validators/milestone.validator.js";
import { getProjectTasks, createTask } from "../controllers/task.controller.js";
import { getProjectTimeReport } from "../controllers/timeEntry.controller.js";
import {
  getTasksQuerySchema,
  createTaskSchema,
} from "../validators/task.validator.js";
import validate from "../middlewares/validate.js";
import protect from "../middlewares/auth.middleware.js";
import requireCompany from "../middlewares/requireCompany.js";
import requirePermission from "../middlewares/requirePermission.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

// Apply auth and tenant scoping to all project routes
router.use(protect);
router.use(requireCompany);

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project limits and lifecycle
 */

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: List all projects for the active company
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include deactivated departments (default false)
 *     responses:
 *       200:
 *         description: List of projects the user can access
 */
router.get(
  "/",
  validate(getAllProjectsSchema),
  requirePermission("READ", "PROJECTS"),
  asyncHandler(getAllProjects),
);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Get a single project
 *     tags: [Projects]
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
 *         description: Project details
 *       404:
 *         description: Project not found or inaccessible
 */
router.get(
  "/:id",
  validate(projectIdParamSchema),
  requirePermission("READ", "PROJECTS"),
  asyncHandler(getProjectById),
);

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               teamId:
 *                 type: string
 *                 format: uuid
 *               visibility:
 *                 type: string
 *                 enum: [PUBLIC, PRIVATE]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Project created successfully
 */
router.post(
  "/",
  validate(createProjectSchema),
  requirePermission("CREATE", "PROJECTS"),
  asyncHandler(createProject),
);

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Update an existing project
 *     tags: [Projects]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               teamId:
 *                 type: string
 *                 format: uuid
 *               visibility:
 *                 type: string
 *                 enum: [PUBLIC, PRIVATE]
 *               isActive:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED]
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Project updated successfully
 */
router.put(
  "/:id",
  validate(updateProjectSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(updateProject),
);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Soft-delete a project (mark as CANCELLED)
 *     tags: [Projects]
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
 *       204:
 *         description: Project archived
 */
router.delete(
  "/:id",
  validate(projectIdParamSchema),
  requirePermission("DELETE", "PROJECTS"),
  asyncHandler(deleteProject),
);

// ============================================================
// Phase 4 – Section 2: Project Members Routes
// ============================================================

/**
 * @swagger
 * /projects/{id}/members:
 *   get:
 *     summary: List all members of a project
 *     tags: [Projects]
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
 *         description: List of project members
 */
router.get(
  "/:id/members",
  validate(projectIdParamSchema),
  requirePermission("READ", "PROJECTS"),
  asyncHandler(getProjectMembers),
);

/**
 * @swagger
 * /projects/{id}/members:
 *   post:
 *     summary: Add an employee to a project
 *     tags: [Projects]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId]
 *             properties:
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               role:
 *                 type: string
 *                 enum: [MANAGER, CONTRIBUTOR, OBSERVER]
 *     responses:
 *       201:
 *         description: Member added successfully
 */
router.post(
  "/:id/members",
  validate(addProjectMemberSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(addProjectMember),
);

/**
 * @swagger
 * /projects/{id}/members/{employeeId}:
 *   put:
 *     summary: Update a project member's role
 *     tags: [Projects]
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
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [MANAGER, CONTRIBUTOR, OBSERVER]
 *     responses:
 *       200:
 *         description: Role updated successfully
 */
router.put(
  "/:id/members/:employeeId",
  validate(updateProjectMemberSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(updateProjectMemberRole),
);

/**
 * @swagger
 * /projects/{id}/members/{employeeId}:
 *   delete:
 *     summary: Remove a member from a project
 *     tags: [Projects]
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
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Member removed successfully
 */
router.delete(
  "/:id/members/:employeeId",
  validate(projectMemberParamSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(removeProjectMember),
);

// ============================================================
// Phase 4 – Section 3: Milestones
// ============================================================

/**
 * @swagger
 * /projects/{id}/milestones:
 *   get:
 *     summary: List milestones in a project
 *     tags: [Projects]
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
 *         description: List of milestones
 */
router.get(
  "/:id/milestones",
  validate(projectIdParamSchema),
  requirePermission("READ", "PROJECTS"),
  asyncHandler(getMilestones),
);

/**
 * @swagger
 * /projects/{id}/milestones:
 *   post:
 *     summary: Create a milestone (MANAGER only)
 *     tags: [Projects]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Milestone created
 */
router.post(
  "/:id/milestones",
  validate(createMilestoneSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(createMilestone),
);

/**
 * @swagger
 * /projects/{id}/milestones/{milestoneId}:
 *   put:
 *     summary: Update a milestone (MANAGER only)
 *     tags: [Projects]
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
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               isCompleted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Milestone updated
 */
router.put(
  "/:id/milestones/:milestoneId",
  validate(updateMilestoneSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(updateMilestone),
);

/**
 * @swagger
 * /projects/{id}/milestones/{milestoneId}:
 *   delete:
 *     summary: Delete a milestone (MANAGER only)
 *     tags: [Projects]
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
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Milestone deleted
 */
router.delete(
  "/:id/milestones/:milestoneId",
  validate(milestoneParamSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(deleteMilestone),
);

// ============================================================
// Phase 4 – Section 4: Tasks (project-scoped endpoints)
// ============================================================

/**
 * @swagger
 * /projects/{id}/tasks:
 *   get:
 *     summary: List all tasks in a project
 *     tags: [Projects]
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *       - in: query
 *         name: milestoneId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: assignedToMe
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get(
  "/:id/tasks",
  validate(getTasksQuerySchema),
  requirePermission("READ", "PROJECTS"),
  asyncHandler(getProjectTasks),
);

/**
 * @swagger
 * /projects/{id}/tasks:
 *   post:
 *     summary: Create a task in a project (project members only)
 *     tags: [Projects]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               milestoneId:
 *                 type: string
 *                 format: uuid
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *               status:
 *                 type: string
 *                 enum: [BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               estimatedHours:
 *                 type: number
 *     responses:
 *       201:
 *         description: Task created
 */
router.post(
  "/:id/tasks",
  validate(createTaskSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(createTask),
);

// ============================================================
// Phase 4 – Section 9: Time Tracking (project-scoped)
// ============================================================

/**
 * @swagger
 * /projects/{id}/time-report:
 *   get:
 *     summary: Get aggregated time report for a project
 *     description: Returns total logged minutes and entry count per employee.
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Project ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Aggregated time report per employee
 */
router.get(
  "/:id/time-report",
  validate(projectIdParamSchema),
  requirePermission("READ", "PROJECTS"),
  asyncHandler(getProjectTimeReport),
);

export default router;
