import { defineConfig } from "@prisma/config";
import env from "./src/config/env.js";

export default defineConfig({
  earlyAccess: true,
  schema: "./prisma/schema.prisma",
  datasource: {
    url: env.databaseUrl,
  },
  migrate: {
    connection: {
      url: env.databaseUrl,
    },
  },
});
