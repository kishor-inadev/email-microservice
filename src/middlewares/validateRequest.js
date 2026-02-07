/**
 * Request Validation Middleware Factory
 * Creates middleware for validating request body, query, or params using Joi schemas
 */

const { ValidationError } = require('../utils/errors');

/**
 * Create a validation middleware for request body
 *
 * @param {Object} schema - Joi validation schema
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 *
 * @example
 * router.post('/send-email', validateBody(emailPayloadSchema), controller.sendEmail);
 */
function validateBody(schema, options = {}) {
    const validationOptions = {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
        ...options
    };

    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, validationOptions);

        if (error) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                type: detail.type
            }));

            return next(new ValidationError('Request validation failed', details));
        }

        // Replace body with validated and sanitized value
        req.body = value;
        next();
    };
}

/**
 * Create a validation middleware for query parameters
 *
 * @param {Object} schema - Joi validation schema
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
function validateQuery(schema, options = {}) {
    const validationOptions = {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
        ...options
    };

    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, validationOptions);

        if (error) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                type: detail.type
            }));

            return next(new ValidationError('Query parameter validation failed', details));
        }

        req.query = value;
        next();
    };
}

/**
 * Create a validation middleware for URL params
 *
 * @param {Object} schema - Joi validation schema
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
function validateParams(schema, options = {}) {
    const validationOptions = {
        abortEarly: false,
        allowUnknown: true, // Allow other route params
        stripUnknown: false,
        ...options
    };

    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, validationOptions);

        if (error) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                type: detail.type
            }));

            return next(new ValidationError('URL parameter validation failed', details));
        }

        req.params = value;
        next();
    };
}

/**
 * Combined validation middleware
 * Validates body, query, and params in one middleware
 *
 * @param {Object} schemas - Object containing schemas for body, query, params
 * @returns {Function} Express middleware function
 *
 * @example
 * router.post('/api/:id',
 *   validate({
 *     body: bodySchema,
 *     query: querySchema,
 *     params: paramsSchema
 *   }),
 *   controller.handler
 * );
 */
function validate(schemas) {
    return (req, res, next) => {
        const allDetails = [];

        if (schemas.params) {
            const { error, value } = schemas.params.validate(req.params, {
                abortEarly: false,
                allowUnknown: true
            });
            if (error) {
                allDetails.push(
                    ...error.details.map(d => ({
                        location: 'params',
                        field: d.path.join('.'),
                        message: d.message,
                        type: d.type
                    }))
                );
            } else {
                req.params = value;
            }
        }

        if (schemas.query) {
            const { error, value } = schemas.query.validate(req.query, {
                abortEarly: false,
                allowUnknown: false,
                stripUnknown: true
            });
            if (error) {
                allDetails.push(
                    ...error.details.map(d => ({
                        location: 'query',
                        field: d.path.join('.'),
                        message: d.message,
                        type: d.type
                    }))
                );
            } else {
                req.query = value;
            }
        }

        if (schemas.body) {
            const { error, value } = schemas.body.validate(req.body, {
                abortEarly: false,
                allowUnknown: false,
                stripUnknown: true
            });
            if (error) {
                allDetails.push(
                    ...error.details.map(d => ({
                        location: 'body',
                        field: d.path.join('.'),
                        message: d.message,
                        type: d.type
                    }))
                );
            } else {
                req.body = value;
            }
        }

        if (allDetails.length > 0) {
            return next(new ValidationError('Request validation failed', allDetails));
        }

        next();
    };
}

module.exports = {
    validateBody,
    validateQuery,
    validateParams,
    validate
};
