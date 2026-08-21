import { Router } from "express";
import validate from "../middlewares/validate.js";
import protect from "../middlewares/auth.middleware.js";
import requireCompany from "../middlewares/requireCompany.js";
import requirePermission from "../middlewares/requirePermission.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  createEmployeeSchema,
  employeeIdParamSchema,
  employeesByDepartmentSchema,
  updateEmployeeSchema,
  employeeByUserSchema,
} from "../validators/employee.validator.js";
import {
  getEmployeesByDepartment,
  createEmployee,
  getEmployeeById,
  getEmployeeByUserId,
  terminateEmployee,
  updateEmployee,
} from "../controllers/employee.controller.js";

const router = Router();

router.use(protect);
router.use(requireCompany);

/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Employee management
 */

/**
 * @swagger
 * /employees/department/{departmentId}:
 *   get:
 *     summary: Get all employees in a department
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include deactivated employees (default false)
 *     responses:
 *       200:
 *         description: List of employees in the department
 */
router.get(
  "/department/:departmentId",
  validate(employeesByDepartmentSchema),
  requirePermission("READ", "EMPLOYEES"),
  asyncHandler(getEmployeesByDepartment),
);

/**
 * @swagger
 * /employees/user/{userId}:
 *   get:
 *     summary: Get an employee profile by user ID
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Employee profile details
 *       404:
 *         description: Employee not found
 */
router.get(
  "/user/:userId",
  validate(employeeByUserSchema),
  requirePermission("READ", "EMPLOYEES"),
  asyncHandler(getEmployeeByUserId),
);

/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     summary: Get an employee by ID
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Employee details
 *       404:
 *         description: Employee not found
 */
router.get(
  "/:id",
  validate(employeeIdParamSchema),
  requirePermission("READ", "EMPLOYEES"),
  asyncHandler(getEmployeeById),
);

/**
 * @swagger
 * /employees:
 *   post:
 *     summary: Create a new employee
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, departmentId, employeeNumber, position, hireDate]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               employeeNumber:
 *                 type: string
 *               position:
 *                 type: string
 *               hireDate:
 *                 type: string
 *                 format: date-time
 *               salary:
 *                 type: number
 *               bio:
 *                 type: string
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       400:
 *         description: Invalid input data or validation error
 *       409:
 *         description: User is already an employee in this company
 */
router.post(
  "/",
  validate(createEmployeeSchema),
  requirePermission("CREATE", "EMPLOYEES"),
  asyncHandler(createEmployee),
);

/**
 * @swagger
 * /employees/{id}:
 *   put:
 *     summary: Update an employee's details
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               position:
 *                 type: string
 *               hireDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               employmentStatus:
 *                 type: string
 *               salary:
 *                 type: number
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Employee updated securely
 *       404:
 *         description: Employee not found
 */
router.put(
  "/:id",
  validate(updateEmployeeSchema),
  requirePermission("UPDATE", "EMPLOYEES"),
  asyncHandler(updateEmployee),
);

/**
 * @swagger
 * /employees/{id}/terminate:
 *   post:
 *     summary: Terminate an employee's employment
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Employee terminated successfully
 *       404:
 *         description: Employee not found
 */
router.post(
  "/:id/terminate",
  validate(employeeIdParamSchema),
  requirePermission("UPDATE", "EMPLOYEES"),
  asyncHandler(terminateEmployee),
);

export default router;
