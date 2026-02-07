/**
 * Health Service
 * Centralized health check service for all dependencies
 */

const logger = require('../utils/logger');

// Health status constants
const STATUS = {
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    UNHEALTHY: 'unhealthy'
};

class HealthService {
    constructor() {
        this.checks = new Map();
        this.lastCheckResults = new Map();
        this.checkInterval = null;
    }

    /**
     * Register a health check
     * @param {string} name - Name of the dependency
     * @param {Function} checkFn - Async function that returns { healthy: boolean, details: object }
     * @param {Object} options - Options like timeout, critical
     */
    registerCheck(name, checkFn, options = {}) {
        this.checks.set(name, {
            fn: checkFn,
            timeout: options.timeout || 5000,
            critical: options.critical !== false // Default to critical
        });

        logger.debug(`Health check registered: ${name}`, { critical: options.critical !== false });
    }

    /**
     * Run a single health check with timeout
     */
    async runCheck(name) {
        const check = this.checks.get(name);
        if (!check) {
            return { healthy: false, error: 'Check not found' };
        }

        const startTime = Date.now();

        try {
            const result = await Promise.race([
                check.fn(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Health check timeout')), check.timeout)
                )
            ]);

            const checkResult = {
                name,
                healthy: result.healthy,
                responseTime: Date.now() - startTime,
                details: result.details || {},
                checkedAt: new Date().toISOString(),
                critical: check.critical
            };

            this.lastCheckResults.set(name, checkResult);
            return checkResult;
        } catch (error) {
            const checkResult = {
                name,
                healthy: false,
                responseTime: Date.now() - startTime,
                error: error.message,
                checkedAt: new Date().toISOString(),
                critical: check.critical
            };

            this.lastCheckResults.set(name, checkResult);
            return checkResult;
        }
    }

    /**
     * Run all health checks
     */
    async runAllChecks() {
        const results = await Promise.all(
            Array.from(this.checks.keys()).map(name => this.runCheck(name))
        );

        return results;
    }

    /**
     * Get overall health status
     */
    async getHealth() {
        const checks = await this.runAllChecks();
        const startTime = process.hrtime.bigint();

        let status = STATUS.HEALTHY;
        let healthyCount = 0;
        let unhealthyCount = 0;

        for (const check of checks) {
            if (check.healthy) {
                healthyCount++;
            } else {
                unhealthyCount++;
                if (check.critical) {
                    status = STATUS.UNHEALTHY;
                } else if (status !== STATUS.UNHEALTHY) {
                    status = STATUS.DEGRADED;
                }
            }
        }

        return {
            status,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: require('../../package.json').version,
            environment: process.env.NODE_ENV || 'development',
            checks,
            summary: {
                total: checks.length,
                healthy: healthyCount,
                unhealthy: unhealthyCount
            },
            responseTime: Number(process.hrtime.bigint() - startTime) / 1e6 // Convert to ms
        };
    }

    /**
     * Get cached health status (for high-frequency requests)
     */
    getCachedHealth() {
        const checks = Array.from(this.lastCheckResults.values());

        if (checks.length === 0) {
            return {
                status: STATUS.UNHEALTHY,
                message: 'No health checks have been run yet'
            };
        }

        let status = STATUS.HEALTHY;
        for (const check of checks) {
            if (!check.healthy) {
                if (check.critical) {
                    status = STATUS.UNHEALTHY;
                    break;
                } else {
                    status = STATUS.DEGRADED;
                }
            }
        }

        return {
            status,
            timestamp: new Date().toISOString(),
            checks
        };
    }

    /**
     * Liveness check (is the process alive?)
     */
    getLiveness() {
        return {
            status: 'alive',
            timestamp: new Date().toISOString(),
            pid: process.pid,
            uptime: process.uptime()
        };
    }

    /**
     * Readiness check (is the service ready to receive traffic?)
     */
    async getReadiness() {
        const health = await this.getHealth();

        return {
            ready: health.status !== STATUS.UNHEALTHY,
            status: health.status,
            timestamp: new Date().toISOString(),
            checks: health.checks.filter(c => c.critical),
            version: require('../../package.json').version
        };
    }

    /**
     * Start periodic health checks
     */
    startPeriodicChecks(intervalMs = 30000) {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        this.checkInterval = setInterval(async () => {
            try {
                await this.runAllChecks();
            } catch (error) {
                logger.error('Periodic health check failed', { error: error.message });
            }
        }, intervalMs);

        // Run immediately
        this.runAllChecks().catch(error => {
            logger.error('Initial health check failed', { error: error.message });
        });

        logger.info('Periodic health checks started', { intervalMs });
    }

    /**
     * Stop periodic health checks
     */
    stopPeriodicChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            logger.info('Periodic health checks stopped');
        }
    }
}

// Singleton instance
const healthService = new HealthService();

// Default health checks can be registered elsewhere
module.exports = {
    healthService,
    HealthService,
    STATUS
};
