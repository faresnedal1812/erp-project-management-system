import { Router } from "express";
import {
  getAllPermissions,
  getPermissionById,
  createPermission,
  deletePermission,
} from "../controllers/permission.controller.js";
import {
  createPermissionSchema,
  permissionIdParamSchema,
} from "../validators/permission.validator.js";
import validate from "../middlewares/validate.js";
import protect from "../middlewares/auth.middleware.js";
import requirePermission from "../middlewares/requirePermission.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

// All permission management routes require authentication.
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Permissions
 *   description: Permission management (admin only)
 */

/**
 * @swagger
 * /permissions:
 *   get:
 *     summary: List all permissions
 *     tags: [Permissions]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all permissions
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  requirePermission("READ", "PERMISSIONS"),
  asyncHandler(getAllPermissions),
);

/**
 * @swagger
 * /permissions/{id}:
 *   get:
 *     summary: Get a permission by ID
 *     tags: [Permissions]
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
 *         description: Permission details
 *       404:
 *         description: Permission not found
 */
router.get(
  "/:id",
  validate(permissionIdParamSchema),
  requirePermission("READ", "PERMISSIONS"),
  asyncHandler(getPermissionById),
);

/**
 * @swagger
 * /permissions:
 *   post:
 *     summary: Create a new permission
 *     tags: [Permissions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, resource]
 *             properties:
 *               action:
 *                 type: string
 *                 example: CREATE
 *               resource:
 *                 type: string
 *                 example: PROJECTS
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Permission created successfully
 *       409:
 *         description: Permission already exists
 */
router.post(
  "/",
  validate(createPermissionSchema),
  requirePermission("CREATE", "PERMISSIONS"),
  asyncHandler(createPermission),
);

/**
 * @swagger
 * /permissions/{id}:
 *   delete:
 *     summary: Delete a permission
 *     tags: [Permissions]
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
 *         description: Permission deleted successfully
 *       404:
 *         description: Permission not found
 */
router.delete(
  "/:id",
  validate(permissionIdParamSchema),
  requirePermission("DELETE", "PERMISSIONS"),
  asyncHandler(deletePermission),
);

export default router;
