import crypto from "crypto";
import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";
import { sendCompanyInviteEmail } from "./companyInvite.email.service.js";

// Invite TTL: 7 days
const INVITE_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000;

// ── Helpers ──────────────────────────────────────────────────

const SETTINGS_SELECT = {
  id: true,
  companyId: true,
  timezone: true,
  language: true,
  currency: true,
  dateFormat: true,
};

const INVITE_SELECT = {
  id: true,
  email: true,
  role: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  inviter: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
};

const findCompanyOrFail = async (companyId) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, isActive: true },
  });
  if (!company) throw ApiError.notFound("Company not found");
  if (!company.isActive) throw ApiError.badRequest("Company is inactive");
  return company;
};

// ── Company Settings ─────────────────────────────────────────

/**
 * Returns the settings for a company.
 * If none exist yet, returns sensible defaults without persisting them.
 */
export const getSettings = async (companyId) => {
  await findCompanyOrFail(companyId);

  const settings = await prisma.companySettings.findUnique({
    where: { companyId },
    select: SETTINGS_SELECT,
  });

  // Return defaults if not yet configured
  if (!settings) {
    return {
      companyId,
      timezone: "UTC",
      language: "en",
      currency: "USD",
      dateFormat: "YYYY-MM-DD",
    };
  }

  return settings;
};

/**
 * Creates or updates company settings (upsert).
 *
 * WHY UPSERT:
 * Settings are optional — not every company configures them. Using upsert
 * means the caller doesn't need to know whether settings already exist,
 * keeping the API surface simple (one endpoint handles both create & update).
 */
export const upsertSettings = async (companyId, data) => {
  await findCompanyOrFail(companyId);

  const settings = await prisma.companySettings.upsert({
    where: { companyId },
    create: {
      companyId,
      ...(data.timezone && { timezone: data.timezone }),
      ...(data.language && { language: data.language }),
      ...(data.currency && { currency: data.currency }),
      ...(data.dateFormat && { dateFormat: data.dateFormat }),
    },
    update: {
      ...(data.timezone !== undefined && { timezone: data.timezone }),
      ...(data.language !== undefined && { language: data.language }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.dateFormat !== undefined && { dateFormat: data.dateFormat }),
    },
    select: SETTINGS_SELECT,
  });

  logger.info({ companyId }, "Company settings upserted");
  return settings;
};

// ── Company Invites ──────────────────────────────────────────

/**
 * Sends an invite to a user (by email) to join a company.
 *
 * Design decisions:
 * - If a PENDING invite already exists for the same company+email, we resend
 *   (re-generate token + reset expiry) instead of creating a duplicate.
 * - If the user is already a member, we reject immediately.
 * - Token is a cryptographically random 32-byte hex string.
 */
export const sendInvite = async (
  companyId,
  invitedByUserId,
  email,
  role = "MEMBER",
) => {
  const company = await findCompanyOrFail(companyId);

  // Fetch the inviter's name for the email
  const inviter = await prisma.user.findUnique({
    where: { id: invitedByUserId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!inviter) throw ApiError.notFound("Inviter user not found");

  // Check if the invitee is already a member
  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (targetUser) {
    const alreadyMember = await prisma.companyMember.findUnique({
      where: {
        userId_companyId: { userId: targetUser.id, companyId },
      },
    });
    if (alreadyMember) {
      throw ApiError.conflict("This user is already a member of the company");
    }
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_EXPIRES_IN_MS);

  // Upsert: re-issue invite if one PENDING already exists
  const existingInvite = await prisma.companyInvite.findUnique({
    where: { companyId_email: { companyId, email } },
    select: { id: true, status: true },
  });

  let invite;

  if (existingInvite && existingInvite.status === "PENDING") {
    invite = await prisma.companyInvite.update({
      where: { id: existingInvite.id },
      data: { token, expiresAt, role, invitedBy: invitedByUserId },
      select: INVITE_SELECT,
    });
    logger.info({ companyId, email }, "Invite re-issued (token refreshed)");
  } else if (existingInvite) {
    // Previous invite was ACCEPTED / EXPIRED / CANCELLED — create a fresh one
    await prisma.companyInvite.delete({ where: { id: existingInvite.id } });
    invite = await prisma.companyInvite.create({
      data: {
        companyId,
        invitedBy: invitedByUserId,
        email,
        role,
        token,
        expiresAt,
      },
      select: INVITE_SELECT,
    });
  } else {
    invite = await prisma.companyInvite.create({
      data: {
        companyId,
        invitedBy: invitedByUserId,
        email,
        role,
        token,
        expiresAt,
      },
      select: INVITE_SELECT,
    });
    logger.info({ companyId, email }, "Invite created");
  }

  // Send email (non-blocking)
  const inviterName = `${inviter.firstName} ${inviter.lastName}`;
  sendCompanyInviteEmail(email, inviterName, company.name, token);

  return invite;
};

/**
 * Accepts an invite using its token.
 *
 * Flow:
 * 1. Look up invite by token.
 * 2. Validate it is PENDING and not expired.
 * 3. Look up the user by the invite's email (must be a registered, verified account).
 * 4. Add user to company as CompanyMember (transactional).
 * 5. Mark invite as ACCEPTED.
 */
export const acceptInvite = async (token) => {
  const invite = await prisma.companyInvite.findUnique({
    where: { token },
    select: {
      id: true,
      companyId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
    },
  });

  if (!invite)
    throw ApiError.notFound("Invite not found or has already been used");
  if (invite.status !== "PENDING") {
    throw ApiError.badRequest(
      `This invite has already been ${invite.status.toLowerCase()}`,
    );
  }
  if (new Date() > invite.expiresAt) {
    // Mark expired in DB, then reject
    await prisma.companyInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    throw ApiError.badRequest(
      "This invite has expired. Please request a new one.",
    );
  }

  // The invited email must belong to a registered & verified user
  const user = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true, isVerified: true },
  });

  if (!user) {
    throw ApiError.badRequest(
      "No account found for this email. Please register first.",
    );
  }
  if (!user.isVerified) {
    throw ApiError.badRequest(
      "Please verify your email address before accepting an invite.",
    );
  }

  // Prevent duplicate membership if user was added another way in the meantime
  const alreadyMember = await prisma.companyMember.findUnique({
    where: {
      userId_companyId: { userId: user.id, companyId: invite.companyId },
    },
  });
  if (alreadyMember) {
    await prisma.companyInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    });
    throw ApiError.conflict("You are already a member of this company");
  }

  // Transaction: add member + mark invite accepted
  await prisma.$transaction([
    prisma.companyMember.create({
      data: {
        userId: user.id,
        companyId: invite.companyId,
        role: invite.role,
      },
    }),
    prisma.companyInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    }),
  ]);

  logger.info(
    { companyId: invite.companyId, userId: user.id },
    "Invite accepted — user added to company",
  );

  return {
    message: "Invitation accepted. You are now a member of the company.",
  };
};

/**
 * Cancels a pending invite by ID.
 * Only PENDING invites can be cancelled.
 */
export const cancelInvite = async (companyId, inviteId) => {
  await findCompanyOrFail(companyId);

  const invite = await prisma.companyInvite.findFirst({
    where: { id: inviteId, companyId },
    select: { id: true, status: true },
  });

  if (!invite) throw ApiError.notFound("Invite not found");
  if (invite.status !== "PENDING") {
    throw ApiError.badRequest(
      `Cannot cancel an invite that is already ${invite.status.toLowerCase()}`,
    );
  }

  await prisma.companyInvite.update({
    where: { id: inviteId },
    data: { status: "CANCELLED" },
  });

  logger.info({ companyId, inviteId }, "Invite cancelled");
};

/**
 * Lists all invites for a company.
 */
export const listInvites = async (companyId) => {
  await findCompanyOrFail(companyId);

  return prisma.companyInvite.findMany({
    where: { companyId },
    select: INVITE_SELECT,
    orderBy: { createdAt: "desc" },
  });
};
