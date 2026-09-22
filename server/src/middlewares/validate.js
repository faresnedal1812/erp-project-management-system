import fs from "fs/promises";

/**
 * Generic Validation Middleware using Zod.
 * Evaluates req.body, req.query, or req.params against a Zod schema.
 * Reassigns the validated (and potentially transformed) data back to req.
 * If validation fails and Multer uploaded files (req.file/req.files), it cleans them up.
 * Throws ZodError which is caught by our global errorHandler.
 */
const validate = (schema) => (req, _res, next) => {
  try {
    const validatedData = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Saving validated data into custom object
    req.validated = validatedData;

    // req.validated = {
    //   body: validatedData.body ?? req.body,
    //   query: validatedData.query ?? req.query,
    //   params: validatedData.params ?? req.params,
    // };

    // This will cause TypeError after express 5
    // Query just a getter => read only

    // req.body = validatedData.body;
    // req.query = validatedData.query;
    // req.params = validatedData.params;

    next();
  } catch (error) {
    // If validation fails, clean up any Multer uploaded files to avoid junk accumulation
    if (req.file && req.file.path) {
      fs.unlink(req.file.path).catch(() => {});
    }
    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files.forEach((file) => fs.unlink(file.path).catch(() => {}));
      } else {
        Object.values(req.files)
          .flat()
          .forEach((file) => fs.unlink(file.path).catch(() => {}));
      }
    }

    next(error);
  }
};

export default validate;
