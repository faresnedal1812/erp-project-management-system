/**
 * Generic Validation Middleware using Zod.
 * Evaluates req.body, req.query, or req.params against a Zod schema.
 * Reassigns the validated (and potentially transformed) data back to req.
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

    // This will cause TypeError after express 5
    // Query just a getter => read only

    // req.body = validatedData.body;
    // req.query = validatedData.query;
    // req.params = validatedData.params;

    next();
  } catch (error) {
    next(error);
  }
};

export default validate;
