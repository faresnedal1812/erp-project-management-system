import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import prisma from "../config/database.js";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";
import {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "./email.service.js";

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const generateTokens = (user) => {
  const payload = { id: user.id, email: user.email };

  const accessToken = jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiry,
  });

  const refreshToken = jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiry,
  });

  return { accessToken, refreshToken };
};

export const register = async (userData) => {
  const { email, password, firstName, lastName } = userData;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw ApiError.conflict("User with this email already exists");
  }

  const hashedPassword = await hashPassword(password);
  const verificationToken = randomUUID();

  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      verificationToken,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Async dispatch welcome and verification emails (non-blocking)
  sendWelcomeEmail(newUser.email, newUser.firstName);
  sendVerificationEmail(newUser.email, newUser.firstName, verificationToken);

  return {
    user: newUser,
    message:
      "Registration successful. Please verify your email before logging in.",
  };
};

export const login = async (credentials) => {
  const { email, password } = credentials;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  if (!user.isActive) {
    throw ApiError.forbidden("Your account is deactivated");
  }

  if (!user.isVerified) {
    throw ApiError.forbidden("Please verify your email before logging in.");
  }

  const tokens = generateTokens(user);

  // Strip password before returning
  const {
    password: _,
    verificationToken: __,
    resetPasswordToken: ___,
    ...userWithoutPassword
  } = user;

  return { user: userWithoutPassword, tokens };
};

/**
 * Verify user email address via token
 */
export const verifyEmail = async (token) => {
  const user = await prisma.user.findUnique({
    where: { verificationToken: token },
  });

  if (!user) {
    throw ApiError.badRequest("Invalid or expired verification token");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      verificationToken: null,
    },
  });

  logger.info({ userId: user.id }, "User email verified successfully");
  return { message: "Email verified successfully" };
};

/**
 * Resend email verification token
 */
export const resendVerification = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Avoid user enumeration
    return { message: "If account exists, verification email has been sent" };
  }

  if (user.isVerified) {
    throw ApiError.badRequest("Account is already verified");
  }

  const newToken = randomUUID();

  await prisma.user.update({
    where: { id: user.id },
    data: { verificationToken: newToken },
  });

  sendVerificationEmail(user.email, user.firstName, newToken);

  return { message: "Verification email resent successfully" };
};

/**
 * Initiate forgot password request
 */
export const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Prevent user enumeration attacks
    return {
      message:
        "If that email is registered, password reset instructions have been sent",
    };
  }

  const resetToken = randomUUID();
  const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires,
    },
  });

  sendPasswordResetEmail(user.email, user.firstName, resetToken);

  return { message: "Password reset instructions sent to email" };
};

/**
 * Reset password using token
 */
export const resetPassword = async (token, newPassword) => {
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw ApiError.badRequest("Invalid or expired password reset token");
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  logger.info({ userId: user.id }, "User password reset successfully");
  return { message: "Password has been reset successfully" };
};

export const refreshToken = async (token) => {
  if (!token) {
    throw ApiError.unauthorized("Refresh token is missing");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtRefreshSecret);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, email: true, isActive: true },
  });

  if (!user) {
    throw ApiError.unauthorized("User no longer exists");
  }

  if (!user.isActive) {
    throw ApiError.forbidden("Your account has been deactivated");
  }

  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    env.jwtAccessSecret,
    { expiresIn: env.jwtAccessExpiry },
  );

  return { accessToken };
};

export const logout = (userId) => {
  logger.info({ userId }, "User logged out");
  return { message: "Logged out successfully" };
};
