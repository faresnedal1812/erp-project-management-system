import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  assignRolesToUser,
} from "../controllers/user.controller.js";
import {
  updateUserSchema,
  userIdParamSchema,
  assignRolesSchema,
} from "../validators/user.validator.js";
import validate from "../middlewares/validate.js";
import protect from "../middlewares/auth.middleware.js";
import requirePermission from "../middlewares/requirePermission.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

// All user management routes require authentication.
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management operations (admin only)
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Retrieve details of all users
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/", requirePermission("READ", "USERS"), asyncHandler(getAllUsers));

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Retrieve info for a single user by ID
 *     tags: [Users]
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
 *         description: User information retrieved successfully
 *       404:
 *         description: User not found
 */
router.get(
  "/:id",
  validate(userIdParamSchema),
  requirePermission("READ", "USERS"),
  asyncHandler(getUserById),
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update profile details or status of a user
 *     tags: [Users]
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
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User profile updated successfully
 *       404:
 *         description: User not found
 */
router.put(
  "/:id",
  validate(updateUserSchema),
  requirePermission("UPDATE", "USERS"),
  asyncHandler(updateUser),
);

/**
 * @swagger
 * /users/{id}/roles:
 *   put:
 *     summary: Assign (sync) roles of a user
 *     description: Replaces the user's current role assignments with the provided list.
 *     tags: [Users]
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
 *             required: [roleIds]
 *             properties:
 *               roleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Roles assigned to user successfully
 *       400:
 *         description: One or more role IDs are invalid
 *       404:
 *         description: User not found
 */
router.put(
  "/:id/roles",
  validate(assignRolesSchema),
  requirePermission("UPDATE", "USERS"),
  asyncHandler(assignRolesToUser),
);

export default router;
