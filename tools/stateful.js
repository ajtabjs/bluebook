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
  plugins: [`optionalChaining`, `nullishCoalescingOperator`, `classProperties`, `classPrivateProperties`, `classPrivateMethods`, `dynamicImport`, `bigInt`, `numericSeparator`, `logicalAssignment`, `objectRestSpread`, `topLevelAwait`],
};

const src = fs.readFileSync(`main.js`, `utf8`);
const ast = parser.parse(src, OPTS);

// how many times is r_J assigned?
const assigns = [];
traverse(ast, {
  AssignmentExpression(p) {
    const L = p.node.left;
    if (!t.isMemberExpression(L)) return;
    if (!t.isIdentifier(L.property)) return;
    if (L.property.name !== `r_J`) return;
    assigns.push({ obj: t.isIdentifier(L.object) ? L.object.name : `?`, line: p.node.loc ? p.node.loc.start.line : -1 });
  },
});
log(`r_J assignments found=` + assigns.length);
for (const a of assigns) log(`  receiver=` + a.obj + ` line=` + a.line);

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

const snip = `try{globalThis.__RB=` + objName + `.r_J.bind(` + objName + `);globalThis.__REG=function(){return ` + objName + `[487024];};}catch(e){globalThis.__INJERR=String(e);}`;
anchor.insertAfter(parser.parse(snip, OPTS).program.body[0]);
const code = generate(ast, { comments: false, compact: false, jsescOption: { minimal: true } }).code;

const dom = new JSDOM(`<!doctype html><html><body></body></html>`, {
  runScripts: `outside-only`, pretendToBeVisual: true, url: `https://bluebook.app.collegeboard.org/`,
});
const w = dom.window;
if (!w.matchMedia) w.matchMedia = () => ({ matches: false, media: ``, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
try { const f = require(`fake-indexeddb`); w.indexedDB = f.indexedDB; w.IDBKeyRange = f.IDBKeyRange; } catch (e) {}
try { w.eval(code); } catch (e) { log(`eval threw: ` + String(e.message).slice(0, 100)); }

const rb = w.__RB;
log(NL + `== TEST 1: repeat same index 8x ==`);
for (let i = 0; i < 8; i++) {
  let v; try { v = rb(1471); } catch (e) { v = `THROW`; }
  log(` call` + i + `: ` + JSON.stringify(v));
}

log(NL + `== TEST 2: interleave 1471 with other indices ==`);
for (const k of [1471, 0, 1471, 5, 1471, 100, 1471]) {
  let v; try { v = rb(k); } catch (e) { v = `THROW`; }
  log(`  ` + k + `->` + JSON.stringify(v));
}

log(NL + `== TEST 3: same index twice, far apart ==`);
let a1; try { a1 = rb(3062); } catch (e) { a1 = `THROW`; }
for (let i = 0; i < 500; i++) { try { rb(i); } catch (e) {} }
let a2; try { a2 = rb(3062); } catch (e) { a2 = `THROW`; }
log(`  before=` + JSON.stringify(a1) + ` after500=` + JSON.stringify(a2) + ` same=` + (a1 === a2));

log(NL + `== TEST 4: does the registry object change identity? ==`);
try {
  const r1 = w.__REG();
  const r2 = w.__REG();
  log(`  same object=` + (r1 === r2) + ` ctor=` + (r1 && r1.constructor ? r1.constructor.name : `?`));
  if (r1) log(`  own keys sample=` + JSON.stringify(Object.keys(r1).slice(0, 12)));
  if (r1) log(`  I_3YXC9 typeof=` + typeof r1.I_3YXC9);
} catch (e) {
  log(` registry probe failed:` + e.message);
}

log(NL + `== TEST 5: raw function identity vs binding ==`);
try {
  const reg = w.__REG();
  const raw = reg.I_3YXC9;
  log(`  typeof raw=` + typeof raw);
  if (typeof raw === `function`) {
    for (const k of [1471, 3062, 5227]) {
      let v; try { v = raw.call(reg, k); } catch (e) { v = `THROW:` + e.message; }
      log(`  raw(` + k + `) = ` + JSON.stringify(v));
    }
  }
} catch (e) {
  log(` raw probe failed:` + e.message);
}
