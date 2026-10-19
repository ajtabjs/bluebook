#!/usr/bin/env node
/**
 * clean-vendor.js — targeted, format-preserving string-table deobfuscation.
 *
 * Unlike a full re-emit, this rewrites ONLY the decoder calls, so every other
 * byte (indentation, comments, blank lines, ordering) is left untouched. That
 * keeps the diff reviewable and removes the risk of introducing syntax errors.
 *
 *   w205U.Q1v(2216)  ->  "some readable string"
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TABLE = (() => {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'strings.json'), 'utf8'));
  const t = new Map();
  for (const k of Object.keys(raw)) {
    const i = Number(k);
    if (Number.isInteger(i) && typeof raw[k] === 'string') t.set(i, raw[k]);
  }
  return t;
})();

function quote(s) {
  const singles = (s.match(/'/g) || []).length;
  const doubles = (s.match(/"/g) || []).length;
  const q = singles <= doubles ? "'" : '"';
  const body = s
    .replace(/\\/g, '\\\\')
    .replace(new RegExp(q, 'g'), '\\' + q)
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return q + body + q;
}

/** Finds `IDENT.METHOD(<int>)` shapes whose integers mostly resolve in the table. */
function discoverDecoders(src) {
  const re = /([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\(\s*(\d+)\s*\)/g;
  const stats = new Map();
  let m;
  while ((m = re.exec(src))) {
    const key = m[1] + '.' + m[2];
    const st = stats.get(key) || { total: 0, found: 0 };
    st.total++;
    if (TABLE.has(Number(m[3]))) st.found++;
    stats.set(key, st);
  }
  const out = [];
  for (const [key, st] of stats) {
    if (st.total >= 2 && st.found / st.total >= 0.9) out.push({ key, ...st });
  }
  return { out, stats };
}

function rewrite(src, decoders) {
  let out = src;
  let replaced = 0;
  let skipped = 0;
  for (const d of decoders) {
    const [obj, meth] = d.key.split('.');
    const re = new RegExp(
      '\\b' + obj.replace(/\$/g, '\\$') + '\\.' + meth.replace(/\$/g, '\\$') +
      '\\(\\s*(\\d+)\\s*\\)', 'g'
    );
    out = out.replace(re, (full, num) => {
      const idx = Number(num);
      if (!TABLE.has(idx)) { skipped++; return full; }
      replaced++;
      return quote(TABLE.get(idx));
    });
  }
  return { out, replaced, skipped };
}

function main() {
  const args = process.argv.slice(2);
  const files = args.length ? args : ['vendor-private.js', 'vendor-public.js', 'deobfuscated.js'];
  const outDir = path.join(__dirname, 'clean');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let failed = 0;
  for (const file of files) {
    if (!fs.existsSync(file)) { console.log('skip (missing): ' + file); continue; }
    const src = fs.readFileSync(file, 'utf8');
    console.log('\n=== ' + file + ' (' + src.length.toLocaleString() + ' bytes)');

    const { out: decoders, stats } = discoverDecoders(src);
    if (decoders.length) {
      for (const d of decoders) {
        console.log('  decoder ' + d.key + ': ' + d.found + '/' + d.total + ' indices resolve');
      }
    } else {
      console.log('  no string-table decoders found (top candidates below)');
      const top = [...stats.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5);
      for (const [k, s] of top) console.log('    ' + k + ': ' + s.found + '/' + s.total + ' resolve');
    }

    const res = rewrite(src, decoders);
    console.log('  calls replaced: ' + res.replaced.toLocaleString() +
                (res.skipped ? ', left as-is: ' + res.skipped.toLocaleString() : ''));

    if (!decoders.length) {
      console.log('  nothing rewritten; not writing output for ' + file);
      continue;
    }

    try {
      new Function(res.out);
    } catch (err) {
      console.error('  REFUSING to write: output does not parse -> ' + err.message);
      failed++;
      continue;
    }

    const dest = path.join(outDir, file);
    fs.writeFileSync(dest, res.out);
    console.log('  wrote ' + dest + ' (' + res.out.length.toLocaleString() + ' bytes)');
  }

  process.exitCode = failed ? 1 : 0;
}

if (require.main === module) main();
module.exports = { quote, discoverDecoders, rewrite };
