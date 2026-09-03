import { Router } from "express";
import {
  getTaskById,
  updateTask,
  deleteTask,
  getSubtasks,
  createSubtask,
} from "../controllers/task.controller.js";
import {
  assignEmployee,
  unassignEmployee,
} from "../controllers/taskAssignment.controller.js";
import {
  getTaskComments,
  createComment,
  updateComment,
  deleteComment,
} from "../controllers/taskComment.controller.js";
import {
  getAttachments,
  uploadAttachment,
  deleteAttachment,
} from "../controllers/taskAttachment.controller.js";
import {
  taskIdParamSchema,
  updateTaskSchema,
  subtaskParamSchema,
  createSubtaskSchema,
} from "../validators/task.validator.js";
import {
  deleteAssignmentSchema,
  createAssignmentSchema,
} from "../validators/taskAssignment.validator.js";
import {
  taskIdParamSchema as commentTaskIdParamSchema,
  commentParamSchema,
  createCommentSchema,
  updateCommentSchema,
} from "../validators/taskComment.validator.js";
import {
  taskIdParamSchema as attachmentTaskIdParamSchema,
  attachmentParamSchema,
} from "../validators/taskAttachment.validator.js";
import { upload } from "../config/cloudinary.js";
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

// ============================================================
// Phase 4 – Section 5: Subtasks
// ============================================================

/**
 * @swagger
 * /tasks/{id}/subtasks:
 *   get:
 *     summary: List all subtasks of a task
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Parent task ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of subtasks
 *       404:
 *         description: Parent task not found
 */
router.get(
  "/:id/subtasks",
  validate(subtaskParamSchema),
  requirePermission("READ", "PROJECTS"),
  asyncHandler(getSubtasks),
);

/**
 * @swagger
 * /tasks/{id}/subtasks:
 *   post:
 *     summary: Create a subtask under a task (project members only)
 *     description: Subtasks cannot be nested more than 1 level deep.
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Parent task ID
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
 *         description: Subtask created
 *       400:
 *         description: Cannot create a subtask of a subtask
 */
router.post(
  "/:id/subtasks",
  validate(createSubtaskSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(createSubtask),
);

// ============================================================
// Phase 4 – Section 6: Task Assignments
// ============================================================

/**
 * @swagger
 * /tasks/{id}/assignments:
 *   post:
 *     summary: Assign an employee to a task (MANAGER only)
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Task ID
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
 *     responses:
 *       201:
 *         description: Employee assigned successfully
 *       409:
 *         description: Employee is inactive or already assigned
 */
router.post(
  "/:id/assignments",
  validate(createAssignmentSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(assignEmployee),
);

/**
 * @swagger
 * /tasks/{id}/assignments/{employeeId}:
 *   delete:
 *     summary: Unassign an employee from a task (MANAGER only)
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Task ID
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
 *         description: Employee unassigned successfully
 *       404:
 *         description: Assignment not found
 */
router.delete(
  "/:id/assignments/:employeeId",
  validate(deleteAssignmentSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(unassignEmployee),
);

// ============================================================
// Phase 4 – Section 7: Task Comments
// ============================================================

/**
 * @swagger
 * /tasks/{id}/comments:
 *   get:
 *     summary: List all comments for a task (project members only)
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of comments ordered by creation time
 */
router.get(
  "/:id/comments",
  validate(commentTaskIdParamSchema),
  requirePermission("READ", "PROJECTS"),
  asyncHandler(getTaskComments),
);

/**
 * @swagger
 * /tasks/{id}/comments:
 *   post:
 *     summary: Add a comment to a task (project members only)
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *     responses:
 *       201:
 *         description: Comment created
 */
router.post(
  "/:id/comments",
  validate(createCommentSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(createComment),
);

/**
 * @swagger
 * /tasks/{id}/comments/{commentId}:
 *   put:
 *     summary: Update a comment (author only)
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: commentId
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
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 5000
 *     responses:
 *       200:
 *         description: Comment updated
 *       403:
 *         description: Not the comment author
 */
router.put(
  "/:id/comments/:commentId",
  validate(updateCommentSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(updateComment),
);

/**
 * @swagger
 * /tasks/{id}/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment (author or project MANAGER)
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Comment deleted
 *       403:
 *         description: Not the author or a MANAGER
 */
router.delete(
  "/:id/comments/:commentId",
  validate(commentParamSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(deleteComment),
);

// ============================================================
// Phase 4 – Section 8: Task Attachments
// ============================================================

/**
 * @swagger
 * /tasks/{id}/attachments:
 *   get:
 *     summary: List all attachments for a task (project members only)
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of attachments
 */
router.get(
  "/:id/attachments",
  validate(attachmentTaskIdParamSchema),
  requirePermission("READ", "PROJECTS"),
  asyncHandler(getAttachments),
);

/**
 * @swagger
 * /tasks/{id}/attachments:
 *   post:
 *     summary: Upload a file attachment to a task (project members only)
 *     description: Max 10 MB. Allowed types: images, PDF, Word, Excel, ZIP.
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Attachment uploaded successfully
 *       400:
 *         description: No file or unsupported file type
 */
router.post(
  "/:id/attachments",
  validate(attachmentTaskIdParamSchema),
  requirePermission("UPDATE", "PROJECTS"),
  upload.single("file"),
  asyncHandler(uploadAttachment),
);

/**
 * @swagger
 * /tasks/{id}/attachments/{attachmentId}:
 *   delete:
 *     summary: Delete an attachment (uploader or project MANAGER)
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Attachment deleted from Cloudinary and DB
 *       403:
 *         description: Not the uploader or a MANAGER
 */
router.delete(
  "/:id/attachments/:attachmentId",
  validate(attachmentParamSchema),
  requirePermission("UPDATE", "PROJECTS"),
  asyncHandler(deleteAttachment),
);

export default router;
