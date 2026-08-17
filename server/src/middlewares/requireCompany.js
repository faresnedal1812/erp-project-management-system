import ApiError from "../utils/ApiError.js";
import prisma from "../config/database.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * requireCompany Middleware
 *
 * HOW IT WORKS:
 * Extracts the active company from the 'x-company-id' header.
 * Verifies the authenticated user is an active member of this company.
 * Attaches req.companyId and req.companyRole to the request object.
 *
 * MUST BE USED AFTER 'protect'.
 */
const requireCompany = asyncHandler(async (req, res, next) => {
  const companyId = req.headers["x-company-id"];

  if (!companyId) {
    return next(ApiError.badRequest("x-company-id header is missing"));
  }

  // user is already attached by protect middleware
  const userId = req.user?.id;
  if (!userId) {
    return next(ApiError.unauthorized("Authentication required"));
  }

  // verify user is a member of the requested company
  const companyMember = await prisma.companyMember.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
    select: {
      role: true,
      company: {
        select: {
          isActive: true,
        },
      },
    },
  });

  if (!companyMember) {
    return next(ApiError.forbidden("You are not a member of this company"));
  }

  if (!companyMember.company.isActive) {
    return next(
      ApiError.forbidden(
        "This company is currently inactive and cannot be accessed",
      ),
    );
  }

  // Attach company context to request for downstream controllers/services
  req.companyId = companyId;
  req.companyRole = companyMember.role;

  next();
});

export default requireCompany;
