#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const NL = String.fromCharCode(10);
const MAX_BODY = 800;      // max statements per flattened chain
const MAX_DEPTH = 200;
const OPTS = {
  sourceType: 'script', allowReturnOutsideFunction: true, errorRecovery: false,
  plugins: ['optionalChaining','nullishCoalescingOperator','classProperties',
    'classPrivateProperties','classPrivateMethods','dynamicImport','bigInt',
    'numericSeparator','logicalAssignment','objectRestSpread','topLevelAwait'],
};

function litKey(n) {
  if (!n) return null;
  if (t.isNumericLiteral(n)) return 'n:' + n.value;
  if (t.isStringLiteral(n)) return 's:' + n.value;
  if (t.isBooleanLiteral(n)) return 'b:' + n.value;
  if (t.isNullLiteral(n)) return 'null';
  if (t.isUnaryExpression(n) && n.operator === '-' && t.isNumericLiteral(n.argument))
    return 'n:' + (-n.argument.value);
  return null;
}
function discAssign(s, name) {
  if (!t.isExpressionStatement(s)) return null;
  const e = s.expression;
  if (!t.isAssignmentExpression(e) || e.operator !== '=') return null;
  if (!t.isIdentifier(e.left) || e.left.name !== name) return null;
  return litKey(e.right) !== null ? e.right : null;
}
function parseLoopTest(n) {
  if (!t.isBinaryExpression(n) || n.operator !== '!==') return null;
  if (t.isIdentifier(n.left) && litKey(n.right) !== null)
    return { disc: n.left.name, exit: litKey(n.right) };
  if (litKey(n.left) !== null && t.isIdentifier(n.right))
    return { disc: n.right.name, exit: litKey(n.left) };
  return null;
}
function isTerminal(s) { return t.isReturnStatement(s) || t.isThrowStatement(s); }

function analyzeConsequent(cs, disc) {
  const b = cs.slice();
  if (b.length && t.isBreakStatement(b[b.length-1]) && !b[b.length-1].label) b.pop();
  else if (b.length && t.isContinueStatement(b[b.length-1])) return { err: 'continue' };
  if (!b.length) return { err: 'empty' };
  const last = b[b.length-1];
  if (isTerminal(last)) return { body: b, next: 'EXIT' };
  const lin = discAssign(last, disc);
  if (lin) {
    b.pop();
    if (b.length && isTerminal(b[b.length-1])) return { body: b, next: 'EXIT' };
    return { body: b, next: litKey(lin) };
  }
  if (t.isExpressionStatement(last) && t.isAssignmentExpression(last.expression)) {
    const e = last.expression;
    if (e.operator === '=' && t.isIdentifier(e.left) && e.left.name === disc &&
        t.isConditionalExpression(e.right)) {
      const a = litKey(e.right.consequent), c = litKey(e.right.alternate);
      if (a !== null && c !== null) {
        b.pop();
        if (b.length && isTerminal(b[b.length-1])) return { body: b, next: 'EXIT' };
        return { body: b, next: { cond: e.right.test, a: a, b: c } };
      }
    }
  }
  return { err: 'shape' };
}

// memoized size; -1 = cycle, -2 = over budget
function measure(state, caseMap, exit, depth, memo, visit) {
  if (depth > MAX_DEPTH) return -1;
  if (state === exit) return 0;
  if (memo.has(state)) return memo.get(state);
  if (visit.has(state)) return -1;
  visit.add(state);
  const e = caseMap.get(state);
  if (!e) { visit.delete(state); return -1; }
  let total = e.body.length;
  if (e.next !== 'EXIT') {
    if (typeof e.next === 'string') {
      const s = measure(e.next, caseMap, exit, depth+1, memo, visit);
      visit.delete(state);
      if (s < 0) return s;
      total += s;
    } else {
      const a = measure(e.next.a, caseMap, exit, depth+1, memo, visit);
      if (a < 0) { visit.delete(state); return a; }
      const b = measure(e.next.b, caseMap, exit, depth+1, memo, visit);
      if (b < 0) { visit.delete(state); return b; }
      total += a + b;
    }
  }
  visit.delete(state);
  if (total > MAX_BODY) { memo.set(state, -2); return -2; }
  memo.set(state, total);
  return total;
}

function build(state, caseMap, exit, depth, budget) {
  if (budget.remaining <= 0) return null;
  if (depth > MAX_DEPTH) return null;
  if (state === exit) return [];
  const e = caseMap.get(state);
  if (!e) return null;
  budget.remaining -= e.body.length;
  if (budget.remaining < 0) return null;
  const out = e.body.slice();
  if (e.next === 'EXIT') return out;
  if (typeof e.next === 'string') {
    const rest = build(e.next, caseMap, exit, depth+1, budget);
    if (!rest) return null;
    for (let i = 0; i < rest.length; i++) out.push(rest[i]);
    return out;
  }
  const a = build(e.next.a, caseMap, exit, depth+1, budget);
  if (!a) return null;
  const b = build(e.next.b, caseMap, exit, depth+1, budget);
  if (!b) return null;
  out.push(t.ifStatement(e.next.cond, t.blockStatement(a), t.blockStatement(b)));
  return out;
}

function tryUnflatten(loopPath, stats) {
  if (loopPath.isForStatement() && loopPath.node.init) return false;
  const bp = loopPath.get('body');
  if (!bp.isBlockStatement()) return false;
  const inner = bp.get('body');
  if (inner.length !== 1 || !inner[0].isSwitchStatement()) return false;
  const sw = inner[0].node;
  const cond = parseLoopTest(loopPath.node.test);
  if (!cond) return false;
  const disc = cond.disc, exit = cond.exit;
  if (!t.isIdentifier(sw.discriminant) || sw.discriminant.name !== disc) return false;
  if (sw.cases.some(function (c) { return c.test === null; })) return false;

  const caseMap = new Map();
  for (let i = 0; i < sw.cases.length; i++) {
    const c = sw.cases[i];
    const k = litKey(c.test);
    if (!k) return false;
    const r = analyzeConsequent(c.consequent, disc);
    if (r.err) { stats.shape++; return false; }
    caseMap.set(k, r);
  }

  const binding = loopPath.scope.getBinding(disc);
  if (!binding || binding.kind !== 'var') return false;

  const pp = loopPath.parentPath;
  if (!pp.isBlockStatement() && !pp.isProgram()) return false;
  const sibs = pp.get('body');
  const idx = sibs.indexOf(loopPath);
  if (idx <= 0) return false;

  let initPath = null, initKey = null;
  for (let i = idx-1; i >= 0 && i >= idx-4; i--) {
    const s = sibs[i];
    if (s.isVariableDeclaration()) {
      const hits = s.node.declarations.filter(function (d) {
        return t.isIdentifier(d.id) && d.id.name === disc && d.init && litKey(d.init) !== null;
      });
      if (hits.length === 1) { initPath = s; initKey = litKey(hits[0].init); break; }
      if (s.node.declarations.some(function (d) { return t.isIdentifier(d.id) && d.id.name === disc; })) return false;
      continue;
    }
    const av = discAssign(s.node, disc);
    if (av) { initPath = s; initKey = litKey(av); break; }
    let touches = false;
    s.traverse({ Identifier: function (p) { if (p.node.name === disc) touches = true; } });
    if (touches) return false;
  }
  if (!initPath) return false;

  for (const ref of binding.referencePaths) {
    let p = ref, ok = false;
    while (p) { if (p === loopPath || p === initPath) { ok = true; break; } p = p.parentPath; }
    if (!ok) return false;
  }
  for (const vio of binding.constantViolations) {
    let p = vio, ok = false;
    while (p) { if (p === loopPath || p === initPath) { ok = true; break; } p = p.parentPath; }
    if (!ok) return false;
  }

  const memo = new Map();
  const measured = measure(initKey, caseMap, exit, 0, memo, new Set());
  if (measured === -1) { stats.cycle++; return false; }
  if (measured === -2) { stats.tooBig++; return false; }

  const budget = { remaining: MAX_BODY };
  const out = build(initKey, caseMap, exit, 0, budget);
  if (!out) { stats.tooBig++; return false; }

  const blk = t.blockStatement(out);
  if (initPath.isVariableDeclaration() && initPath.node.declarations.length === 1) initPath.remove();
  else if (initPath.isVariableDeclaration())
    initPath.node.declarations = initPath.node.declarations.filter(function (d) {
      return !(t.isIdentifier(d.id) && d.id.name === disc);
    });
  else initPath.remove();
  loopPath.replaceWith(blk);
  return true;
}

function deobfuscate(src) {
  const stats = { flat: 0, cycle: 0, shape: 0, tooBig: 0 };
  const ast = parser.parse(src, OPTS);
  for (let r = 0; r < 30; r++) {
    let changed = 0;
    traverse(ast, {
      WhileStatement: function (p) { if (tryUnflatten(p, stats)) { changed++; stats.flat++; } },
      ForStatement: function (p) { if (tryUnflatten(p, stats)) { changed++; stats.flat++; } },
    });
    if (!changed) break;
  }
  const code = generate(ast, { comments: true, compact: false, concise: false }).code;
  parser.parse(code, OPTS);
  return { code: code, stats: stats };
}

function main() {
  const files = process.argv.slice(2);
  if (!files.length) { console.log('usage: node deflat4.js <file>'); process.exit(1); }
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const abs = path.resolve(f);
    if (!fs.existsSync(abs)) { console.log('missing ' + f); continue; }
    const src = fs.readFileSync(abs, 'utf8');
    console.log(NL + '=== ' + f + ' (' + src.length + ' bytes)');
    const r = deobfuscate(src);
    fs.writeFileSync(abs, r.code);
    console.log('  flattened = ' + r.stats.flat);
    console.log('  skipped   shape=' + r.stats.shape +
                ' cycle=' + r.stats.cycle +
                ' tooBig=' + r.stats.tooBig);
    console.log('  out = ' + r.code.length + ' bytes');
  }
}

if (require.main === module) main();
module.exports = { deobfuscate: deobfuscate };
