import { Router } from "express";
import {
  getTaskById,
  updateTask,
  deleteTask,
} from "../controllers/task.controller.js";
import {
  taskIdParamSchema,
  updateTaskSchema,
} from "../validators/task.validator.js";
import validate from "../middlewares/validate.js";
import protect from "../middlewares/auth.middleware.js";
import requireCompany from "../middlewares/requireCompany.js";
import requirePermission from "../middlewares/requirePermission.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.use(protect);
router.use(requireCompany);

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management within projects
 */

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get a single task by ID
 *     tags: [Tasks]
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
 *         description: Task details with subtasks, assignments and counts
 *       404:
 *         description: Task not found
 */
router.get(
  "/:id",
  validate(taskIdParamSchema),
  requirePermission("READ", "PROJECTS"),
  asyncHandler(getTaskById),
);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update a task (project members only)
 *     tags: [Tasks]
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               milestoneId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *               status:
 *                 type: string
 *                 enum: [BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               estimatedHours:
 *                 type: number
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Task updated successfully
 */
router.put(
  "/:id",
  validate(updateTaskSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(updateTask),
);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task (MANAGER only)
 *     tags: [Tasks]
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
 *         description: Task deleted
 */
router.delete(
  "/:id",
  validate(taskIdParamSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(deleteTask),
);

export default router;
