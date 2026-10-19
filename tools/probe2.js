const fs = require(`fs`);
const parser = require(`@babel/parser`);
const generate = require(`@babel/generator`).default;
const traverse = require(`@babel/traverse`).default;
const t = require(`@babel/types`);
const { JSDOM } = require(`jsdom`);

const NL = String.fromCharCode(10);
const log = (x) => console.log(x);

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
const reg = w.__REG();

log(`registry own keys=` + JSON.stringify(Object.keys(reg)));
log(`descriptor I_3YXC9=` + JSON.stringify(Object.getOwnPropertyDescriptor(reg, `I_3YXC9`), (k, v) => (typeof v === `function` ? `[fn]` : v)));

log(NL + `== baseline rb(1471), rb(3062) ==`);
log(` rb(1471) =` + JSON.stringify(rb(1471)));
log(` rb(3062) =` + JSON.stringify(rb(3062)));

log(NL + `== sweep 0..1470, then re-read 1471, 3062 ==`);
for (let i = 0; i < 1471; i++) { try { rb(i); } catch (e) {} }
log(` rb(1471) after =` + JSON.stringify(rb(1471)));
log(` rb(3062) after =` + JSON.stringify(rb(3062)));

log(NL + `== capture H before/after 5 extra calls ==`);
const H1 = reg.I_3YXC9;
for (let i = 0; i < 5; i++) { try { rb(1471); } catch (e) {} }
const H2 = reg.I_3YXC9;
log(`  same H ref=` + (H1 === H2));

log(NL + `== direct H calls with counter side-check ==`);
for (const k of [1471, 1471, 1471, 3062, 3062]) {
  let v; try { v = H1.call(reg, k); } catch (e) { v = `THROW:` + e.message; }
  log(`  H(` + k + `) = ` + JSON.stringify(v));
}

log(NL + `== test: does rb(i) return arr[i] AFTER N calls? (N=1471) ==`);
for (let round = 0; round < 2; round++) {
  for (let i = 0; i < 1471; i++) { try { rb(i); } catch (e) {} }
  log(` round` + round + `: rb(1471)=` + JSON.stringify(rb(1471)) + ` rb(0)=` + JSON.stringify(rb(0)) + ` rb(57)=` + JSON.stringify(rb(57)));
}

log(NL + `== capture all non-undefined in 0..12766 then re-read baseline ==`);
for (let i = 0; i < 12766; i++) { try { rb(i); } catch (e) {} }
log(` rb(1471) =` + JSON.stringify(rb(1471)));
log(` rb(3062) =` + JSON.stringify(rb(3062)));
log(` rb(5227) =` + JSON.stringify(rb(5227)));
log(` rb(878)  =` + JSON.stringify(rb(878)));
