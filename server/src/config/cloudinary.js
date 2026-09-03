import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import crypto from "crypto";
import env from "./env.js";

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
});

// Allowed MIME types for task attachments
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: `erp/tasks/${req.validated.params.id}`,
    resource_type: "auto",
    // Preserve original file name (sanitized)
    public_id: `${crypto.randomUUID()}-${file.originalname.replace(/\s+/g, "_")}`,
  }),
});

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    fields: 0,
    parts: 1,
    fieldSize: 1024,
    fieldArrayIndexLimit: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Unsupported file type. Allowed: images, PDF, Word, Excel, ZIP",
        ),
        false,
      );
    }
  },
});

export { cloudinary };
