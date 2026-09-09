import { Router } from "express";
import {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient,
} from "../controllers/client.controller.js";
import {
  createClientSchema,
  updateClientSchema,
  clientIdParamSchema,
  clientQuerySchema,
} from "../validators/client.validator.js";
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
 *   name: Clients
 *   description: External client management operations
 */

/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Create a new client
 *     tags: [Clients]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               contactName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               website:
 *                 type: string
 *               address:
 *                 type: string
 *               industry:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Client created successfully
 *       409:
 *         description: Client with this name already exists
 */
router.post(
  "/",
  validate(createClientSchema),
  requirePermission("CREATE", "CLIENTS"),
  asyncHandler(createClient),
);

/**
 * @swagger
 * /clients:
 *   get:
 *     summary: Get all clients for the company
 *     tags: [Clients]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, ARCHIVED]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of clients
 */
router.get(
  "/",
  validate(clientQuerySchema),
  requirePermission("READ", "CLIENTS"),
  asyncHandler(getAllClients),
);

/**
 * @swagger
 * /clients/{id}:
 *   get:
 *     summary: Get client details by ID
 *     tags: [Clients]
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
 *         description: Client details
 *       404:
 *         description: Client not found
 */
router.get(
  "/:id",
  validate(clientIdParamSchema),
  requirePermission("READ", "CLIENTS"),
  asyncHandler(getClientById),
);

/**
 * @swagger
 * /clients/{id}:
 *   put:
 *     summary: Update client details
 *     tags: [Clients]
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
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, ARCHIVED]
 *               contactName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               website:
 *                 type: string
 *               address:
 *                 type: string
 *               industry:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Client updated successfully
 *       404:
 *         description: Client not found
 */
router.put(
  "/:id",
  validate(updateClientSchema),
  requirePermission("UPDATE", "CLIENTS"),
  asyncHandler(updateClient),
);

/**
 * @swagger
 * /clients/{id}:
 *   delete:
 *     summary: Archive a client
 *     tags: [Clients]
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
 *         description: Client archived successfully
 *       404:
 *         description: Client not found
 */
router.delete(
  "/:id",
  validate(clientIdParamSchema),
  requirePermission("DELETE", "CLIENTS"),
  asyncHandler(deleteClient),
);

export default router;
