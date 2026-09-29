import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Explicitly load .env.test for Jest workers before any application code runs
dotenv.config({
  path: path.resolve(__dirname, "../../.env.test"),
  override: true,
});
