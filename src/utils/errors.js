/**
 * Custom Error Classes for Email Microservice
 * Provides structured error handling with HTTP status codes and error codes
 */

/**
 * Base Application Error
 * All custom errors extend this class
 */
class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = isOperational; // Operational errors can be safely exposed to client
        this.timestamp = new Date().toISOString();

        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            error: this.errorCode,
            message: this.message,
            statusCode: this.statusCode,
            timestamp: this.timestamp
        };
    }
}

/**
 * Validation Error - 400 Bad Request
 * Used for request payload/input validation failures
 */
class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            details: this.details
        };
    }
}

/**
 * Authentication Error - 401 Unauthorized
 * Used for SMTP auth failures or API key issues
 */
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

/**
 * Not Found Error - 404 Not Found
 * Used for missing templates, resources, or email logs
 */
class NotFoundError extends AppError {
    constructor(message = 'Resource not found', resource = null) {
        super(message, 404, 'NOT_FOUND');
        this.resource = resource;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            resource: this.resource
        };
    }
}

/**
 * Rate Limit Error - 429 Too Many Requests
 * Used when rate limit is exceeded
 */
class RateLimitError extends AppError {
    constructor(message = 'Too many requests', retryAfter = null) {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
        this.retryAfter = retryAfter; // Seconds until retry is allowed
    }

    toJSON() {
        return {
            ...super.toJSON(),
            retryAfter: this.retryAfter
        };
    }
}

/**
 * Email Delivery Error - 500/503
 * Used for email sending failures
 */
class EmailDeliveryError extends AppError {
    constructor(message, smtpCode = null, isRetryable = false) {
        const statusCode = isRetryable ? 503 : 500;
        super(message, statusCode, 'EMAIL_DELIVERY_ERROR');
        this.smtpCode = smtpCode;
        this.isRetryable = isRetryable;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            smtpCode: this.smtpCode,
            isRetryable: this.isRetryable
        };
    }
}

/**
 * Template Error - 400/404
 * Used for template loading or rendering failures
 */
class TemplateError extends AppError {
    constructor(message, templateName = null) {
        super(message, 400, 'TEMPLATE_ERROR');
        this.templateName = templateName;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            template: this.templateName
        };
    }
}

/**
 * Kafka Error - 503 Service Unavailable
 * Used for Kafka connection or publish failures
 */
class KafkaError extends AppError {
    constructor(message, operation = null) {
        super(message, 503, 'KAFKA_ERROR');
        this.operation = operation;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            operation: this.operation
        };
    }
}

/**
 * Database Error - 503 Service Unavailable
 * Used for MongoDB operation failures
 */
class DatabaseError extends AppError {
    constructor(message, operation = null) {
        super(message, 503, 'DATABASE_ERROR');
        this.operation = operation;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            operation: this.operation
        };
    }
}

/**
 * Service Unavailable Error - 503
 * Used when a required service is unavailable (circuit open)
 */
class ServiceUnavailableError extends AppError {
    constructor(message = 'Service temporarily unavailable', serviceName = null) {
        super(message, 503, 'SERVICE_UNAVAILABLE');
        this.serviceName = serviceName;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            service: this.serviceName
        };
    }
}

/**
 * Timeout Error - 504 Gateway Timeout
 * Used when an operation times out
 */
class TimeoutError extends AppError {
    constructor(message = 'Operation timed out', operation = null, timeoutMs = null) {
        super(message, 504, 'TIMEOUT_ERROR');
        this.operation = operation;
        this.timeoutMs = timeoutMs;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            operation: this.operation,
            timeoutMs: this.timeoutMs
        };
    }
}

/**
 * Idempotency Error - 409 Conflict
 * Used when a duplicate request is detected
 */
class IdempotencyError extends AppError {
    constructor(message = 'Duplicate request detected', idempotencyKey = null) {
        super(message, 409, 'DUPLICATE_REQUEST');
        this.idempotencyKey = idempotencyKey;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            idempotencyKey: this.idempotencyKey
        };
    }
}

/**
 * Utility function to determine if error is operational
 * Operational errors are expected and can be safely returned to client
 * Non-operational errors are bugs that need fixing
 */
function isOperationalError(error) {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
}

/**
 * Utility to wrap non-operational errors
 */
function wrapError(error) {
    if (error instanceof AppError) {
        return error;
    }

    // Check for common error patterns
    if (error.code === 'EAUTH' || error.message?.includes('authentication')) {
        return new AuthenticationError(error.message);
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return new ServiceUnavailableError(`Connection failed: ${error.message}`);
    }

    // Default to internal error
    const wrapped = new AppError(error.message, 500, 'INTERNAL_ERROR', false);
    wrapped.stack = error.stack;
    wrapped.originalError = error;
    return wrapped;
}

module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    EmailDeliveryError,
    TemplateError,
    KafkaError,
    DatabaseError,
    ServiceUnavailableError,
    TimeoutError,
    IdempotencyError,
    isOperationalError,
    wrapError
};
