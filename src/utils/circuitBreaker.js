/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by failing fast when a service is unhealthy
 */

const EventEmitter = require('events');
const logger = require('./logger');

// Circuit states
const STATES = {
    CLOSED: 'CLOSED', // Normal operation
    OPEN: 'OPEN', // Failing fast
    HALF_OPEN: 'HALF_OPEN' // Testing if service recovered
};

/**
 * Circuit Breaker Class
 * Monitors failures and opens circuit when threshold is exceeded
 */
class CircuitBreaker extends EventEmitter {
    /**
     * @param {Object} options - Configuration options
     * @param {string} options.name - Name for logging
     * @param {number} options.failureThreshold - Number of failures before opening (default: 5)
     * @param {number} options.resetTimeout - Time in ms to wait before testing recovery (default: 30000)
     * @param {number} options.halfOpenRequests - Number of requests to allow in half-open state (default: 3)
     * @param {number} options.monitorInterval - Interval in ms to check for state transitions (default: 5000)
     * @param {number} options.successThreshold - Successes needed in half-open to close (default: 3)
     */
    constructor(options = {}) {
        super();

        this.name = options.name || 'circuit-breaker';
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 30000;
        this.halfOpenRequests = options.halfOpenRequests || 3;
        this.successThreshold = options.successThreshold || 3;

        this.state = STATES.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.halfOpenAttempts = 0;
        this.lastFailureTime = null;
        this.lastStateChange = Date.now();

        // Statistics
        this.stats = {
            totalCalls: 0,
            totalSuccesses: 0,
            totalFailures: 0,
            rejectedCalls: 0,
            lastStateChange: null,
            stateHistory: []
        };

        logger.info(`Circuit breaker initialized: ${this.name}`, {
            failureThreshold: this.failureThreshold,
            resetTimeout: this.resetTimeout,
            state: this.state
        });
    }

    /**
     * Execute a function through the circuit breaker
     * @param {Function} fn - Async function to execute
     * @returns {Promise} Result of the function
     */
    async execute(fn) {
        this.stats.totalCalls++;

        // Check if circuit is open
        if (this.state === STATES.OPEN) {
            if (this.shouldAttemptReset()) {
                this.transitionTo(STATES.HALF_OPEN);
            } else {
                this.stats.rejectedCalls++;
                const error = new Error(`Circuit breaker is open: ${this.name}`);
                error.code = 'CIRCUIT_OPEN';
                throw error;
            }
        }

        // Check half-open limits
        if (this.state === STATES.HALF_OPEN) {
            if (this.halfOpenAttempts >= this.halfOpenRequests) {
                this.stats.rejectedCalls++;
                const error = new Error(`Circuit breaker half-open limit reached: ${this.name}`);
                error.code = 'CIRCUIT_HALF_OPEN_LIMIT';
                throw error;
            }
            this.halfOpenAttempts++;
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error);
            throw error;
        }
    }

    /**
     * Handle successful execution
     */
    onSuccess() {
        this.stats.totalSuccesses++;

        if (this.state === STATES.HALF_OPEN) {
            this.successes++;
            if (this.successes >= this.successThreshold) {
                this.transitionTo(STATES.CLOSED);
            }
        } else if (this.state === STATES.CLOSED) {
            // Reset failure count on success
            this.failures = 0;
        }
    }

    /**
     * Handle failed execution
     */
    onFailure(error) {
        this.stats.totalFailures++;
        this.failures++;
        this.lastFailureTime = Date.now();

        logger.warn(`Circuit breaker failure: ${this.name}`, {
            failures: this.failures,
            threshold: this.failureThreshold,
            state: this.state,
            error: error.message
        });

        if (this.state === STATES.HALF_OPEN) {
            // Any failure in half-open state reopens the circuit
            this.transitionTo(STATES.OPEN);
        } else if (this.state === STATES.CLOSED && this.failures >= this.failureThreshold) {
            this.transitionTo(STATES.OPEN);
        }
    }

    /**
     * Check if we should attempt to reset the circuit
     */
    shouldAttemptReset() {
        return Date.now() - this.lastFailureTime >= this.resetTimeout;
    }

    /**
     * Transition to a new state
     */
    transitionTo(newState) {
        const oldState = this.state;
        this.state = newState;
        this.lastStateChange = Date.now();

        // Record state change
        this.stats.stateHistory.push({
            from: oldState,
            to: newState,
            timestamp: new Date().toISOString()
        });

        // Keep only last 20 state changes
        if (this.stats.stateHistory.length > 20) {
            this.stats.stateHistory.shift();
        }

        // Reset counters based on new state
        if (newState === STATES.CLOSED) {
            this.failures = 0;
            this.successes = 0;
            this.halfOpenAttempts = 0;
        } else if (newState === STATES.HALF_OPEN) {
            this.successes = 0;
            this.halfOpenAttempts = 0;
        }

        logger.info(`Circuit breaker state change: ${this.name}`, {
            from: oldState,
            to: newState
        });

        this.emit('stateChange', { from: oldState, to: newState, name: this.name });
    }

    /**
     * Force the circuit open (for manual intervention)
     */
    forceOpen() {
        this.transitionTo(STATES.OPEN);
        this.lastFailureTime = Date.now();
    }

    /**
     * Force the circuit closed (for manual intervention)
     */
    forceClose() {
        this.transitionTo(STATES.CLOSED);
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            name: this.name,
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailureTime: this.lastFailureTime
                ? new Date(this.lastFailureTime).toISOString()
                : null,
            lastStateChange: new Date(this.lastStateChange).toISOString(),
            stats: this.stats
        };
    }

    /**
     * Check if circuit is allowing requests
     */
    isAvailable() {
        if (this.state === STATES.CLOSED) return true;
        if (this.state === STATES.OPEN) return this.shouldAttemptReset();
        if (this.state === STATES.HALF_OPEN) return this.halfOpenAttempts < this.halfOpenRequests;
        return false;
    }
}

// Pre-configured circuit breakers for common services
const circuitBreakers = {
    email: new CircuitBreaker({
        name: 'email-service',
        failureThreshold: 5,
        resetTimeout: 30000,
        successThreshold: 3
    }),

    kafka: new CircuitBreaker({
        name: 'kafka-service',
        failureThreshold: 3,
        resetTimeout: 60000,
        successThreshold: 2
    }),

    database: new CircuitBreaker({
        name: 'database-service',
        failureThreshold: 3,
        resetTimeout: 10000,
        successThreshold: 2
    })
};

module.exports = {
    CircuitBreaker,
    STATES,
    circuitBreakers
};
