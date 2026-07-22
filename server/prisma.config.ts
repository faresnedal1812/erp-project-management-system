import { defineConfig } from "@prisma/config";
import env from "./src/config/env.js";

export default defineConfig({
  earlyAccess: true,
  schema: "./prisma/schema.prisma",
  migrate: {
    connection: {
      url: env.databaseUrl,
    },
  },
});
