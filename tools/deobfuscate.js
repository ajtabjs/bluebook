#!/usr/bin/env node
// deobfuscate.js - lexer-based, syntax-verified deobfuscation for the bluebook bundle.
'use strict';
const fs = require('fs');
const path = require('path');
const OUT_DIR = path.join(__dirname, 'clean');

function loadTable() {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'strings.json'), 'utf8'));
  const t = new Map();
  for (const k of Object.keys(raw)) {
    const i = Number(k);
    if (Number.isInteger(i) && typeof raw[k] === 'string') t.set(i, raw[k]);
  }
  return t;
}

const ID_START = /[\p{ID_Start}$_]/u;
const ID_PART = /[\p{ID_Continue}$\u200c\u200d]/u;
const PUNCT = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '**', '<<', '>>', '{', '}', '(', ')', '[', ']', ';', ',', '<', '>', '+', '-', '*', '/', '%', '&', '|', '^', '!', '~', '?', ':', '=', '.', '@', '#'];
const REGEX_KW = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
const isDigit = (c) => c >= '0' && c <= '9';
const isHex = (c) => isDigit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');

function lex(src) {
  const toks = [];
  const n = src.length;
  let i = 0;
  let last = null;
  const push = (type, raw, value) => {
    const t = { type: type, raw: raw, value: value === undefined ? raw : value };
    toks.push(t);
    if (type !== 'comment') last = t;
    return t;
  };
  const regexOk = () => {
    if (!last) return true;
    if (last.type === 'ident') return REGEX_KW.has(last.raw);
    if (last.type === 'number' || last.type === 'string' || last.type === 'template' || last.type === 'regex') return false;
    if (last.type === 'punct') return !(last.raw === ')' || last.raw === ']' || last.raw === '}');
    return true;
  };
  function scanString(start) {
    const q = src[start];
    let j = start + 1;
    while (j < n) {
      const c = src[j];
      if (c === '\\') { j += 2; continue; }
      if (c === q) return j + 1;
      if (c === '\n') return j;
      j++;
    }
    return n;
  }
  function scanTemplate(start) {
    let j = start + 1;
    while (j < n) {
      const c = src[j];
      if (c === '\\') { j += 2; continue; }
      if (c === '`') return j + 1;
      if (c === '$' && src[j + 1] === '{') {
        j += 2;
        let depth = 1;
        while (j < n && depth > 0) {
          const d = src[j];
          if (d === '\\') { j += 2; continue; }
          if (d === '"' || d === "'") { j = scanString(j); continue; }
          if (d === '`') { j = scanTemplate(j); continue; }
          if (d === '/' && src[j + 1] === '/') { while (j < n && src[j] !== '\n') j++; continue; }
          if (d === '/' && src[j + 1] === '*') { const e = src.indexOf('*/', j + 2); j = e < 0 ? n : e + 2; continue; }
          if (d === '{') depth++;
          else if (d === '}') depth--;
          j++;
        }
        continue;
      }
      j++;
    }
    return n;
  }
  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '\f' || c === '\v' || c === '\ufeff') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') {
      let j = i + 2;
      while (j < n && src[j] !== '\n') j++;
      push('comment', src.slice(i, j));
      i = j;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      const j = e < 0 ? n : e + 2;
      push('comment', src.slice(i, j));
      i = j;
      continue;
    }
    if (c === '"' || c === "'") {
      const j = scanString(i);
      push('string', src.slice(i, j), src.slice(i + 1, Math.max(i + 1, j - 1)));
      i = j;
      continue;
    }
    if (c === '`') {
      const j = scanTemplate(i);
      push('template', src.slice(i, j));
      i = j;
      continue;
    }
    if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
      let j = i;
      if (c === '0' && /[xXbBoO]/.test(src[i + 1] || '')) {
        j = i + 2;
        while (j < n && (isHex(src[j]) || src[j] === '_')) j++;
      } else {
        while (j < n && (isDigit(src[j]) || src[j] === '_')) j++;
        if (src[j] === '.') { j++; while (j < n && (isDigit(src[j]) || src[j] === '_')) j++; }
        if (src[j] === 'e' || src[j] === 'E') { j++; if (src[j] === '+' || src[j] === '-') j++; while (j < n && isDigit(src[j])) j++; }
      }
      if (src[j] === 'n') j++;
      push('number', src.slice(i, j));
      i = j;
      continue;
    }
    if (ID_START.test(c)) {
      let j = i + 1;
      while (j < n && ID_PART.test(src[j])) j++;
      push('ident', src.slice(i, j));
      i = j;
      continue;
    }
    if (c === '/' && regexOk()) {
      let j = i + 1;
      let cls = false;
      while (j < n) {
        const d = src[j];
        if (d === '\\') { j += 2; continue; }
        if (d === '[') cls = true;
        else if (d === ']') cls = false;
        else if (d === '/' && !cls) { j++; break; }
        else if (d === '\n') break;
        j++;
      }
      while (j < n && ID_PART.test(src[j])) j++;
      push('regex', src.slice(i, j));
      i = j;
      continue;
    }
    let m = null;
    for (const p of PUNCT) { if (src.startsWith(p, i)) { m = p; break; } }
    if (m) { push('punct', m); i += m.length; continue; }
    throw new Error('unlexable character at offset ' + i + ': U+' + c.charCodeAt(0).toString(16));
  }
  return toks;
}
/* ---------------------------------------------------------------- escapes */
function decodeEscapes(body) {
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c !== '\\') { out += c; continue; }
    const e = body[++i];
    switch (e) {
      case 'n': out += '\n'; break;
      case 't': out += '\t'; break;
      case 'r': out += '\r'; break;
      case 'b': out += '\b'; break;
      case 'f': out += '\f'; break;
      case 'v': out += '\v'; break;
      case '0': out += isDigit(body[i + 1] || '') ? '\\0' : '\0'; break;
      case 'x': {
        const h = body.substr(i + 1, 2);
        if (/^[0-9a-fA-F]{2}$/.test(h)) { out += String.fromCharCode(parseInt(h, 16)); i += 2; }
        else out += '\\x';
        break;
      }
      case 'u': {
        if (body[i + 1] === '{') {
          const close = body.indexOf('}', i + 2);
          const h = close < 0 ? '' : body.slice(i + 2, close);
          if (h && /^[0-9a-fA-F]+$/.test(h)) { out += String.fromCodePoint(parseInt(h, 16)); i = close; }
          else out += '\\u';
        } else {
          const h = body.substr(i + 1, 4);
          if (/^[0-9a-fA-F]{4}$/.test(h)) { out += String.fromCharCode(parseInt(h, 16)); i += 4; }
          else out += '\\u';
        }
        break;
      }
      case '\n': break;
      case '\r': if (body[i + 1] === '\n') i++; break;
      case '\\': out += '\\'; break;
      case '"': out += '"'; break;
      case "'": out += "'"; break;
      case '`': out += '`'; break;
      case undefined: out += '\\'; break;
      default: out += '\\' + e;
    }
  }
  return out;
}

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

const IDENT_RE = /^[\p{ID_Start}$_][\p{ID_Continue}$\u200c\u200d]*$/u;

function resolveIndex(lit) {
  if (/^0[xX][0-9a-fA-F]+$/.test(lit)) return parseInt(lit.slice(2), 16);
  if (/^[0-9]+$/.test(lit)) return parseInt(lit, 10);
  return NaN;
}

/* ------------------------------------------------------------ transforms */
// A decoder is `obj.NAME(<number>)` where the number almost always resolves
// in strings.json. Discovered empirically so we do not need a hardcoded list.
function findDecoders(toks, table) {
  const hits = new Map();
  for (let i = 0; i + 4 < toks.length; i++) {
    if (toks[i].raw !== '.' || toks[i + 1].type !== 'ident') continue;
    if (toks[i + 2].raw !== '(' || toks[i + 3].type !== 'number' || toks[i + 4].raw !== ')') continue;
    const name = toks[i + 1].raw;
    const stat = hits.get(name) || { total: 0, found: 0 };
    stat.total++;
    if (table.has(resolveIndex(toks[i + 3].raw))) stat.found++;
    hits.set(name, stat);
  }
  const decoders = new Set();
  for (const [name, stat] of hits) {
    if (stat.total >= 2 && stat.found / stat.total >= 0.8) decoders.add(name);
  }
  return { decoders, hits };
}

function inlineTableLookups(toks, table, decoders) {
  const out = [];
  let resolved = 0;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (
      t.raw === '.' &&
      toks[i + 1] && toks[i + 1].type === 'ident' && decoders.has(toks[i + 1].raw) &&
      toks[i + 2] && toks[i + 2].raw === '(' &&
      toks[i + 3] && toks[i + 3].type === 'number' &&
      toks[i + 4] && toks[i + 4].raw === ')'
    ) {
      const idx = resolveIndex(toks[i + 3].raw);
      if (table.has(idx)) {
        const s = table.get(idx);
        out.push({ type: 'string', raw: quote(s), value: s });
        resolved++;
        i += 4;
        continue;
      }
    }
    out.push(t);
  }
  return { tokens: out, resolved };
}

function decodeStrings(toks) {
  let decoded = 0;
  for (const t of toks) {
    if (t.type !== 'string') continue;
    const body = t.raw.slice(1, -1);
    if (!body.includes('\\')) continue;
    const value = decodeEscapes(body);
    const before = t.raw;
    t.raw = quote(value);
    t.value = value;
    if (before !== t.raw) decoded++;
  }
  return decoded;
}

function foldConcatenation(toks) {
  let folded = 0;
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    const a = toks[i];
    const b = toks[i + 1];
    const c = toks[i + 2];
    if (a && b && c && a.type === 'string' && b.raw === '+' && c.type === 'string') {
      const value = a.value + c.value;
      out.push({ type: 'string', raw: quote(value), value });
      folded++;
      i += 2;
      continue;
    }
    out.push(a);
  }
  return { tokens: out, folded };
}

function simplifyMemberAccess(toks) {
  let simplified = 0;
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    const obj = toks[i];
    const open = toks[i + 1];
    const key = toks[i + 2];
    const close = toks[i + 3];
    const ok =
      obj && (obj.type === 'ident' || obj.raw === ')' || obj.raw === ']') &&
      open && open.raw === '[' &&
      key && key.type === 'string' && IDENT_RE.test(key.value) &&
      close && close.raw === ']';
    if (ok) {
      out.push(obj);
      out.push({ type: 'punct', raw: '.' });
      out.push({ type: 'ident', raw: key.value, value: key.value });
      simplified++;
      i += 3;
      continue;
    }
    out.push(obj);
  }
  return { tokens: out, simplified };
}

/* ---------------------------------------------------------------- emitter */
const WORDY = new Set(['ident', 'number', 'string', 'template', 'regex']);
const BINARY = new Set(['=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '&&=', '||=', '??=', '==', '!=', '===', '!==', '<', '>', '<=', '>=', '+', '-', '*', '/', '%', '**', '<<', '>>', '>>>', '&', '|', '^', '&&', '||', '??', '=>']);
const KEYWORD_BEFORE_PAREN = new Set(['if', 'for', 'while', 'switch', 'catch', 'with']);

function emit(toks) {
  const lines = [];
  let line = '';
  let indent = 0;
  let paren = 0;
  let bracket = 0;
  let atLineStart = true;
  let inCaseLabel = false;
  const pad = () => '  '.repeat(Math.max(0, indent));
  const write = (s) => {
    if (atLineStart) { line += pad(); atLineStart = false; }
    line += s;
  };
  const newline = () => {
    lines.push(line.replace(/[ \t]+$/, ''));
    line = '';
    atLineStart = true;
  };

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const prev = toks[i - 1];
    const next = toks[i + 1];

    if (t.type === 'comment') {
      if (t.raw.startsWith('//')) { write(t.raw); newline(); }
      else { write(t.raw); write(' '); }
      continue;
    }

    if (t.type === 'punct') {
      if (t.raw === '{') { write('{'); indent++; newline(); inCaseLabel = false; continue; }
      if (t.raw === '}') {
        indent = Math.max(0, indent - 1);
        if (!atLineStart) newline();
        write('}');
        if (next && (next.raw === 'else' || next.raw === 'catch' || next.raw === 'finally')) write(' ');
        else if (next && [';', ',', ')', ']', '.', '(', '[', '}', ':'].includes(next.raw)) { /* inline */ }
        else newline();
        inCaseLabel = false;
        continue;
      }
      if (t.raw === '(') { write('('); paren++; continue; }
      if (t.raw === ')') { paren = Math.max(0, paren - 1); write(')'); continue; }
      if (t.raw === '[') { write('['); bracket++; continue; }
      if (t.raw === ']') { bracket = Math.max(0, bracket - 1); write(']'); continue; }
      if (t.raw === ';') { write(';'); if (paren > 0) write(' '); else newline(); inCaseLabel = false; continue; }
      if (t.raw === ',') { write(','); if (paren > 0 || bracket > 0) write(' '); else newline(); continue; }
      if (t.raw === ':') {
        write(':');
        if (inCaseLabel) { newline(); inCaseLabel = false; }
        else write(' ');
        continue;
      }
      if (t.raw === '.' || t.raw === '?.' || t.raw === '!' || t.raw === '~' ||
          t.raw === '++' || t.raw === '--' || t.raw === '@' || t.raw === '#' || t.raw === '...') {
        write(t.raw);
        continue;
      }
    }

    if (BINARY.has(t.raw)) {
      if (!atLineStart) write(' ');
      write(t.raw);
      write(' ');
      continue;
    }

    const needsSpace =
      prev && !atLineStart &&
      ((WORDY.has(prev.type) && WORDY.has(t.type)) ||
       (prev.type === 'punct' && (prev.raw === ')' || prev.raw === ']')));
    if (needsSpace) write(' ');

    if (t.type === 'ident' && (t.raw === 'case' || t.raw === 'default')) inCaseLabel = true;

    if (t.type === 'ident' && KEYWORD_BEFORE_PAREN.has(t.raw) && next && next.raw === '(') {
      write(t.raw);
      write(' ');
      continue;
    }

    write(t.type === 'template' ? decodeTemplate(t.raw) : t.raw);
  }

  if (line.length) newline();
  return lines.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

function decodeTemplate(raw) {
  let out = '`';
  let i = 1;
  while (i < raw.length) {
    const c = raw[i];
    if (c === '\\') {
      const nxt = raw[i + 1];
      if (nxt === 'x') {
        const h = raw.substr(i + 2, 2);
        if (/^[0-9a-fA-F]{2}$/.test(h)) { out += String.fromCharCode(parseInt(h, 16)); i += 4; continue; }
      }
      if (nxt === 'u') {
        const h = raw.substr(i + 2, 4);
        if (/^[0-9a-fA-F]{4}$/.test(h)) { out += String.fromCharCode(parseInt(h, 16)); i += 6; continue; }
      }
      out += raw.substr(i, 2);
      i += 2;
      continue;
    }
    if (c === '$' && raw[i + 1] === '{') {
      let j = i + 2;
      let depth = 1;
      while (j < raw.length && depth > 0) {
        const d = raw[j];
        if (d === '\\') { j += 2; continue; }
        if (d === '"' || d === "'") {
          const q = d; j++;
          while (j < raw.length) { if (raw[j] === '\\') { j += 2; continue; } if (raw[j] === q) { j++; break; } j++; }
          continue;
        }
        if (d === '{') depth++;
        else if (d === '}') depth--;
        j++;
      }
      out += raw.slice(i, j);
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/* ----------------------------------------------------------------- runner */
function main() {
  const table = loadTable();
  console.log('strings.json: ' + table.size + ' entries');
  const args = process.argv.slice(2);
  const files = args.length ? args : ['main.js', 'vendor-private.js'];
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  let failures = 0;

  for (const file of files) {
    if (!fs.existsSync(file)) { console.log('skip (missing): ' + file); continue; }
    const started = Date.now();
    const src = fs.readFileSync(file, 'utf8');
    console.log('\n=== ' + file + ' (' + src.length.toLocaleString() + ' bytes)');

    let toks;
    try {
      toks = lex(src);
    } catch (err) {
      console.error('  lex failed: ' + err.message);
      failures++;
      continue;
    }

    const found = findDecoders(toks, table);
    const decoders = found.decoders;
    console.log('  decoder methods: ' + (decoders.size ? [...decoders].join(', ') : '(none)'));

    let step = inlineTableLookups(toks, table, decoders);
    toks = step.tokens;
    console.log('  table lookups inlined: ' + step.resolved.toLocaleString());

    console.log('  string literals unescaped: ' + decodeStrings(toks).toLocaleString());

    step = foldConcatenation(toks);
    toks = step.tokens;
    console.log('  literals folded: ' + step.folded.toLocaleString());

    step = simplifyMemberAccess(toks);
    toks = step.tokens;
    console.log('  obj[key] -> obj.key: ' + step.simplified.toLocaleString());

    const code = emit(toks);

    try {
      new Function(code);
    } catch (err) {
      console.error('  REFUSING to write: output does not parse -> ' + err.message);
      failures++;
      continue;
    }

    const outFile = path.join(OUT_DIR, file);
    fs.writeFileSync(outFile, code);
    console.log('  wrote ' + outFile + ' (' + code.length.toLocaleString() + ' bytes, ' +
      code.split('\n').length.toLocaleString() + ' lines) in ' + (Date.now() - started) + 'ms');
  }

  process.exitCode = failures ? 1 : 0;
}

if (require.main === module) main();
module.exports = { lex, emit, decodeEscapes, loadTable };
