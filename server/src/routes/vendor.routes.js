import { Router } from "express";
import {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
} from "../controllers/vendor.controller.js";
import {
  createVendorSchema,
  updateVendorSchema,
  vendorIdParamSchema,
  vendorQuerySchema,
} from "../validators/vendor.validator.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import validate from "../middlewares/validate.js";
import protect from "../middlewares/auth.middleware.js";
import {
  requireCompany,
  requirePermission,
} from "../middlewares/rbac.middleware.js";
const router = Router();
router.use(protect);
router.use(requireCompany);

/**
 * @swagger
 * tags:
 *   name: Vendors
 *   description: External vendor and contractor management
 */

/**
 * @swagger
 * /vendors:
 *   post:
 *     summary: Create a new vendor
 *     tags: [Vendors]
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
 *               type:
 *                 type: string
 *                 enum: [CONTRACTOR, SUPPLIER, SERVICE_PROVIDER, CONSULTANT, OTHER]
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
 *               taxId:
 *                 type: string
 *                 description: "VAT or Tax Identification Number for invoicing"
 *               paymentTerms:
 *                 type: string
 *                 description: "e.g. Net 30, Net 60"
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vendor created successfully
 *       409:
 *         description: A vendor with this name already exists
 */
router.post(
  "/",
  requirePermission("CREATE", "VENDORS"),
  validate(createVendorSchema),
  asyncHandler(createVendor),
);

/**
 * @swagger
 * /vendors:
 *   get:
 *     summary: Get all vendors for the company
 *     tags: [Vendors]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [CONTRACTOR, SUPPLIER, SERVICE_PROVIDER, CONSULTANT, OTHER]
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
 *         description: Paginated list of vendors
 */
router.get(
  "/",
  requirePermission("READ", "VENDORS"),
  validate(vendorQuerySchema),
  asyncHandler(getAllVendors),
);

/**
 * @swagger
 * /vendors/{id}:
 *   get:
 *     summary: Get vendor details by ID
 *     tags: [Vendors]
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
 *         description: Vendor details
 *       404:
 *         description: Vendor not found
 */
router.get(
  "/:id",
  requirePermission("READ", "VENDORS"),
  validate(vendorIdParamSchema),
  asyncHandler(getVendorById),
);

/**
 * @swagger
 * /vendors/{id}:
 *   put:
 *     summary: Update vendor details
 *     tags: [Vendors]
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
 *               type:
 *                 type: string
 *                 enum: [CONTRACTOR, SUPPLIER, SERVICE_PROVIDER, CONSULTANT, OTHER]
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
 *               taxId:
 *                 type: string
 *               paymentTerms:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vendor updated successfully
 *       404:
 *         description: Vendor not found
 */
router.put(
  "/:id",
  requirePermission("UPDATE", "VENDORS"),
  validate(updateVendorSchema),
  asyncHandler(updateVendor),
);

/**
 * @swagger
 * /vendors/{id}:
 *   delete:
 *     summary: Archive a vendor (soft delete)
 *     tags: [Vendors]
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
 *         description: Vendor archived successfully
 *       404:
 *         description: Vendor not found
 */
router.delete(
  "/:id",
  requirePermission("DELETE", "VENDORS"),
  validate(vendorIdParamSchema),
  asyncHandler(deleteVendor),
);

export default router;
