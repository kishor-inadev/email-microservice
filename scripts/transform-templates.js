'use strict';
/**
 * transform-templates.js
 *
 * Transforms remaining emailTemplate.js functions that still use the module-level
 * `appUrl` variable in ctaButton URLs into dynamic per-request overrideable versions.
 *
 * Transformation rules:
 *   1. Each function signature gets `appUrl: _appUrl = appUrl, applicationName: _appName = applicaionName, ctaUrl = null, ctaPath = null`
 *      appended to its destructured params (only if not already present).
 *   2. `${appUrl}/path/${id}` (dynamic)  → `ctaUrl || \`${_appUrl}/path/${id}\``
 *   3. `${appUrl}/static-path`           → `ctaUrl || (ctaPath ? _appUrl + ctaPath : \`${_appUrl}/static-path\`)`
 *   4. `someVar || \`${appUrl}/...`       → `someVar || ctaUrl || \`${_appUrl}/...`
 *   5. buildEmailHTML opts get `appUrl: _appUrl, applicationName: _appName` injected
 *      (only for functions that received the new params).
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '../src/templates/emailTemplate.js');
let src = fs.readFileSync(FILE, 'utf8');
const lines = src.split('\n');

// ─── helpers ───────────────────────────────────────────────────────────────

/** True if `line` is a const arrow-function declaration */
function isFunctionDecl(line) {
  return /^const [A-Za-z_]+ = \(/.test(line.trim());
}

/** Extract function name from declaration line */
function fnName(line) {
  const m = line.match(/^const ([A-Za-z_]+) = \(/);
  return m ? m[1] : null;
}

/** Does `line` already have the new dynamic params (already been updated)? */
function alreadyUpdated(line) {
  return /_appUrl/.test(line);
}

/** The new params to inject at end of destructuring, before the closing `}` */
const NEW_PARAMS = 'appUrl: _appUrl = appUrl, applicationName: _appName = applicaionName, ctaUrl = null, ctaPath = null';
const NEW_MULTI_PARAMS = `\n  appUrl: _appUrl = appUrl,\n  applicationName: _appName = applicaionName,\n  ctaUrl = null,\n  ctaPath = null`;

/**
 * Given the full signature string (everything between `({` and `}) =>`),
 * inject the new params if they're not already present.
 */
function injectParams(signature) {
  if (/_appUrl/.test(signature)) return signature;           // already has it
  if (signature.trim() === '') return NEW_MULTI_PARAMS + '\n';        // empty params
  // Remove trailing whitespace/newline before closing }
  return signature.replace(/(\s*)\}(\s*=>)/, `,${NEW_MULTI_PARAMS}\n}$2`);
}

// ─── Phase 1: collect functions that still use `${appUrl}/` in CTA urls ───

// We need to find which functions have `${appUrl}/` somewhere (in CTA url lines)
// and have NOT been updated yet (no _appUrl in their declaration line).

// We process in a second pass: scan for function boundaries.

const output = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];

  if (isFunctionDecl(line) && !alreadyUpdated(line)) {
    // Collect the entire function body to check if it uses ${appUrl}/
    const startIdx = i;
    const funcName = fnName(line);

    // Collect lines until the function ends (simple heuristic: matching `};` at level 0)
    let bodyLines = [line];
    let braceDepth = 0;
    let j = i;
    while (j < lines.length) {
      const l = lines[j];
      // Count braces
      for (const ch of l) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      if (j > startIdx) bodyLines.push(l);
      if (braceDepth === 0 && j > startIdx) { j++; break; }
      j++;
    }

    const bodyStr = bodyLines.join('\n');

    if (/\$\{appUrl\}\//.test(bodyStr)) {
      // This function needs updating
      let updated = transformFunction(bodyLines, funcName);
      output.push(...updated.split('\n'));
    } else {
      output.push(...bodyLines);
    }
    i = j;
    continue;
  }

  output.push(line);
  i++;
}

// ─── Phase 2: transform individual function ───────────────────────────────

function transformFunction(bodyLines, funcName) {
  let body = bodyLines.join('\n');

  // ── 2a. Update function signature ──
  // Single-line: `const FOO = ({ a, b }) => {`
  // Multi-line:  `const FOO = ({\n  a,\n  b\n}) => {`
  body = body.replace(
    /^(const [A-Za-z_]+ = \()(\{[\s\S]*?\})(\s*=>\s*\{)/m,
    (match, prefix, params, arrow) => {
      const updated = injectParams(params);
      return prefix + updated + arrow;
    }
  );

  // ── 2b. Inject appUrl + applicationName into buildEmailHTML({...}) ──
  // Find the first `buildEmailHTML({` call and add the two props after the opening brace
  body = body.replace(
    /(buildEmailHTML\(\{)(\s*\n\s*preheader:)/,
    (match, open, next) => {
      return `${open}\n      appUrl: _appUrl,\n      applicationName: _appName,${next}`;
    }
  );

  // ── 2c. Transform CTA url lines ──

  // Pattern A: `url: someVar || \`${appUrl}/path\`` → `url: someVar || ctaUrl || \`${_appUrl}/path\``
  body = body.replace(
    /(\s*url: )(\w+(?:\s*\||\s*\?[^:]+:)?.*?\|\|\s*)`\$\{appUrl\}(\/[^`]*)`/g,
    (match, prefix, existing, urlPath) => {
      // contains data-driven ID variables in path → use ctaUrl
      return `${prefix}${existing}ctaUrl || \`\${_appUrl}${urlPath}\``;
    }
  );

  // Pattern B: `url: \`${appUrl}/path/${id}\`` (has template expression in path → dynamic, use ctaUrl)
  body = body.replace(
    /(\s*url: )`\$\{appUrl\}(\/(?:[^`])*\$\{[^`]*)`/g,
    (match, prefix, urlPath) => {
      return `${prefix}ctaUrl || \`\${_appUrl}${urlPath}\``;
    }
  );

  // Pattern C: `url: \`${appUrl}/static-path\`` (pure static string in path → use ctaUrl + ctaPath fallback)
  body = body.replace(
    /(\s*url: )`\$\{appUrl\}(\/[a-z0-9\-\/]+)`/g,
    (match, prefix, urlPath) => {
      return `${prefix}ctaUrl || (ctaPath ? (_appUrl + ctaPath) : (\`\${_appUrl}${urlPath}\`))`;
    }
  );

  return body;
}

// ─── Write output ──────────────────────────────────────────────────────────

const result = output.join('\n');
fs.writeFileSync(FILE, result, 'utf8');
console.log(`Done. Transformed ${FILE}`);

// ─── Verify ───────────────────────────────────────────────────────────────

const remaining = (result.match(/url: `\$\{appUrl\}\//g) || []).length;
console.log(`Remaining \`\${appUrl}/\` CTA url occurrences: ${remaining}`);
const updated = (result.match(/url: ctaUrl \|\|/g) || []).length;
console.log(`Updated to ctaUrl pattern: ${updated}`);
