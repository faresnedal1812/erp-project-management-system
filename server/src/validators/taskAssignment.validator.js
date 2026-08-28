import { z } from "zod";

const uuidParam = z.string().uuid("Invalid ID format");

// For assignment DELETE — needs both task id and employee id
export const deleteAssignmentSchema = z.object({
  params: z.object({
    id: uuidParam, // task id
    employeeId: uuidParam,
  }),
});

// POST body: assign an employee
export const createAssignmentSchema = z.object({
  params: z.object({
    id: uuidParam, // task id
  }),
  body: z.object({
    employeeId: uuidParam,
  }),
});
