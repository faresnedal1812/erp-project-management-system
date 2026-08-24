// import { z } from "zod";

// const uuidParam = z.string().uuid("Invalid ID format");

// export const projectMemberParamSchema = z.object({
//   params: z.object({
//     id: uuidParam,
//     employeeId: uuidParam,
//   }),
// });

// export const addProjectMemberSchema = z.object({
//   params: z.object({
//     id: uuidParam,
//   }),
//   body: z.object({
//     employeeId: uuidParam,
//     role: z.enum(["MANAGER", "CONTRIBUTOR", "OBSERVER"]).optional(),
//   }),
// });

// export const updateProjectMemberSchema = z.object({
//   params: z.object({
//     id: uuidParam,
//     employeeId: uuidParam,
//   }),
//   body: z.object({
//     role: z.enum(["MANAGER", "CONTRIBUTOR", "OBSERVER"]),
//   }),
// });

import { z } from "zod";

const uuidParam = z.string().uuid("Invalid ID format");

export const projectMemberParamSchema = z.object({
  params: z.object({
    id: uuidParam,
    employeeId: uuidParam,
  }),
});

export const addProjectMemberSchema = z.object({
  params: z.object({ id: uuidParam }),
  body: z.object({
    employeeId: uuidParam,
    role: z.enum(["MANAGER", "CONTRIBUTOR", "OBSERVER"]).optional(),
  }),
});

export const updateProjectMemberSchema = z.object({
  params: z.object({ id: uuidParam, employeeId: uuidParam }),
  body: z.object({
    role: z.enum(["MANAGER", "CONTRIBUTOR", "OBSERVER"]),
  }),
});
