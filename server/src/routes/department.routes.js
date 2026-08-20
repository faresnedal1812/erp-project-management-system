import { Router } from "express";
import {
  getDepartmentsByBranch,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controllers/department.controller.js";
import {
  departmentsByBranchSchema,
  departmentIdParamSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
} from "../validators/department.validator.js";
import validate from "../middlewares/validate.js";
import protect from "../middlewares/auth.middleware.js";
import requirePermission from "../middlewares/requirePermission.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Department management
 */

/**
 * @swagger
 * /departments/branch/{branchId}:
 *   get:
 *     summary: List all top-level departments for a branch (with nested children)
 *     tags: [Departments]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include deactivated departments (default false)
 *     responses:
 *       200:
 *         description: List of departments with sub-departments nested inside
 *       404:
 *         description: Branch not found
 */
router.get(
  "/branch/:branchId",
  validate(departmentsByBranchSchema),
  requirePermission("READ", "DEPARTMENTS"),
  asyncHandler(getDepartmentsByBranch),
);

/**
 * @swagger
 * /departments/{id}:
 *   get:
 *     summary: Get a single department by ID (includes immediate children)
 *     tags: [Departments]
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
 *         description: Department details with children
 *       404:
 *         description: Department not found
 */
router.get(
  "/:id",
  validate(departmentIdParamSchema),
  requirePermission("READ", "DEPARTMENTS"),
  asyncHandler(getDepartmentById),
);

/**
 * @swagger
 * /departments:
 *   post:
 *     summary: Create a new department
 *     description: Optionally set parentId to create a sub-department. Parent must belong to the same branch.
 *     tags: [Departments]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [branchId, name]
 *             properties:
 *               branchId:
 *                 type: string
 *                 format: uuid
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 description: Parent department ID for sub-departments
 *               name:
 *                 type: string
 *                 example: Engineering
 *               code:
 *                 type: string
 *                 example: ENG
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Department created successfully
 *       409:
 *         description: Department code already exists in this branch
 */
router.post(
  "/",
  validate(createDepartmentSchema),
  requirePermission("CREATE", "DEPARTMENTS"),
  asyncHandler(createDepartment),
);

/**
 * @swagger
 * /departments/{id}:
 *   put:
 *     summary: Update a department
 *     description: Set parentId to null to detach from parent. Circular hierarchy is prevented.
 *     tags: [Departments]
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
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Department updated successfully
 *       400:
 *         description: Circular hierarchy detected
 *       404:
 *         description: Department not found
 */
router.put(
  "/:id",
  validate(updateDepartmentSchema),
  requirePermission("UPDATE", "DEPARTMENTS"),
  asyncHandler(updateDepartment),
);

/**
 * @swagger
 * /departments/{id}:
 *   delete:
 *     summary: Deactivate a department and all its sub-departments (soft delete)
 *     tags: [Departments]
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
 *         description: Department and children deactivated
 *       404:
 *         description: Department not found
 */
router.delete(
  "/:id",
  validate(departmentIdParamSchema),
  requirePermission("DELETE", "DEPARTMENTS"),
  asyncHandler(deleteDepartment),
);

export default router;
