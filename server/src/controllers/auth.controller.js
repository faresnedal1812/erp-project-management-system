// import * as authService from "../services/auth.service.js";
// import ApiResponse from "../utils/ApiResponse.js";

// /**
//  * Controller strictly handles receiving the request and sending the response.
//  * Business logic is delegated to the authService.
//  */

// export const register = async (req, res) => {
//   const result = await authService.register(req.body);
//   ApiResponse.created(res, "User registered successfully", result);
// };

// export const login = async (req, res) => {
//   const result = await authService.login(req.body);
//   ApiResponse.ok(res, "Login successful", result);
// };

import * as authService from "../services/auth.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const register = async (req, res) => {
  const results = await authService.register(req.body);
  ApiResponse.created(res, "User registered successfully", results);
};

export const login = async (req, res) => {
  const results = await authService.login(req.body);
  ApiResponse.ok(res, "Login successful", results);
};
