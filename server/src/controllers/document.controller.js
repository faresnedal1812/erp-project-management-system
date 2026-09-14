import * as documentService from "../services/document.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getAllDocuments = async (req, res) => {
  const result = await documentService.getAllDocuments(
    req.companyId,
    req.validated.query,
    req.user.id,
  );
  ApiResponse.ok(res, "Documents retrieved successfully", result);
};

export const getDocumentById = async (req, res) => {
  const doc = await documentService.getDocumentById(
    req.companyId,
    req.validated.params.id,
    req.user.id,
  );
  ApiResponse.ok(res, "Document retrieved successfully", doc);
};

export const uploadDocument = async (req, res) => {
  if (!req.file) throw ApiError.badRequest("No file uploaded");

  const doc = await documentService.uploadDocument(
    req.companyId,
    req.validated.body,
    req.file,
    req.user.id,
  );
  ApiResponse.created(res, "Document uploaded successfully", doc);
};

export const updateDocument = async (req, res) => {
  const doc = await documentService.updateDocument(
    req.companyId,
    req.validated.params.id,
    req.validated.body,
    req.user.id,
  );
  ApiResponse.ok(res, "Document updated successfully", doc);
};

export const deleteDocument = async (req, res) => {
  await documentService.deleteDocument(
    req.companyId,
    req.validated.params.id,
    req.user.id,
  );
  ApiResponse.noContent(res);
};
