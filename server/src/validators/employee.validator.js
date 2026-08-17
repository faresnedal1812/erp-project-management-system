import { z } from "zod";

const uuidParam = z.string().uuid("Invalid UUID format");

const EMPLOYMENT_STATUS = ["ACTIVE", "ON_LEAVE", "TERMINATED", "SUSPENDED"];

export const createEmployeeSchema = z.object({
  body: z.object({
    userId: uuidParam,
    departmentId: uuidParam,
    employeeNumber: z
      .string()
      .trim()
      .min(1, "Employee number is required")
      .max(50),
    position: z
      .string()
      .trim()
      .min(2, "Position must be at least 2 characters"),
    hireDate: z
      .string()
      .datetime({ message: "hireDate must be a valid ISO 8601 date" }),
    endDate: z
      .string()
      .datetime({ message: "endDate must be a valid ISO 8601 date" })
      .optional(),
    employmentStatus: z.enum(EMPLOYMENT_STATUS).optional(),
    salary: z.number().positive("Salary must be a positive number").optional(),
    bio: z.string().trim().optional(),
  }),
});
export const updateEmployeeSchema = z.object({
  params: z.object({ id: uuidParam }),
  body: z.object({
    departmentId: uuidParam.optional(),
    position: z
      .string()
      .trim()
      .min(2, "Position must be at least 2 characters")
      .optional(),
    hireDate: z
      .string()
      .datetime({ message: "hireDate must be a valid ISO 8601 date" })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: "endDate must be a valid ISO 8601 date" })
      .nullable()
      .optional(),
    employmentStatus: z.enum(EMPLOYMENT_STATUS).optional(),
    salary: z.number().positive("Salary must be a positive number").optional(),
    bio: z.string().trim().optional(),
  }),
});

export const employeeIdParamSchema = z.object({
  params: z.object({ id: uuidParam }),
});

export const employeeByUserSchema = z.object({
  params: z.object({ userId: uuidParam }),
});

export const employeesByDepartmentSchema = z.object({
  params: z.object({ departmentId: uuidParam }),
  query: z.object({
    includeInactive: z.enum(["true", "false"]).optional(),
  }),
});
