import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/database.js";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

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

  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const tokens = generateTokens(newUser);
  return { user: newUser, tokens };
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

  const tokens = generateTokens(user);

  // Strip password before returning
  const { password: _, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, tokens };
};

/**
 * Issues a new access token using a valid refresh token.
 *
 * WHY A SEPARATE REFRESH TOKEN:
 * Access tokens are short-lived (15m) to limit exposure if stolen.
 * Refresh tokens are long-lived (7d) and only used to obtain new access tokens.
 * This separation means a leaked access token expires quickly,
 * while the refresh token can be revoked server-side in future (e.g., via Redis allow-list).
 */
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

/**
 * Logout — stateless JWT approach.
 *
 * WHY STATELESS LOGOUT:
 * JWTs are self-contained. Without a server-side token store (e.g., Redis blocklist),
 * the server cannot invalidate a token. The correct pattern here is to:
 * 1. Return success from the API.
 * 2. Have the client discard both tokens from storage.
 *
 * A future enhancement (Phase 7) would store active refresh tokens in Redis and
 * delete them on logout, enabling true server-side invalidation.
 */

export const logout = (userId) => {
  logger.info({ userId }, "User logged out");
  return { message: "Logged out successfully" };
};
