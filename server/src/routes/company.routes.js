import { Router } from "express";
import {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyMembers,
  addMember,
  updateMemberRole,
  removeMember,
} from "../controllers/company.controller.js";
import {
  createCompanySchema,
  updateCompanySchema,
  companyIdParamSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
} from "../validators/company.validator.js";
import validate from "../middlewares/validate.js";
import protect from "../middlewares/auth.middleware.js";
import requirePermission from "../middlewares/requirePermission.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

// All company routes require authentication.
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Companies
 *   description: Company management
 */

// ── Company CRUD ──────────────────────────────────────────────

/**
 * @swagger
 * /companies:
 *   get:
 *     summary: List all active companies
 *     tags: [Companies]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of companies
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/",
  requirePermission("READ", "COMPANIES"),
  asyncHandler(getAllCompanies),
);

/**
 * @swagger
 * /companies/{id}:
 *   get:
 *     summary: Get a company by ID (includes members)
 *     tags: [Companies]
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
 *         description: Company details with members
 *       404:
 *         description: Company not found
 */
router.get(
  "/:id",
  validate(companyIdParamSchema),
  requirePermission("READ", "COMPANIES"),
  asyncHandler(getCompanyById),
);

/**
 * @swagger
 * /companies:
 *   post:
 *     summary: Create a new company
 *     description: The authenticated user is automatically assigned as OWNER.
 *     tags: [Companies]
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
 *                 example: Acme Corp
 *               industry:
 *                 type: string
 *                 example: Technology
 *               website:
 *                 type: string
 *                 example: https://acme.com
 *               email:
 *                 type: string
 *                 example: contact@acme.com
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               logo:
 *                 type: string
 *     responses:
 *       201:
 *         description: Company created successfully
 *       409:
 *         description: Conflict
 */
router.post(
  "/",
  validate(createCompanySchema),
  requirePermission("CREATE", "COMPANIES"),
  asyncHandler(createCompany),
);

/**
 * @swagger
 * /companies/{id}:
 *   put:
 *     summary: Update a company
 *     tags: [Companies]
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
 *               industry:
 *                 type: string
 *               website:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               logo:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Company updated successfully
 *       404:
 *         description: Company not found
 */
router.put(
  "/:id",
  validate(updateCompanySchema),
  requirePermission("UPDATE", "COMPANIES"),
  asyncHandler(updateCompany),
);

/**
 * @swagger
 * /companies/{id}:
 *   delete:
 *     summary: Deactivate a company (soft delete)
 *     tags: [Companies]
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
 *         description: Company deactivated
 *       404:
 *         description: Company not found
 */
router.delete(
  "/:id",
  validate(companyIdParamSchema),
  requirePermission("DELETE", "COMPANIES"),
  asyncHandler(deleteCompany),
);

// ── Member Management ─────────────────────────────────────────

/**
 * @swagger
 * /companies/{id}/members:
 *   get:
 *     summary: List all members of a company
 *     tags: [Companies]
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
 *         description: List of company members
 *       404:
 *         description: Company not found
 */
router.get(
  "/:id/members",
  validate(companyIdParamSchema),
  requirePermission("READ", "COMPANIES"),
  asyncHandler(getCompanyMembers),
);

/**
 * @swagger
 * /companies/{id}/members:
 *   post:
 *     summary: Add a user to a company
 *     tags: [Companies]
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
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               role:
 *                 type: string
 *                 enum: [OWNER, ADMIN, MEMBER]
 *                 default: MEMBER
 *     responses:
 *       201:
 *         description: Member added successfully
 *       404:
 *         description: Company or user not found
 *       409:
 *         description: User is already a member
 */
router.post(
  "/:id/members",
  validate(addMemberSchema),
  requirePermission("UPDATE", "COMPANIES"),
  asyncHandler(addMember),
);

/**
 * @swagger
 * /companies/{id}/members/{userId}:
 *   put:
 *     summary: Update a member's role within a company
 *     tags: [Companies]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
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
 *                 enum: [OWNER, ADMIN, MEMBER]
 *     responses:
 *       200:
 *         description: Member role updated
 *       400:
 *         description: Cannot demote last OWNER
 *       404:
 *         description: Company or member not found
 */
router.put(
  "/:id/members/:userId",
  validate(updateMemberRoleSchema),
  requirePermission("UPDATE", "COMPANIES"),
  asyncHandler(updateMemberRole),
);

/**
 * @swagger
 * /companies/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a user from a company
 *     tags: [Companies]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Member removed
 *       400:
 *         description: Cannot remove last OWNER
 *       404:
 *         description: Company or member not found
 */
router.delete(
  "/:id/members/:userId",
  validate(removeMemberSchema),
  requirePermission("UPDATE", "COMPANIES"),
  asyncHandler(removeMember),
);

export default router;
