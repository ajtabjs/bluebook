const fs = require(`fs`);
const parser = require(`@babel/parser`);
const generate = require(`@babel/generator`).default;
const traverse = require(`@babel/traverse`).default;
const t = require(`@babel/types`);
const { JSDOM } = require(`jsdom`);

const NL = String.fromCharCode(10);
const log = (x) => console.log(x);

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
log(`main.js bytes=` + src.length);

const ast = parser.parse(src, OPTS);

let anchor = null;
let objName = null;
traverse(ast, {
  AssignmentExpression(p) {
    if (anchor) return;
    const L = p.node.left;
    if (!t.isMemberExpression(L)) return;
    if (!t.isIdentifier(L.property)) return;
    if (L.property.name !== `r_J`) return;
    if (!t.isIdentifier(L.object)) return;
    if (!t.isFunctionExpression(p.node.right) && !t.isArrowFunctionExpression(p.node.right)) return;
    anchor = p.parentPath;
    objName = L.object.name;
  },
});

if (!anchor) { log(`FAILED: no anchor for r_J assignment`); process.exit(1); }
log(`anchor receiver=` + objName);

const snippetSrc = `try{globalThis.__RB=` + objName + `.r_J.bind(` + objName + `);globalThis.__OBJ=` + objName + `;}catch(e){globalThis.__INJERR=String(e);}`;
const snippet = parser.parse(snippetSrc, OPTS).program.body[0];
anchor.insertAfter(snippet);

const code = generate(ast, { comments: false, compact: false, jsescOption: { minimal: true } }).code;
log(`instrumented bytes=` + code.length);

const dom = new JSDOM(`<!doctype html><html><body></body></html>`, {
  runScripts: `outside-only`,
  pretendToBeVisual: true,
  url: `https://bluebook.app.collegeboard.org/`,
});
const w = dom.window;

if (!w.matchMedia) {
  w.matchMedia = function () {
    return { matches: false, media: ``, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } };
  };
}
try {
  const fidb = require(`fake-indexeddb`);
  w.indexedDB = fidb.indexedDB;
  w.IDBKeyRange = fidb.IDBKeyRange;
  log(`fake-indexeddb attached`);
} catch (e) {
  log(`fake-indexeddb unavailable: ` + e.message);
}

let runErr = null;
try {
  w.eval(code);
} catch (e) {
  runErr = e;
}
log(`eval done` + (runErr ? `(threw:` + String(runErr.message).slice(0, 120) + `)` : ` (clean)`));

if (w.__INJERR) log(`injection error: ` + w.__INJERR);

const rb = w.__RB;
if (typeof rb !== `function`) {
  log(`FAILED: __RB not captured — injection point not reached`);
  process.exit(1);
}
log(`__RB captured`);

const table = {};
const kinds = { string: 0, number: 0, boolean: 0, other: 0 };
let throws = 0;
let misses = 0;
const MAXI = 20000;
const BAIL = 3000;

for (let i = 0; i < MAXI; i++) {
  let v;
  try {
    v = rb(i);
  } catch (e) {
    throws++;
    misses++;
    if (misses >= BAIL) { log(`bail at i=` + i); break; }
    continue;
  }
  if (v === undefined || v === null) {
    misses++;
    if (misses >= BAIL) { log(`bail at i=` + i); break; }
    continue;
  }
  const ty = typeof v;
  if (ty === `string` || ty === `number` || ty === `boolean`) {
    table[i] = v;
    kinds[ty]++;
    misses = 0;
  } else {
    kinds.other++;
    misses = 0;
  }
}

const idx = Object.keys(table).map(Number).sort((a, b) => a - b);
log(`captured entries=` + idx.length);
log(`  strings=` + kinds.string + ` numbers=` + kinds.number + ` booleans=` + kinds.boolean + ` other=${kinds.other} throws=${throws}`);
if (idx.length) log(` index range` + idx[0] + `..` + idx[idx.length - 1]);

fs.writeFileSync(`strings.full.json`, JSON.stringify(table, null, 0));
log(`wrote strings.full.json`);

const old = JSON.parse(fs.readFileSync(`strings.json`, `utf8`));
const oldKeys = Object.keys(old).map(Number);
let agree = 0, disagree = 0, onlyOld = 0;
for (const k of oldKeys) {
  if (table[k] === undefined) { onlyOld++; continue; }
  if (table[k] === old[k]) agree++; else disagree++;
}
log(`vs strings.json: agree=` + agree + ` disagree=` + disagree + ` only_in_old=` + onlyOld);

const merged = Object.assign({}, old, table);
fs.writeFileSync(`strings.merged.json`, JSON.stringify(merged, null, 0));
log(`wrote strings.merged.json entries=` + Object.keys(merged).length);

log(NL + `-- sample --`);
for (const k of [1471, 3062, 5227, 9013, 878]) {
  log(`  ` + k + ` old=` + JSON.stringify(old[k]) + ` new=` + JSON.stringify(table[k]));
}
