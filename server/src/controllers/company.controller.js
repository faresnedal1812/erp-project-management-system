import * as companyService from "../services/company.service.js";
import ApiResponse from "../utils/ApiResponse.js";

// ── Company CRUD ─────────────────────────────────────────────

export const getAllCompanies = async (req, res) => {
  const companies = await companyService.getAllCompanies();
  ApiResponse.ok(res, "Companies retrieved successfully", companies);
};

export const getCompanyById = async (req, res) => {
  const company = await companyService.getCompanyById(req.validated.params.id);
  ApiResponse.ok(res, "Company retrieved successfully", company);
};

export const createCompany = async (req, res) => {
  // req.user.id comes from the auth middleware — the creator becomes OWNER.
  const company = await companyService.createCompany(
    req.validated.body,
    req.user.id,
  );
  ApiResponse.created(res, "Company created successfully", company);
};

export const updateCompany = async (req, res) => {
  const company = await companyService.updateCompany(
    req.validated.params.id,
    req.validated.body,
  );
  ApiResponse.ok(res, "Company updated successfully", company);
};

export const deleteCompany = async (req, res) => {
  await companyService.deleteCompany(req.validated.params.id);
  ApiResponse.noContent(res);
};

// ── Member Management ────────────────────────────────────────

export const getCompanyMembers = async (req, res) => {
  const members = await companyService.getCompanyMembers(
    req.validated.params.id,
  );
  ApiResponse.ok(res, "Company members retrieved successfully", members);
};

export const addMember = async (req, res) => {
  const member = await companyService.addMember(
    req.validated.params.id,
    req.validated.body.userId,
    req.validated.body.role,
  );
  ApiResponse.created(res, "Member added to company successfully", member);
};

export const updateMemberRole = async (req, res) => {
  const member = await companyService.updateMemberRole(
    req.validated.params.id,
    req.validated.params.userId,
    req.validated.body.role,
  );
  ApiResponse.ok(res, "Member role updated successfully", member);
};

export const removeMember = async (req, res) => {
  await companyService.removeMember(
    req.validated.params.id,
    req.validated.params.userId,
  );
  ApiResponse.noContent(res);
};
