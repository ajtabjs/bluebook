const fs = require(`fs`);
const path = require(`path`);
const parser = require(`@babel/parser`);
const traverse = require(`@babel/traverse`).default;
const generate = require(`@babel/generator`).default;
const t = require(`@babel/types`);

const ROOT = path.resolve(__dirname, `..`);
const NL = String.fromCharCode(10);

const OPTS = {
  sourceType: `script`,
  allowReturnOutsideFunction: true,
  errorRecovery: false,
  plugins: [
    `optionalChaining`,
    `nullishCoalescingOperator`,
    `classProperties`,
    `classPrivateProperties`,
    `classPrivateMethods`,
    `dynamicImport`,
    `bigInt`,
    `numericSeparator`,
    `logicalAssignment`,
    `objectRestSpread`,
    `topLevelAwait`,
  ],
};

function litKey(node) {
  if (!node) return null;
  if (t.isNumericLiteral(node)) return `n:` + node.value;
  if (t.isStringLiteral(node)) return `s:` + node.value;
  if (t.isBooleanLiteral(node)) return `b:` + node.value;
  if (t.isNullLiteral(node)) return `null`;
  if (t.isUnaryExpression(node) && node.operator === `-` && t.isNumericLiteral(node.argument)) {
    return `n:` + -node.argument.value;
  }
  return null;
}

function discAssign(stmt, name) {
  if (!t.isExpressionStatement(stmt)) return null;
  const e = stmt.expression;
  if (!t.isAssignmentExpression(e) || e.operator !== `=`) return null;
  if (!t.isIdentifier(e.left) || e.left.name !== name) return null;
  return litKey(e.right) !== null ? e.right : null;
}

function parseLoopTest(node) {
  if (!t.isBinaryExpression(node) || node.operator !== `!==`) return null;
  if (t.isIdentifier(node.left) && litKey(node.right) !== null) {
    return { disc: node.left.name, exit: litKey(node.right) };
  }
  if (litKey(node.left) !== null && t.isIdentifier(node.right)) {
    return { disc: node.right.name, exit: litKey(node.left) };
  }
  return null;
}

function isTerminal(stmt) {
  return t.isReturnStatement(stmt) || t.isThrowStatement(stmt);
}

function fnAncestor(p) {
  let q = p;
  while (q) {
    if (q.isFunction() || q.isProgram()) return q;
    q = q.parentPath;
  }
  return null;
}

function analyzeConsequent(consequent, discName) {
  const body = consequent.slice();
  let next = null;

  if (body.length && t.isBreakStatement(body[body.length - 1]) && !body[body.length - 1].label) {
    body.pop();
  } else if (body.length && t.isContinueStatement(body[body.length - 1])) {
    return null;
  }

  if (body.length && isTerminal(body[body.length - 1])) {
    next = `EXIT`;
  } else if (body.length) {
    const av = discAssign(body[body.length - 1], discName);
    if (av) {
      body.pop();
      next = litKey(av);
    } else if (t.isBreakStatement(consequent[consequent.length - 1])) {
      return null;
    } else {
      return null;
    }
  } else {
    return null;
  }

  if (body.length && isTerminal(body[body.length - 1])) next = `EXIT`;
  return { body: body, next: next };
}

function tryUnflatten(loopPath) {
  if (loopPath.isForStatement() && loopPath.node.init) return false;
  const bodyPath = loopPath.get(`body`);
  if (!bodyPath.isBlockStatement()) return false;
  const inner = bodyPath.get(`body`);
  if (inner.length !== 1 || !inner[0].isSwitchStatement()) return false;
  const switchNode = inner[0].node;

  const cond = parseLoopTest(loopPath.node.test);
  if (!cond) return false;
  const disc = cond.disc;
  const exit = cond.exit;

  if (!t.isIdentifier(switchNode.discriminant) || switchNode.discriminant.name !== disc) return false;
  if (switchNode.cases.some(function (c) { return c.test === null; })) return false;

  const caseMap = new Map();
  for (const c of switchNode.cases) {
    const key = litKey(c.test);
    if (!key) return false;
    const res = analyzeConsequent(c.consequent, disc);
    if (!res) return false;
    caseMap.set(key, res);
  }

  const binding = loopPath.scope.getBinding(disc);
  if (!binding) return false;
  if (binding.kind !== `var`) return false;

  const parentPath = loopPath.parentPath;
  if (!parentPath.isBlockStatement() && !parentPath.isProgram()) return false;
  const siblings = parentPath.get(`body`);
  const idx = siblings.indexOf(loopPath);
  if (idx <= 0) return false;

  let initPath = null;
  let initKey = null;
  for (let i = idx - 1; i >= 0 && i >= idx - 4; i--) {
    const s = siblings[i];
    if (s.isVariableDeclaration()) {
      const hits = s.node.declarations.filter(function (d) {
        return t.isIdentifier(d.id) && d.id.name === disc && d.init && litKey(d.init) !== null;
      });
      if (hits.length === 1) {
        initPath = s;
        initKey = litKey(hits[0].init);
        break;
      }
      if (s.node.declarations.some(function (d) { return t.isIdentifier(d.id) && d.id.name === disc; })) {
        return false;
      }
      continue;
    }
    const av = discAssign(s.node, disc);
    if (av) {
      initPath = s;
      initKey = litKey(av);
      break;
    }
    let touches = false;
    s.traverse({
      Identifier: function (p2) { if (p2.node.name === disc) touches = true; },
    });
    if (touches) return false;
  }
  if (!initPath) return false;

  for (const ref of binding.referencePaths) {
    let p = ref;
    let ok = false;
    while (p) {
      if (p === loopPath || p === initPath) { ok = true; break; }
      p = p.parentPath;
    }
    if (!ok) return false;
  }
  for (const vio of binding.constantViolations) {
    let p = vio;
    let ok = false;
    while (p) {
      if (p === loopPath || p === initPath) { ok = true; break; }
      p = p.parentPath;
    }
    if (!ok) return false;
  }

  const out = [];
  const seen = new Set();
  let cur = initKey;
  let finished = false;

  for (let guard = 0; guard !== 10000; guard++) {
    if (cur === exit) { finished = true; break; }
    if (seen.has(cur)) return false;
    seen.add(cur);
    const entry = caseMap.get(cur);
    if (!entry) return false;
    for (const st of entry.body) out.push(st);
    if (entry.next === `EXIT`) { finished = true; break; }
    cur = entry.next;
  }
  if (!finished) return false;

  const block = t.blockStatement(out);
  if (initPath.isVariableDeclaration() && initPath.node.declarations.length === 1) {
    initPath.remove();
  } else if (initPath.isVariableDeclaration()) {
    initPath.node.declarations = initPath.node.declarations.filter(function (d) {
      return !(t.isIdentifier(d.id) && d.id.name === disc);
    });
  } else {
    initPath.remove();
  }
  loopPath.replaceWith(block);
  return true;
}

function simplifyArgumentsArray(ast) {
  let n = 0;
  traverse(ast, {
    VariableDeclarator: function (p) {
      const init = p.node.init;
      if (!t.isArrayExpression(init) || init.elements.length !== 1) return;
      if (!t.isIdentifier(init.elements[0]) || init.elements[0].name !== `arguments`) return;
      if (!t.isIdentifier(p.node.id)) return;

      const name = p.node.id.name;
      const binding = p.scope.getBinding(name);
      if (!binding || binding.kind !== `var`) return;
      if (binding.constantViolations.length) return;

      const ownerFn = fnAncestor(p);
      if (!ownerFn || !ownerFn.isFunction()) return;
      if (ownerFn.isArrowFunctionExpression()) return;

      for (const rp of binding.referencePaths) {
        const mem = rp.parentPath;
        if (!mem.isMemberExpression() || mem.node.object !== rp.node) return;
        if (!t.isNumericLiteral(mem.node.property) && !t.isStringLiteral(mem.node.property)) return;
        if (fnAncestor(mem) !== ownerFn) return;
      }

      for (const rp of binding.referencePaths) {
        const mem = rp.parentPath;
        const prop = mem.node.property;
        const idx = t.isNumericLiteral(prop) ? prop.value : Number(prop.value);
        if (!Number.isInteger(idx)) return;
        if (idx === 0) {
          const outer = mem.parentPath;
          if (outer.isMemberExpression() && outer.node.object === mem.node && t.isNumericLiteral(outer.node.property)) {
            outer.replaceWith(t.memberExpression(t.identifier(`arguments`), t.numericLiteral(outer.node.property.value), true));
          } else {
            mem.replaceWith(t.identifier(`arguments`));
          }
          n++;
        }
      }
      p.remove();
    },
  });
  return n;
}

function deobfuscate(src) {
  const stats = { unflattened: 0, argArrays: 0, passes: 0 };
  let ast = parser.parse(src, OPTS);

  for (let round = 0; round !== 20; round++) {
    let changed = 0;
    traverse(ast, {
      WhileStatement: function (p) { if (tryUnflatten(p)) changed++; },
      ForStatement: function (p) { if (tryUnflatten(p)) changed++; },
    });
    stats.unflattened += changed;
    stats.passes++;
    if (!changed) break;
  }

  stats.argArrays = simplifyArgumentsArray(ast);

  const code = generate(ast, {
    comments: true,
    compact: false,
    concise: false,
    jsescOption: { minimal: true },
    retainLines: false,
  }).code;

  parser.parse(code, OPTS);
  return { code: code, stats: stats };
}

function main() {
  const args = process.argv.slice(2);
  const files = args.length ? args : [`clean/main.js`, `clean/vendor-private.js`];

  for (const rel of files) {
    const abs = path.resolve(ROOT, rel);
    if (!fs.existsSync(abs)) { console.log(`skip missing ` + rel); continue; }
    const src = fs.readFileSync(abs, `utf8`);
    const t0 = Date.now();
    console.log(NL + `=== ` + rel + ` bytes=` + src.length);

    let res;
    try {
      res = deobfuscate(src);
    } catch (err) {
      console.error(` FAILED` + err.message);
      process.exitCode = 1;
      continue;
    }

    fs.writeFileSync(abs, res.code);
    console.log(`  unflattened=` + res.stats.unflattened);
    console.log(`  argumentsArrays=` + res.stats.argArrays);
    console.log(`  outBytes=` + res.code.length + ` ms=` + (Date.now() - t0));
  }
}

if (require.main === module) main();
module.exports = { deobfuscate: deobfuscate };
