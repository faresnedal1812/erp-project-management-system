import * as auditLogService from "../services/auditLog.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getAuditLogs = async (req, res) => {
  const result = await auditLogService.getAuditLogs(
    req.companyId,
    req.user.id,
    req.validated.query,
  );
  ApiResponse.ok(res, "Audit logs retrieved successfully", result);
};

export const getAuditLogById = async (req, res) => {
  const log = await auditLogService.getAuditLogById(
    req.companyId,
    req.validated.params.id,
    req.user.id,
  );
  ApiResponse.ok(res, "Audit log retrieved successfully", log);
};
