#!/usr/bin/env node
/**
 * verify-final.js — two decisive checks, escaping-agnostic.
 *
 * 1. vendor-private.js: the cleanup only replaces decoder calls via
 *    String.replace. So re-applying the same rewrite to the ORIGINAL must
 *    reproduce the cleaned file byte for byte. Exact proof, no reformatting.
 *
 * 2. main.js: the cleanup reformats, so compare token streams where every
 *    string literal is compared by its EVALUATED value (the actual runtime
 *    string), which is what matters for behaviour.
 */
'use strict';

const fs = require('fs');
const { lex } = require('./deobfuscate.js');
const { discoverDecoders, rewrite } = require('./clean-vendor.js');

let bad = 0;

/* ---------- check 1: vendor-private is a pure substitution ---------- */
function checkVendorExact() {
  const orig = fs.readFileSync('vendor-private.js', 'utf8');
  const clean = fs.readFileSync('clean/vendor-private.js', 'utf8');
  const { out: decoders } = discoverDecoders(orig);
  const again = rewrite(orig, decoders).out;

  console.log('=== vendor-private.js: byte-exact substitution');
  console.log('  decoders: ' + decoders.map((d) => d.key).join(', '));
  console.log('  original bytes: ' + orig.length.toLocaleString());
  console.log('  cleaned bytes : ' + clean.length.toLocaleString());
  if (again === clean) {
    console.log('  PASS: cleaned file == original with decoder calls substituted');
  } else {
    console.log('  FAIL: re-applying the rewrite does not reproduce the cleaned file');
    let i = 0;
    while (i < Math.min(again.length, clean.length) && again[i] === clean[i]) i++;
    console.log('    first difference at byte ' + i);
    console.log('    replayed: ' + JSON.stringify(again.slice(Math.max(0, i - 60), i + 60)));
    console.log('    cleaned : ' + JSON.stringify(clean.slice(Math.max(0, i - 60), i + 60)));
    bad++;
  }

  // No decoder calls should remain.
  const leftover = rewrite(clean, decoders);
  console.log('  decoder calls remaining in cleaned file: ' + leftover.replaced);
  if (leftover.replaced !== 0) bad++;
}

/* ---------- check 2: main.js token equality by runtime value ---------- */
const IDENT_RE = /^[\p{ID_Start}$_][\p{ID_Continue}$\u200c\u200d]*$/u;

/** Evaluates a string literal to its actual runtime value. */
function literalValue(tok) {
  try {
    // eslint-disable-next-line no-new-func
    return new Function('return ' + tok.raw)();
  } catch (err) {
    return tok.raw;
  }
}

function tokenKey(t) {
  if (t.type === 'comment') return null;
  if (t.type === 'string') return 'S:' + JSON.stringify(literalValue(t));
  if (t.type === 'number') return 'N:' + Number(t.raw.replace(/_/g, '')).toString();
  return t.type + ':' + t.raw;
}

function streamKeys(toks) {
  const out = [];
  for (const t of toks) { const k = tokenKey(t); if (k !== null) out.push(k); }
  return out;
}

/** Applies obj['ident'] -> obj.ident using runtime string values. */
function applyMemberRule(toks) {
  const out = [];
  let n = 0;
  for (let i = 0; i < toks.length; i++) {
    const obj = toks[i], open = toks[i + 1], k = toks[i + 2], close = toks[i + 3];
    if (obj && (obj.type === 'ident' || obj.raw === ')' || obj.raw === ']') &&
        open && open.raw === '[' && k && k.type === 'string' &&
        close && close.raw === ']') {
      const v = literalValue(k);
      if (IDENT_RE.test(v)) {
        out.push(obj, { type: 'punct', raw: '.' }, { type: 'ident', raw: v, value: v });
        n++; i += 3; continue;
      }
    }
    out.push(obj);
  }
  return { toks: out, n };
}

function checkMainSemantics() {
  const orig = streamKeys(applyMemberRule(lex(fs.readFileSync('main.js', 'utf8'))).toks);
  const clean = streamKeys(lex(fs.readFileSync('clean/main.js', 'utf8')));

  console.log('\n=== main.js: token equality with runtime string values');
  console.log('  original tokens (post-simplify): ' + orig.length.toLocaleString());
  console.log('  cleaned tokens                : ' + clean.length.toLocaleString());

  const n = Math.min(orig.length, clean.length);
  let diff = -1;
  for (let i = 0; i < n; i++) if (orig[i] !== clean[i]) { diff = i; break; }
  if (diff === -1 && orig.length === clean.length) {
    console.log('  PASS: identical token streams -> behaviour preserved');
    return;
  }
  if (diff === -1) diff = n;
  console.log('  FAIL at token ' + diff);
  console.log('    original: ' + orig[diff]);
  console.log('    cleaned : ' + clean[diff]);
  console.log('    orig ctx: ' + JSON.stringify(orig.slice(Math.max(0, diff - 3), diff + 4)));
  console.log('    cln  ctx: ' + JSON.stringify(clean.slice(Math.max(0, diff - 3), diff + 4)));
  bad++;
}

checkVendorExact();
checkMainSemantics();
process.exitCode = bad ? 1 : 0;
