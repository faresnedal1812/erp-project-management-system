import * as organizationService from "../services/organization.service.js";
import ApiResponse from "../utils/ApiResponse.js";

// ── Company Settings ─────────────────────────────────────────

export const getSettings = async (req, res) => {
  const settings = await organizationService.getSettings(
    req.validated.params.id,
  );
  ApiResponse.ok(res, "Company settings retrieved successfully", settings);
};

export const upsertSettings = async (req, res) => {
  const settings = await organizationService.upsertSettings(
    req.validated.params.id,
    req.validated.body,
  );
  ApiResponse.ok(res, "Company settings updated successfully", settings);
};

// ── Company Invites ──────────────────────────────────────────

export const listInvites = async (req, res) => {
  const invites = await organizationService.listInvites(
    req.validated.params.id,
  );
  ApiResponse.ok(res, "Invites retrieved successfully", invites);
};

export const sendInvite = async (req, res) => {
  const invite = await organizationService.sendInvite(
    req.validated.params.id,
    req.user.id,
    req.validated.body.email,
    req.validated.body.role,
  );
  ApiResponse.created(res, "Invite sent successfully", invite);
};

export const acceptInvite = async (req, res) => {
  const result = await organizationService.acceptInvite(
    req.validated.body.token,
    req.user.id,
  );
  ApiResponse.ok(res, result.message);
};

export const cancelInvite = async (req, res) => {
  await organizationService.cancelInvite(
    req.validated.params.id,
    req.validated.params.inviteId,
  );
  ApiResponse.noContent(res);
};
