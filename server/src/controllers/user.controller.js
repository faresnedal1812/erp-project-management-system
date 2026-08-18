import * as userService from "../services/user.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getAllUsers = async (req, res) => {
  const users = await userService.getAllUsers();
  ApiResponse.ok(res, "Users retrieved successfully", users);
};

export const getUserById = async (req, res) => {
  const user = await userService.getUserById(req.validated.params.id);
  ApiResponse.ok(res, "User retrieved successfully", user);
};

export const updateUser = async (req, res) => {
  const user = await userService.updateUser(
    req.validated.params.id,
    req.validated.body,
  );
  ApiResponse.ok(res, "User updated successfully", user);
};

export const assignRolesToUser = async (req, res) => {
  const user = await userService.assignRolesToUser(
    req.validated.params.id,
    req.validated.body.roleIds,
  );
  ApiResponse.ok(res, "Roles assigned to user successfully", user);
};
