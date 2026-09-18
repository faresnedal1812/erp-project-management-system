import { Router } from "express";
import {
  getAllDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  deleteDocument,
} from "../controllers/document.controller.js";
import {
  uploadDocumentSchema,
  updateDocumentSchema,
  documentIdParamSchema,
  documentQuerySchema,
} from "../validators/document.validator.js";
import asyncHandler from "../utils/asyncHandler.js";
import validate from "../middlewares/validate.js";
import protect from "../middlewares/auth.middleware.js";
import requireCompany from "../middlewares/requireCompany.js";
import requirePermission from "../middlewares/requirePermission.js";
import { documentUpload } from "../config/cloudinary.js";

const router = Router();

router.use(protect);
router.use(requireCompany);

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Company-wide document and file management
 */

/**
 * @swagger
 * /documents:
 *   post:
 *     summary: Upload a new document
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               scope:
 *                 type: string
 *                 enum: [COMPANY, PROJECT, CLIENT, VENDOR]
 *                 default: COMPANY
 *               category:
 *                 type: string
 *                 enum: [CONTRACT, INVOICE, REPORT, AGREEMENT, POLICY, OTHER]
 *                 default: OTHER
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: "Required when scope is PROJECT"
 *               clientId:
 *                 type: string
 *                 format: uuid
 *                 description: "Required when scope is CLIENT"
 *               vendorId:
 *                 type: string
 *                 format: uuid
 *                 description: "Required when scope is VENDOR"
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *       400:
 *         description: Invalid scope/FK combination
 */
router.post(
  "/",
  documentUpload.single("file"),
  validate(uploadDocumentSchema),
  requirePermission("CREATE", "DOCUMENTS"),
  asyncHandler(uploadDocument),
);

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: List all documents (paginated and filterable)
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [COMPANY, PROJECT, CLIENT, VENDOR]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [CONTRACT, INVOICE, REPORT, AGREEMENT, POLICY, OTHER]
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Paginated list of documents
 */
router.get(
  "/",
  validate(documentQuerySchema),
  requirePermission("READ", "DOCUMENTS"),
  asyncHandler(getAllDocuments),
);

/**
 * @swagger
 * /documents/{id}:
 *   get:
 *     summary: Get document metadata by ID
 *     tags: [Documents]
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
 *         description: Document metadata
 *       404:
 *         description: Document not found
 */
router.get(
  "/:id",
  validate(documentIdParamSchema),
  requirePermission("READ", "DOCUMENTS"),
  asyncHandler(getDocumentById),
);

/**
 * @swagger
 * /documents/{id}:
 *   patch:
 *     summary: Update document metadata (title, description, category) by uploader or Owner/Admin of company
 *     tags: [Documents]
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
 *               category:
 *                 type: string
 *                 enum: [CONTRACT, INVOICE, REPORT, AGREEMENT, POLICY, OTHER]
 *     responses:
 *       200:
 *         description: Document updated successfully
 *       404:
 *         description: Document not found
 */
router.patch(
  "/:id",
  validate(updateDocumentSchema),
  requirePermission("UPDATE", "DOCUMENTS"),
  asyncHandler(updateDocument),
);

/**
 * @swagger
 * /documents/{id}:
 *   delete:
 *     summary: Delete a document (uploader or Owner/Admin of company)
 *     tags: [Documents]
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
 *         description: Document deleted from DB and Cloudinary
 *       403:
 *         description: Only the uploader can delete this document
 */
router.delete(
  "/:id",
  validate(documentIdParamSchema),
  requirePermission("DELETE", "DOCUMENTS"),
  asyncHandler(deleteDocument),
);

export default router;
