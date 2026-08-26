import * as taskService from "../services/task.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getProjectTasks = async (req, res) => {
  const tasks = await taskService.getProjectTasks(
    req.validated.params.id,
    req.validated.query,
    req.companyId,
    req.user.id,
  );
  ApiResponse.ok(res, "Tasks retrieved successfully", tasks);
};

export const getTaskById = async (req, res) => {
  const task = await taskService.getTaskById(
    req.validated.params.id,
    req.companyId,
    req.user.id,
  );
  ApiResponse.ok(res, "Task retrieved successfully", task);
};

export const createTask = async (req, res) => {
  const task = await taskService.createTask(
    req.validated.params.id,
    req.validated.body,
    req.companyId,
    req.user.id,
  );
  ApiResponse.created(res, "Task created successfully", task);
};

export const updateTask = async (req, res) => {
  const task = await taskService.updateTask(
    req.validated.params.id,
    req.validated.body,
    req.companyId,
    req.user.id,
  );
  ApiResponse.ok(res, "Task updated successfully", task);
};

export const deleteTask = async (req, res) => {
  await taskService.deleteTask(
    req.validated.params.id,
    req.companyId,
    req.user.id,
  );
  ApiResponse.noContent(res);
};
