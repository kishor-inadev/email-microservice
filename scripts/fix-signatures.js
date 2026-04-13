'use strict';
/**
 * fix-signatures.js
 *
 * Finds template functions that have _appUrl in their BODY (CTA URLs)
 * but NOT in their SIGNATURE (destructured params), and injects the
 * missing params into the signature.
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '../src/templates/emailTemplate.js');
let src = fs.readFileSync(FILE, 'utf8');

// Parse function blocks by tracking brace depth
// Returns array of { name, sigStart, sigEnd, bodyStart, bodyEnd }
function parseFunctions(text) {
  const lines = text.split('\n');
  const fns = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^const ([A-Za-z_]+) = \(/);
    if (!m) continue;

    const fnName = m[1];
    const sigStartLine = i;

    // Find end of signature: look for `}) =>` or single-line `}) =>`
    let sigEndLine = i;
    let sigText = line;
    if (!line.includes('}) =>') && !line.includes('} ) =>')) {
      let j = i + 1;
      while (j < lines.length) {
        sigText += '\n' + lines[j];
        if (/^\}\)\s*=>/.test(lines[j].trim()) || lines[j].includes('}) =>')) {
          sigEndLine = j;
          break;
        }
        j++;
        if (j - i > 30) { sigEndLine = i; break; }
      }
    }

    // Find body: scan from sigEndLine+1 until matching `};`
    let bodyStartLine = sigEndLine + 1;
    let bodyEndLine = bodyStartLine;
    let depth = 0;
    for (let k = sigEndLine; k < Math.min(lines.length, sigEndLine + 250); k++) {
      for (const ch of lines[k]) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
      }
      if (depth === 0 && k > sigEndLine) { bodyEndLine = k; break; }
    }

    const bodyText = lines.slice(bodyStartLine, bodyEndLine + 1).join('\n');

    fns.push({ name: fnName, sigText, sigStartLine, sigEndLine, bodyText, bodyEndLine });
  }
  return fns;
}

const fns = parseFunctions(src);
let fixCount = 0;

const NEW_PARAMS = `\n  appUrl: _appUrl = appUrl,\n  applicationName: _appName = applicaionName,\n  ctaUrl = null,\n  ctaPath = null`;

for (const fn of fns) {
  const sigHasParam = fn.sigText.includes('_appUrl');
  const bodyHasUsage = fn.bodyText.includes('_appUrl') || fn.bodyText.includes('ctaUrl ||');

  if (!sigHasParam && bodyHasUsage) {
    // Need to inject params into signature
    // Pattern: find `}) =>` or `} ) =>` in sigText and inject before `}`
    const oldSig = fn.sigText;

    // For single-line: `const FOO = ({ a, b }) => {`
    // For multi-line: last line of sig is `}) => {`
    const newSig = oldSig.replace(/\}\)\s*=>\s*\{/, `,${NEW_PARAMS}\n}) => {`);

    if (newSig !== oldSig) {
      src = src.replace(oldSig, newSig);
      fixCount++;
      // console.log(`Fixed: ${fn.name}`);
    }
  }
}

fs.writeFileSync(FILE, src, 'utf8');
console.log(`Fixed ${fixCount} function signatures.`);

// Verify: check there are no more _appUrl body usages without signature params
const lines2 = src.split('\n');
let stillBroken = 0;
const fns2 = parseFunctions(src);
for (const fn of fns2) {
  const sigHasParam = fn.sigText.includes('_appUrl');
  const bodyHasUsage = fn.bodyText.includes('_appUrl') || fn.bodyText.includes('ctaUrl ||');
  if (!sigHasParam && bodyHasUsage) {
    console.log(`Still broken: ${fn.name} (line ${fn.sigStartLine + 1})`);
    stillBroken++;
  }
}
console.log(`Still broken after fix: ${stillBroken}`);
