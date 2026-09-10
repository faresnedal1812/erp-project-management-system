import * as vendorService from "../services/vendor.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getAllVendors = async (req, res) => {
  const result = await vendorService.getAllVendors(
    req.companyId,
    req.validated.query,
    req.user.id,
  );
  ApiResponse.ok(res, "Vendors retrieved successfully", result);
};

export const getVendorById = async (req, res) => {
  const { vendor } = await vendorService.getVendorById(
    req.companyId,
    req.validated.params.id,
    req.user.id,
  );
  ApiResponse.ok(res, "Vendor retrieved successfully", vendor);
};

export const createVendor = async (req, res) => {
  const vendor = await vendorService.createVendor(
    req.companyId,
    req.validated.body,
    req.user.id,
  );
  ApiResponse.created(res, "Vendor created successfully", vendor);
};

export const updateVendor = async (req, res) => {
  const vendor = await vendorService.updateVendor(
    req.companyId,
    req.validated.params.id,
    req.validated.body,
    req.user.id,
  );
  ApiResponse.ok(res, "Vendor updated successfully", vendor);
};

export const deleteVendor = async (req, res) => {
  await vendorService.deleteVendor(
    req.companyId,
    req.validated.params.id,
    req.user.id,
  );
  ApiResponse.noContent(res);
};
