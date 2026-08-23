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
} from "../validators/project.validator.js";
import {
  projectMemberParamSchema,
  addProjectMemberSchema,
  updateProjectMemberSchema,
} from "../validators/projectMember.validator.js";
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
 *     parameters:
 *       - in: header
 *         name: x-company-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *     parameters:
 *       - in: header
 *         name: x-company-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *     parameters:
 *       - in: header
 *         name: x-company-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectCreate'
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
 *     parameters:
 *       - in: header
 *         name: x-company-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *             $ref: '#/components/schemas/ProjectUpdate'
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
 *     parameters:
 *       - in: header
 *         name: x-company-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *     parameters:
 *       - in: header
 *         name: x-company-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *     parameters:
 *       - in: header
 *         name: x-company-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *     parameters:
 *       - in: header
 *         name: x-company-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *     parameters:
 *       - in: header
 *         name: x-company-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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

export default router;
