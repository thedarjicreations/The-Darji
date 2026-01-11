/**
 * Validation middleware using Zod schemas
 * @param {ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
export const validate = (schema) => {
    return async (req, res, next) => {
        try {
            // Validate request data
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });

            next();
        } catch (error) {
            // Pass Zod error to error handler
            error.name = 'ZodError';
            next(error);
        }
    };
};

/**
 * Sanitize request data to prevent NoSQL injection
 */
export const sanitize = (req, res, next) => {
    const sanitizeValue = (value) => {
        if (typeof value === 'object' && value !== null) {
            // Remove MongoDB operators
            Object.keys(value).forEach(key => {
                if (key.startsWith('$')) {
                    delete value[key];
                } else {
                    value[key] = sanitizeValue(value[key]);
                }
            });
        }
        return value;
    };

    req.body = sanitizeValue(req.body);
    req.query = sanitizeValue(req.query);
    req.params = sanitizeValue(req.params);

    next();
};
