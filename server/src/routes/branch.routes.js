import { Router } from "express";
import {
  getBranchesByCompany,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
} from "../controllers/branch.controller.js";
import {
  branchIdParamSchema,
  createBranchSchema,
  updateBranchSchema,
  branchListQuerySchema,
} from "../validators/branch.validator.js";
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
 *   name: Branches
 *   description: Branch management
 */
/**
 * @swagger
 * /branches:
 *   get:
 *     summary: List all branches for a company
 *     tags: [Branches]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include deactivated branches (default false)
 *     responses:
 *       200:
 *         description: List of branches (HQ first, then alphabetical)
 *       404:
 *         description: Company not found
 */
router.get(
  "/",
  validate(branchListQuerySchema),
  requirePermission("READ", "BRANCHES"),
  asyncHandler(getBranchesByCompany),
);
/**
 * @swagger
 * /branches/{id}:
 *   get:
 *     summary: Get a single branch by ID
 *     tags: [Branches]
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
 *         description: Branch details
 *       404:
 *         description: Branch not found
 */
router.get(
  "/:id",
  validate(branchIdParamSchema),
  requirePermission("READ", "BRANCHES"),
  asyncHandler(getBranchById),
);
/**
 * @swagger
 * /branches:
 *   post:
 *     summary: Create a new branch
 *     description: If isHeadquarters is true, the existing HQ branch is demoted automatically.
 *     tags: [Branches]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
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
 *                 example: Cairo Branch
 *               code:
 *                 type: string
 *                 example: CAI-01
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               isHeadquarters:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Branch created successfully
 *       409:
 *         description: Branch code already exists in this company
 */
router.post(
  "/",
  validate(createBranchSchema),
  requirePermission("CREATE", "BRANCHES"),
  asyncHandler(createBranch),
);
/**
 * @swagger
 * /branches/{id}:
 *   put:
 *     summary: Update a branch
 *     tags: [Branches]
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
 *               code:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               isHeadquarters:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Branch updated successfully
 *       404:
 *         description: Branch not found
 *       409:
 *         description: Branch code conflict
 */
router.put(
  "/:id",
  validate(updateBranchSchema),
  requirePermission("UPDATE", "BRANCHES"),
  asyncHandler(updateBranch),
);
/**
 * @swagger
 * /branches/{id}:
 *   delete:
 *     summary: Deactivate a branch (soft delete)
 *     tags: [Branches]
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
 *         description: Branch deactivated
 *       404:
 *         description: Branch not found
 */
router.delete(
  "/:id",
  validate(branchIdParamSchema),
  requirePermission("DELETE", "BRANCHES"),
  asyncHandler(deleteBranch),
);
export default router;
