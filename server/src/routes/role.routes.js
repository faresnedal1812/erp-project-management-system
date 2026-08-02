import { Router } from "express";
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignPermissionsToRole,
} from "../controllers/role.controller.js";
import {
  createRoleSchema,
  updateRoleSchema,
  roleIdParamSchema,
  assignPermissionsSchema,
} from "../validators/role.validator.js";
import validate from "../middlewares/validate.js";
import protect from "../middlewares/auth.middleware.js";
import requirePermission from "../middlewares/requirePermission.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

// All role management routes require authentication.
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Role management (admin only)
 */

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: List all roles
 *     tags: [Roles]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all roles with their permissions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/", requirePermission("READ", "ROLES"), asyncHandler(getAllRoles));

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: Get a role by ID
 *     tags: [Roles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Role details with permissions
 *       404:
 *         description: Role not found
 */
router.get(
  "/:id",
  validate(roleIdParamSchema),
  requirePermission("READ", "ROLES"),
  asyncHandler(getRoleById),
);

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     security:
 *       - BearerAuth: []
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
 *                 example: PROJECT_MANAGER
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Role created successfully
 *       409:
 *         description: Role already exists
 */
router.post(
  "/",
  validate(createRoleSchema),
  requirePermission("CREATE", "ROLES"),
  asyncHandler(createRole),
);

/**
 * @swagger
 * /roles/{id}:
 *   put:
 *     summary: Update a role
 *     tags: [Roles]
 *     security:
 *       - BearerAuth: []
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
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       404:
 *         description: Role not found
 */
router.put(
  "/:id",
  validate(updateRoleSchema),
  requirePermission("UPDATE", "ROLES"),
  asyncHandler(updateRole),
);

/**
 * @swagger
 * /roles/{id}:
 *   delete:
 *     summary: Delete a role
 *     tags: [Roles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Role deleted successfully
 *       404:
 *         description: Role not found
 */
router.delete(
  "/:id",
  validate(roleIdParamSchema),
  requirePermission("DELETE", "ROLES"),
  asyncHandler(deleteRole),
);

/**
 * @swagger
 * /roles/{id}/permissions:
 *   put:
 *     summary: Assign (sync) permissions to a role
 *     description: Replaces the role's current permission set with the provided list.
 *     tags: [Roles]
 *     security:
 *       - BearerAuth: []
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
 *             required: [permissionIds]
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Permissions synced to role successfully
 *       400:
 *         description: One or more permission IDs are invalid
 *       404:
 *         description: Role not found
 */
router.put(
  "/:id/permissions",
  validate(assignPermissionsSchema),
  requirePermission("UPDATE", "ROLES"),
  asyncHandler(assignPermissionsToRole),
);

export default router;
