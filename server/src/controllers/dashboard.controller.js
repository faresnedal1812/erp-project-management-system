import * as dashboardService from "../services/dashboard.service.js";
import ApiResponse from "../utils/ApiResponse.js";

/**
 * GET /api/v1/dashboard
 * Returns aggregated company-scoped statistics.
 * Access: any CompanyMember with READ:DASHBOARD permission (OWNER/ADMIN/MEMBER).
 */
export const getDashboard = async (req, res) => {
  const { companyId } = req;
  const data = await dashboardService.getDashboard(companyId);
  ApiResponse.ok(
    res,
    "Dashboard & Statistics data retrieved successfully",
    data,
  );
};
