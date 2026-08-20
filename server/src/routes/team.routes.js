import { Router } from "express";
import {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addMember,
  updateMemberRole,
  removeMember,
} from "../controllers/team.controller.js";
import {
  teamIdParamSchema,
  createTeamSchema,
  updateTeamSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
} from "../validators/team.validator.js";
import validate from "../middlewares/validate.js";
import protect from "../middlewares/auth.middleware.js";
import requireCompany from "../middlewares/requireCompany.js";
import requirePermission from "../middlewares/requirePermission.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

// All team routes require a valid authenticated user + active company context
router.use(protect);
router.use(requireCompany);

/**
 * @swagger
 * tags:
 *   name: Teams
 *   description: Team management
 */

/**
 * @swagger
 * /teams:
 *   get:
 *     summary: List all teams for the active company
 *     tags: [Teams]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: header
 *         name: x-company-id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include deactivated teams (default false)
 *     responses:
 *       200:
 *         description: List of teams with members
 */
router.get("/", requirePermission("READ", "TEAMS"), asyncHandler(getTeams));

/**
 * @swagger
 * /teams/{id}:
 *   get:
 *     summary: Get a single team by ID
 *     tags: [Teams]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
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
 *         description: Team details with members
 *       404:
 *         description: Team not found
 */
router.get(
  "/:id",
  validate(teamIdParamSchema),
  requirePermission("READ", "TEAMS"),
  asyncHandler(getTeamById),
);

/**
 * @swagger
 * /teams:
 *   post:
 *     summary: Create a new team for the active company
 *     tags: [Teams]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
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
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Frontend Guild
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Team created
 *       409:
 *         description: Team name already exists in this company
 */
router.post(
  "/",
  validate(createTeamSchema),
  requirePermission("CREATE", "TEAMS"),
  asyncHandler(createTeam),
);

/**
 * @swagger
 * /teams/{id}:
 *   put:
 *     summary: Update a team
 *     tags: [Teams]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Team updated
 *       404:
 *         description: Team not found
 */
router.put(
  "/:id",
  validate(updateTeamSchema),
  requirePermission("UPDATE", "TEAMS"),
  asyncHandler(updateTeam),
);

/**
 * @swagger
 * /teams/{id}:
 *   delete:
 *     summary: Deactivate a team (soft delete)
 *     tags: [Teams]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
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
 *         description: Team deactivated
 *       404:
 *         description: Team not found
 */
router.delete(
  "/:id",
  validate(teamIdParamSchema),
  requirePermission("DELETE", "TEAMS"),
  asyncHandler(deleteTeam),
);

// ── Member Management ─────────────────────────────────────────

/**
 * @swagger
 * /teams/{id}/members:
 *   post:
 *     summary: Add an employee to a team
 *     tags: [Teams]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
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
 *                 enum: [LEAD, MEMBER]
 *                 default: MEMBER
 *     responses:
 *       201:
 *         description: Member added to team
 *       409:
 *         description: Employee is already a member
 *       400:
 *         description: Cannot add terminated employee
 */
router.post(
  "/:id/members",
  validate(addMemberSchema),
  requirePermission("UPDATE", "TEAMS"),
  asyncHandler(addMember),
);

/**
 * @swagger
 * /teams/{id}/members/{employeeId}:
 *   put:
 *     summary: Update a team member's role (LEAD or MEMBER)
 *     tags: [Teams]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
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
 *                 enum: [LEAD, MEMBER]
 *     responses:
 *       200:
 *         description: Member role updated
 *       404:
 *         description: Employee not a member
 */
router.put(
  "/:id/members/:employeeId",
  validate(updateMemberRoleSchema),
  requirePermission("UPDATE", "TEAMS"),
  asyncHandler(updateMemberRole),
);

/**
 * @swagger
 * /teams/{id}/members/{employeeId}:
 *   delete:
 *     summary: Remove an employee from a team
 *     tags: [Teams]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
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
 *         description: Member removed
 *       404:
 *         description: Employee not a member
 */
router.delete(
  "/:id/members/:employeeId",
  validate(removeMemberSchema),
  requirePermission("UPDATE", "TEAMS"),
  asyncHandler(removeMember),
);

export default router;
