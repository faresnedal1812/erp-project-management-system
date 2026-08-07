import * as authService from "../services/auth.service.js";
import ApiResponse from "../utils/ApiResponse.js";

/**
 * Controller strictly handles receiving the request and sending the response.
 * Business logic is delegated entirely to authService.
 */

export const register = async (req, res) => {
  const result = await authService.register(req.body);
  ApiResponse.created(res, result.message, result.user);
};

export const login = async (req, res) => {
  const result = await authService.login(req.body);
  ApiResponse.ok(res, "Login successful", result);
};

export const refresh = async (req, res) => {
  const result = await authService.refreshToken(req.body.refreshToken);
  ApiResponse.ok(res, "Token refreshed successfully", result);
};

export const logout = (req, res) => {
  const result = authService.logout(req.user.id);
  ApiResponse.ok(res, result.message);
};

export const getMe = (req, res) => {
  ApiResponse.ok(res, "Authenticated user profile", req.user);
};

export const verifyEmail = async (req, res) => {
  const result = await authService.verifyEmail(req.query.token);
  ApiResponse.ok(res, result.message);
};

export const resendVerification = async (req, res) => {
  const result = await authService.resendVerification(req.body.email);
  ApiResponse.ok(res, result.message);
};

export const forgotPassword = async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  ApiResponse.ok(res, result.message);
};

export const resetPassword = async (req, res) => {
  const result = await authService.resetPassword(
    req.body.token,
    req.body.password,
  );
  ApiResponse.ok(res, result.message);
};
