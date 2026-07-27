/**
 * Generic Validation Middleware using Zod.
 * Evaluates req.body, req.query, or req.params against a Zod schema.
 * Throws ZodError which is caught by our global errorHandler.
 */
const validate = (schema) => (req, _res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    next(error);
  }
};

export default validate;
