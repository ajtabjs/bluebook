const fs = require(`fs`);
const parser = require(`@babel/parser`);
const generate = require(`@babel/generator`).default;
const traverse = require(`@babel/traverse`).default;
const t = require(`@babel/types`);

const NL = String.fromCharCode(10);

const OPTS = {
  sourceType: `script`, allowReturnOutsideFunction: true, errorRecovery: false,
  plugins: [`optionalChaining`, `nullishCoalescingOperator`, `classProperties`, `classPrivateProperties`, `classPrivateMethods`, `dynamicImport`, `bigInt`, `numericSeparator`, `logicalAssignment`, `objectRestSpread`, `topLevelAwait`],
};

const src = fs.readFileSync(`main.js`, `utf8`);
const ast = parser.parse(src, OPTS);

let anchor = null, objName = null;
traverse(ast, {
  AssignmentExpression(p) {
    if (anchor) return;
    const L = p.node.left;
    if (!t.isMemberExpression(L) || !t.isIdentifier(L.property)) return;
    if (L.property.name !== `r_J` || !t.isIdentifier(L.object)) return;
    if (!t.isFunctionExpression(p.node.right) && !t.isArrowFunctionExpression(p.node.right)) return;
    anchor = p.parentPath; objName = L.object.name;
  },
});

if (!anchor) { console.error(`no anchor`); process.exit(1); }
console.log(`anchor receiver=` + objName);

const S = [
  `try {`,
  ` globalThis.__V6 =` + objName + `;`,
  `  globalThis.__LOG = globalThis.__LOG || Object.create(null);`,
  `  globalThis.__ASSIGN = 0;`,
  `  globalThis.__WRAPS = 0;`,
  `  globalThis.__SEEN = [];`,
  `  var __wrap = function (reg) {`,
  `    if (!reg || typeof reg.I_3YXC9 !== 'function') return;`,
  `    if (reg.__wrapped) return;`,
  `    var real = reg.I_3YXC9;`,
  `    reg.I_3YXC9 = function () {`,
  `      var v = real.apply(this, arguments);`,
  `      try {`,
  `        var k = arguments[0];`,
  `        if (typeof v === 'string' || typeof v === 'number') globalThis.__LOG[k] = v;`,
  `      } catch (e) {}`,
  `      return v;`,
  `    };`,
  `    try { reg.__wrapped = true; } catch (e) {}`,
  `    globalThis.__WRAPS++;`,
  `  };`,
  ` var __cur =` + objName + `[487024];`,
  `  try {`,
  `    Object.defineProperty(` + objName + `, 487024, {`,
  `      configurable: true,`,
  `      enumerable: true,`,
  `      get: function () { return __cur; },`,
  `      set: function (v) {`,
  `        __cur = v;`,
  `        globalThis.__ASSIGN++;`,
  `        try { globalThis.__SEEN.push(Object.keys(v || {}).join(',')); } catch (e) {}`,
  `        __wrap(v);`,
  `      }`,
  `    });`,
  `  } catch (e) { globalThis.__TRAPERR = String(e); }`,
  `  __wrap(__cur);`,
  `  globalThis.__COUNT = function () { return Object.keys(globalThis.__LOG).length; };`,
  `  globalThis.__DUMP = function () { return JSON.stringify(Object.assign({}, globalThis.__LOG)); };`,
  `  globalThis.__SAVE = function () { try { localStorage.setItem('__strings', globalThis.__DUMP()); return 'saved'; } catch (e) { return 'err'; } };`,
  `} catch (e) { globalThis.__HOOKERR = String(e); }`,
].join(NL);

anchor.insertAfter(parser.parse(S, OPTS).program.body[0]);

const code = generate(ast, { comments: true, compact: false, jsescOption: { minimal: true } }).code;
fs.writeFileSync(`main.hooked2.js`, code);
console.log(`wrote main.hooked2.js bytes=` + code.length);
