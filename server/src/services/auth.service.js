import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/database.js";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";

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
