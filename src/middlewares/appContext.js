'use strict';

const env = require('../config/env');

/**
 * Resolves per-request app branding context from HTTP headers.
 *
 * Header          → req.appContext field      Fallback
 * ─────────────────────────────────────────────────────────────
 * x-app           → applicationName           APPLICATION_NAME env var
 * x-app-url       → appUrl                    APP_URL env var
 * x-path          → ctaPath                   null (templates use their default path)
 *
 * Usage examples:
 *   x-app: MyStartup
 *   x-app-url: https://myapp.com
 *   x-path: /auth/verify-email        ← overrides primary CTA path
 *
 * For Kafka messages (no HTTP headers), equivalent fields can be embedded in the
 * payload's `data` object: data.applicationName, data.appUrl, data.ctaPath.
 * The Kafka consumer extracts these before calling emailService.sendEmail().
 */
function resolveAppContextMiddleware(req, res, next) {
  req.appContext = {
    applicationName: (req.headers['x-app'] || '').trim()     || env.APPLICATION_NAME,
    appUrl:          (req.headers['x-app-url'] || '').trim()  || env.APP_URL,
    ctaPath:         (req.headers['x-path'] || '').trim()     || null,
  };
  next();
}

module.exports = { resolveAppContextMiddleware };
