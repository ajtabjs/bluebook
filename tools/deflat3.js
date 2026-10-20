#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const NL = String.fromCharCode(10);
const OPTS = {
  sourceType: 'script', allowReturnOutsideFunction: true, errorRecovery: false,
  plugins: ['optionalChaining','nullishCoalescingOperator','classProperties',
    'classPrivateProperties','classPrivateMethods','dynamicImport','bigInt',
    'numericSeparator','logicalAssignment','objectRestSpread','topLevelAwait'],
};

function litKey(node) {
  if (!node) return null;
  if (t.isNumericLiteral(node)) return 'n:' + node.value;
  if (t.isStringLiteral(node)) return 's:' + node.value;
  if (t.isBooleanLiteral(node)) return 'b:' + node.value;
  if (t.isNullLiteral(node)) return 'null';
  if (t.isUnaryExpression(node) && node.operator === '-' && t.isNumericLiteral(node.argument))
    return 'n:' + (-node.argument.value);
  return null;
}
function discAssign(stmt, name) {
  if (!t.isExpressionStatement(stmt)) return null;
  const e = stmt.expression;
  if (!t.isAssignmentExpression(e) || e.operator !== '=') return null;
  if (!t.isIdentifier(e.left) || e.left.name !== name) return null;
  return litKey(e.right) !== null ? e.right : null;
}
function parseLoopTest(node) {
  if (!t.isBinaryExpression(node) || node.operator !== '!==') return null;
  if (t.isIdentifier(node.left) && litKey(node.right) !== null)
    return { disc: node.left.name, exit: litKey(node.right) };
  if (litKey(node.left) !== null && t.isIdentifier(node.right))
    return { disc: node.right.name, exit: litKey(node.left) };
  return null;
}
function isTerminal(s) { return t.isReturnStatement(s) || t.isThrowStatement(s); }

function analyzeConsequent(consequent, disc) {
  const body = consequent.slice();
  if (body.length && t.isBreakStatement(body[body.length-1]) && !body[body.length-1].label) body.pop();
  else if (body.length && t.isContinueStatement(body[body.length-1])) return { err: 'continue' };
  if (!body.length) return { err: 'empty' };

  const last = body[body.length-1];
  if (isTerminal(last)) return { body, next: 'EXIT' };

  const lin = discAssign(last, disc);
  if (lin) {
    body.pop();
    if (body.length && isTerminal(body[body.length-1])) return { body, next: 'EXIT' };
    return { body, next: litKey(lin) };
  }

  if (t.isExpressionStatement(last) && t.isAssignmentExpression(last.expression)) {
    const e = last.expression;
    if (e.operator === '=' && t.isIdentifier(e.left) && e.left.name === disc &&
        t.isConditionalExpression(e.right)) {
      const a = litKey(e.right.consequent);
      const b = litKey(e.right.alternate);
      if (a !== null && b !== null) {
        body.pop();
        return { body, next: { cond: e.right.test, a, b } };
      }
    }
  }
  return { err: 'shape' };
}

function resolveChain(state, caseMap, exit, visited, out, depth, stats) {
  if (depth > 800 || out.length > 5000) { stats.depth++; return false; }
  if (state === exit) return true;
  if (visited.has(state)) { stats.cycle++; return false; }
  visited.add(state);
  const entry = caseMap.get(state);
  if (!entry) { stats.missing++; return false; }
  for (const s of entry.body) out.push(s);
  if (entry.next === 'EXIT') return true;
  if (typeof entry.next === 'string')
    return resolveChain(entry.next, caseMap, exit, visited, out, depth+1, stats);

  const c = entry.next;
  const outA = [], outB = [];
  const visA = new Set(visited), visB = new Set(visited);
  const okA = resolveChain(c.a, caseMap, exit, visA, outA, depth+1, stats);
  const okB = resolveChain(c.b, caseMap, exit, visB, outB, depth+1, stats);
  if (!okA || !okB) return false;
  out.push(t.ifStatement(c.cond, t.blockStatement(outA), t.blockStatement(outB)));
  return true;
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
  for (const c of sw.cases) {
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

  const out = [];
  if (!resolveChain(initKey, caseMap, exit, new Set(), out, 0, stats)) return false;

  const block = t.blockStatement(out);
  if (initPath.isVariableDeclaration() && initPath.node.declarations.length === 1) initPath.remove();
  else if (initPath.isVariableDeclaration())
    initPath.node.declarations = initPath.node.declarations.filter(function (d) {
      return !(t.isIdentifier(d.id) && d.id.name === disc);
    });
  else initPath.remove();
  loopPath.replaceWith(block);
  return true;
}

function deobfuscate(src) {
  const stats = { flat: 0, cycle: 0, shape: 0, depth: 0, missing: 0 };
  let ast = parser.parse(src, OPTS);
  for (let r = 0; r < 30; r++) {
    let changed = 0;
    traverse(ast, {
      WhileStatement: function (p) { if (tryUnflatten(p, stats)) { changed++; stats.flat++; } },
      ForStatement: function (p) { if (tryUnflatten(p, stats)) { changed++; stats.flat++; } },
    });
    if (!changed) break;
  }
  const code = generate(ast, { comments: true, compact: false, concise: false,
    jsescOption: { minimal: true } }).code;
  parser.parse(code, OPTS);
  return { code: code, stats: stats };
}

function main() {
  const files = process.argv.slice(2);
  if (!files.length) { console.log('usage: node deflat3.js <file>'); process.exit(1); }
  for (const f of files) {
    const abs = path.resolve(f);
    if (!fs.existsSync(abs)) { console.log('missing ' + f); continue; }
    const src = fs.readFileSync(abs, 'utf8');
    console.log(NL + '=== ' + f + ' (' + src.length + ' bytes)');
    const r = deobfuscate(src);
    fs.writeFileSync(abs, r.code);
    console.log('  flattened = ' + r.stats.flat);
    console.log('  skipped   cycle=' + r.stats.cycle +
                ' shape=' + r.stats.shape +
                ' depth=' + r.stats.depth +
                ' missing=' + r.stats.missing);
    console.log('  out = ' + r.code.length + ' bytes');
  }
}

if (require.main === module) main();
module.exports = { deobfuscate: deobfuscate };
