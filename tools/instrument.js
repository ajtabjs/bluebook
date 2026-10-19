const fs = require(`fs`);
const parser = require(`@babel/parser`);
const generate = require(`@babel/generator`).default;
const traverse = require(`@babel/traverse`).default;
const t = require(`@babel/types`);

const NL = String.fromCharCode(10);

const OPTS = {
  sourceType: `script`,
  allowReturnOutsideFunction: true,
  errorRecovery: false,
  plugins: [
    `optionalChaining`, `nullishCoalescingOperator`, `classProperties`,
    `classPrivateProperties`, `classPrivateMethods`, `dynamicImport`,
    `bigInt`, `numericSeparator`, `logicalAssignment`, `objectRestSpread`,
    `topLevelAwait`,
  ],
};

const src = fs.readFileSync(`main.js`, `utf8`);
const ast = parser.parse(src, OPTS);

const hits = [];
traverse(ast, {
  AssignmentExpression(p) {
    const L = p.node.left;
    if (!t.isMemberExpression(L) || !t.isIdentifier(L.property)) return;
    if (L.property.name !== `r_J`) return;
    hits.push({
      obj: t.isIdentifier(L.object) ? L.object.name : `?`,
      isFn: t.isFunctionExpression(p.node.right) || t.isArrowFunctionExpression(p.node.right),
      path: p.parentPath,
    });
  },
});

console.log(`r_J assignments found: ` + hits.length);
for (const h of hits) console.log(`  receiver=` + h.obj + ` functionValued=` + h.isFn);

const target = hits.find((h) => h.isFn && h.obj !== `?`);
if (!target) {
  console.error(`no function-valued r_J assignment found`);
  process.exit(1);
}

const obj = target.obj;
console.log(`instrumenting receiver: ` + obj);

const snippet = [
  `try {`,
  ` globalThis.__V6 =` + obj + `;`,
  `  globalThis.__LOG = globalThis.__LOG || Object.create(null);`,
  `  globalThis.__HOOKED = false;`,
  `  globalThis.__HOOK = function () {`,
  `    if (globalThis.__HOOKED) return 'already';`,
  `   var reg =` + obj + `[487024];`,
  `    if (!reg || typeof reg.I_3YXC9 !== 'function') return 'no-registry';`,
  `    var real = reg.I_3YXC9;`,
  `    reg.I_3YXC9 = function () {`,
  `      var v = real.apply(this, arguments);`,
  `      try {`,
  `        var k = arguments[0];`,
  `        if (typeof v === 'string' || typeof v === 'number') globalThis.__LOG[k] = v;`,
  `      } catch (e) {}`,
  `      return v;`,
  `    };`,
  `    globalThis.__HOOKED = true;`,
  `    return 'hooked';`,
  `  };`,
  `  globalThis.__COUNT = function () {`,
  `    return Object.keys(globalThis.__LOG).length;`,
  `  };`,
  `  globalThis.__DUMP = function () {`,
  `    return JSON.stringify(Object.assign({}, globalThis.__LOG));`,
  `  };`,
  `  globalThis.__HOOK();`,
  `} catch (e) { globalThis.__HOOKERR = String(e); }`,
].join(NL);

target.path.insertAfter(parser.parse(snippet, OPTS).program.body[0]);

const code = generate(ast, {
  comments: true,
  compact: false,
  jsescOption: { minimal: true },
}).code;

fs.writeFileSync(`main.hooked.js`, code);
console.log(`wrote main.hooked.js bytes=` + code.length);
console.log(`check it: node --check main.hooked.js`);
