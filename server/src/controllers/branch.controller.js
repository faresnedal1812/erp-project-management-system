import * as branchService from "../services/branch.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getBranchesByCompany = async (req, res) => {
  const includeInactive = req.validated?.query?.includeInactive === "true";
  const branches = await branchService.getBranchesByCompany(
    req.companyId,
    includeInactive,
  );
  ApiResponse.ok(res, "Branches retrieved successfully", branches);
};
export const getBranchById = async (req, res) => {
  const branch = await branchService.getBranchById(
    req.validated.params.id,
    req.companyId,
  );
  ApiResponse.ok(res, "Branch retrieved successfully", branch);
};
export const createBranch = async (req, res) => {
  const branch = await branchService.createBranch(
    req.validated.body,
    req.companyId,
  );
  ApiResponse.created(res, "Branch created successfully", branch);
};
export const updateBranch = async (req, res) => {
  const branch = await branchService.updateBranch(
    req.validated.params.id,
    req.companyId,
    req.validated.body,
  );
  ApiResponse.ok(res, "Branch updated successfully", branch);
};
export const deleteBranch = async (req, res) => {
  await branchService.deleteBranch(req.validated.params.id, req.companyId);
  ApiResponse.noContent(res);
};
