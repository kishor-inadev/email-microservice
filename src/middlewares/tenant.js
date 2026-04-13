'use strict';

const env = require('../config/env');

const TENANCY_ENABLED = env.TENANCY_ENABLED;
const DEFAULT_TENANT_ID = env.DEFAULT_TENANT_ID;

/**
 * Resolves req.tenantId from the x-tenant-id request header.
 *
 * Header present  → req.tenantId = header value
 * Header missing  → req.tenantId = DEFAULT_TENANT_ID (or 'default')
 */
function resolveTenantMiddleware(req, res, next) {
  if (!TENANCY_ENABLED) {
    req.tenantId = null;
    return next();
  }

  const tenantId = (req.headers['x-tenant-id'] || req.headers['x-tanent'] || '').trim();

  if (tenantId) {
    req.tenantId = tenantId;
    return next();
  }

  req.tenantId = DEFAULT_TENANT_ID || null;
  next();
}

module.exports = { resolveTenantMiddleware };
