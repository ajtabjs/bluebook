// Find call sites in clean/ whose string-table index resolves to a version-gate plaintext.
// Accessor patterns: v0J.r_J(N) and v0J.T$N(N). Report file:line + code slice.
const fs = require('fs');
const path = require('path');

const str = JSON.parse(fs.readFileSync('strings.current.json', 'utf8'));
function get(i) { return Array.isArray(str) ? str[i] : str[i]; }

const ANCHORS = {
  1079: 'outdated-block',
  2851: 'outdated-short',
  2205: 'min_version',
  2348: 'forceUpdate',
  5252: 'checkUpdateRequired',
  4491: 'version',
  157: 'appVersion',
  9315: 'not-latest',
  623: 'Invalid Chrome OS version',
};
const targets = new Set(Object.keys(ANCHORS).map(Number));

function walk(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

// match v0J.r/J or v0J.T$N calls with a literal integer arg, also generic accessor forms
const reAccessor = /\b([A-Za-z0-9_$]+)\.(r_J|T\$N)\((\d+)\)/g;

const hits = [];
for (const file of walk('clean')) {
  const src = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = reAccessor.exec(src))) {
    const idx = Number(m[3]);
    if (!targets.has(idx)) continue;
    const start = Math.max(0, m.index - 120);
    const end = Math.min(src.length, m.index + 120);
    const slice = src.slice(start, end).replace(/\s/g, ' ');
    // line number
    const ln = src.slice(0, m.index).split('\n').length;
    hits.push({ file, line: ln, index: idx, label: ANCHORS[idx], accessor: m[2], code: slice });
  }
}

console.log('TOTAL HITS', hits.length);
for (const h of hits) {
  console.log('---');
  console.log(`${h.file}:${h.line} idx=${h.index} [${h.label}] via .${h.accessor}`);
  console.log(h.code);
}
