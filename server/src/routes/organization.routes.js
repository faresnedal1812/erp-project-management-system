import { Router } from "express";
import {
  getSettings,
  upsertSettings,
  listInvites,
  sendInvite,
  acceptInvite,
  cancelInvite,
} from "../controllers/organization.controller.js";
import {
  settingsParamSchema,
  upsertSettingsSchema,
  sendInviteSchema,
  acceptInviteSchema,
  cancelInviteSchema,
  listInvitesSchema,
} from "../validators/organization.validator.js";
import validate from "../middlewares/validate.js";
import protect from "../middlewares/auth.middleware.js";
import requirePermission from "../middlewares/requirePermission.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Organization
 *   description: Company settings and invite management
 */

// ── Settings ──────────────────────────────────────────────────

/**
 * @swagger
 * /companies/{id}/settings:
 *   get:
 *     summary: Get organization settings for a company
 *     tags: [Organization]
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
 *         description: Company settings
 *       404:
 *         description: Company not found
 */
router.get(
  "/:id/settings",
  validate(settingsParamSchema),
  requirePermission("READ", "COMPANIES"),
  asyncHandler(getSettings),
);

/**
 * @swagger
 * /companies/{id}/settings:
 *   put:
 *     summary: Create or update organization settings for a company
 *     tags: [Organization]
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
 *               timezone:
 *                 type: string
 *                 example: America/New_York
 *               language:
 *                 type: string
 *                 example: en
 *               currency:
 *                 type: string
 *                 example: USD
 *               dateFormat:
 *                 type: string
 *                 example: MM/DD/YYYY
 *     responses:
 *       200:
 *         description: Settings saved successfully
 *       404:
 *         description: Company not found
 */
router.put(
  "/:id/settings",
  validate(upsertSettingsSchema),
  requirePermission("UPDATE", "COMPANIES"),
  asyncHandler(upsertSettings),
);

// ── Invites ───────────────────────────────────────────────────

/**
 * @swagger
 * /companies/{id}/invites:
 *   get:
 *     summary: List all invites for a company
 *     tags: [Organization]
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
 *         description: List of invites
 */
router.get(
  "/:id/invites",
  validate(listInvitesSchema),
  requirePermission("READ", "COMPANIES"),
  asyncHandler(listInvites),
);

/**
 * @swagger
 * /companies/{id}/invites:
 *   post:
 *     summary: Send an invitation to a user by email
 *     description: Invites a user to join the company. If a pending invite already exists for the email, the token is refreshed and resent.
 *     tags: [Organization]
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
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [OWNER, ADMIN, MEMBER]
 *                 default: MEMBER
 *     responses:
 *       201:
 *         description: Invite sent
 *       409:
 *         description: User is already a member
 */
router.post(
  "/:id/invites",
  validate(sendInviteSchema),
  requirePermission("UPDATE", "COMPANIES"),
  asyncHandler(sendInvite),
);

/**
 * @swagger
 * /companies/invites/accept:
 *   post:
 *     summary: Accept a company invitation using a token
 *     description: The user must have a registered and verified account matching the invited email.
 *     tags: [Organization]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invite accepted — user added to company
 *       400:
 *         description: Invite expired, already used, or unregistered email
 *       404:
 *         description: Invite not found
 */
router.post(
  "/invites/accept",
  validate(acceptInviteSchema),
  asyncHandler(acceptInvite),
);

/**
 * @swagger
 * /companies/{id}/invites/{inviteId}:
 *   delete:
 *     summary: Cancel a pending invite
 *     tags: [Organization]
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
 *         name: inviteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Invite cancelled
 *       400:
 *         description: Cannot cancel a non-pending invite
 *       404:
 *         description: Invite not found
 */
router.delete(
  "/:id/invites/:inviteId",
  validate(cancelInviteSchema),
  requirePermission("UPDATE", "COMPANIES"),
  asyncHandler(cancelInvite),
);

export default router;
