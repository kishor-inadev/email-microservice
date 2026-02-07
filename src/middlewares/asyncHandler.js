/**
 * Async Handler Middleware
 * Wraps async route handlers to automatically catch Promise rejections
 * and pass errors to Express error handling middleware
 */

/**
 * Wrap an async function to handle errors automatically
 * Eliminates the need for try-catch blocks in every controller
 *
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 *
 * @example
 * // Instead of:
 * async function handler(req, res, next) {
 *   try {
 *     const result = await someAsyncOperation();
 *     res.json(result);
 *   } catch (error) {
 *     next(error);
 *   }
 * }
 *
 * // Use:
 * const handler = asyncHandler(async (req, res) => {
 *   const result = await someAsyncOperation();
 *   res.json(result);
 * });
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Wrap multiple handlers at once
 *
 * @param {Object} handlers - Object containing handler functions
 * @returns {Object} Object with wrapped handlers
 *
 * @example
 * const handlers = wrapHandlers({
 *   getUser: async (req, res) => { ... },
 *   createUser: async (req, res) => { ... }
 * });
 */
function wrapHandlers(handlers) {
    const wrapped = {};
    for (const [key, handler] of Object.entries(handlers)) {
        if (typeof handler === 'function') {
            wrapped[key] = asyncHandler(handler);
        }
    }
    return wrapped;
}

/**
 * Create handler with timeout
 * Rejects if the handler takes too long
 *
 * @param {Function} fn - Async function to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Function} Express middleware function
 */
function asyncHandlerWithTimeout(fn, timeoutMs = 30000) {
    return (req, res, next) => {
        const timeoutError = new Error(`Request timeout after ${timeoutMs}ms`);
        timeoutError.statusCode = 504;
        timeoutError.errorCode = 'TIMEOUT_ERROR';

        let timedOut = false;

        const timeout = setTimeout(() => {
            timedOut = true;
            next(timeoutError);
        }, timeoutMs);

        Promise.resolve(fn(req, res, next))
            .then(() => {
                if (!timedOut) {
                    clearTimeout(timeout);
                }
            })
            .catch(error => {
                if (!timedOut) {
                    clearTimeout(timeout);
                    next(error);
                }
            });
    };
}

module.exports = {
    asyncHandler,
    wrapHandlers,
    asyncHandlerWithTimeout
};
