const fs = require(`fs`);
const parser = require(`@babel/parser`);
const generate = require(`@babel/generator`).default;
const traverse = require(`@babel/traverse`).default;
const t = require(`@babel/types`);
const { JSDOM } = require(`jsdom`);

const NL = String.fromCharCode(10);
const log = (x) => console.log(x);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function main() {
  const src = fs.readFileSync(`main.js`, `utf8`);
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
  if (!anchor) { log(`no anchor`); process.exit(1); }
  log(`anchor=` + objName);

  const snip = `try{globalThis.__RB=` + objName + `.r_J.bind(` + objName + `);}catch(e){globalThis.__INJERR=String(e);}`;
  anchor.insertAfter(parser.parse(snip, OPTS).program.body[0]);
  const code = generate(ast, { comments: false, compact: false, jsescOption: { minimal: true } }).code;

  const dom = new JSDOM(`<!doctype html><html><body></body></html>`, {
    runScripts: `outside-only`,
    pretendToBeVisual: true,
    url: `https://bluebook.app.collegeboard.org/`,
  });
  const w = dom.window;
  if (!w.matchMedia) w.matchMedia = () => ({ matches: false, media: ``, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
  try {
    const f = require(`fake-indexeddb`);
    w.indexedDB = f.indexedDB;
    w.IDBKeyRange = f.IDBKeyRange;
  } catch (e) { log(`idb fail ` + e.message); }

  try { w.eval(code); } catch (e) { log(`eval threw: ` + String(e.message).slice(0, 100)); }

  const rb = w.__RB;
  if (typeof rb !== `function`) { log(`no __RB`); process.exit(1); }

  log(NL + `-- stability check at t=0 --`);
  for (const k of [1471, 3062, 878]) {
    const a = rb(k);
    const b = rb(k);
    log(`  ` + k + ` first=` + JSON.stringify(a) + ` second=` + JSON.stringify(b) + ` stable=` + (a === b));
  }

  for (const wait of [250, 750, 1500, 3000]) {
    await sleep(wait);
    log(NL + `-- after +` + wait + `ms --`);
    for (const k of [1471, 3062, 878]) {
      let v;
      try { v = rb(k); } catch (e) { v = `THROW:` + e.message; }
      log(`  ` + k + `=` + JSON.stringify(v));
    }
  }

  log(NL + `-- sweeping --`);
  const table = {};
  const kinds = { string: 0, number: 0, boolean: 0, other: 0 };
  let misses = 0;
  let throws = 0;
  for (let i = 0; i < 20000; i++) {
    let v;
    try { v = rb(i); } catch (e) { throws++; misses++; if (misses >= 3000) { log(`bail i=` + i); break; } continue; }
    if (v === undefined || v === null) { misses++; if (misses >= 3000) { log(`bail i=` + i); break; } continue; }
    const ty = typeof v;
    if (ty === `string` || ty === `number` || ty === `boolean`) { table[i] = v; kinds[ty]++; misses = 0; }
    else { kinds.other++; misses = 0; }
  }
  const idx = Object.keys(table).map(Number).sort((a, b) => a - b);
  log(`captured=` + idx.length + ` strings=` + kinds.string + ` numbers=` + kinds.number + ` bool=` + kinds.boolean + ` other=${kinds.other} throws=${throws}`);
  if (idx.length) log(` range` + idx[0] + `..` + idx[idx.length - 1]);

  fs.writeFileSync(`strings.full2.json`, JSON.stringify(table, null, 0));
  log(`wrote strings.full2.json`);

  const old = JSON.parse(fs.readFileSync(`strings.json`, `utf8`));
  let agree = 0, disagree = 0, onlyOld = 0;
  for (const k of Object.keys(old).map(Number)) {
    if (table[k] === undefined) { onlyOld++; continue; }
    if (table[k] === old[k]) agree++; else disagree++;
  }
  log(`vs old: agree=` + agree + ` disagree=` + disagree + ` only_in_old=` + onlyOld);

  log(NL + `-- anchors --`);
  log(` 1471 =` + JSON.stringify(table[1471]) + `  (want lastName)`);
  log(` 3062 =` + JSON.stringify(table[3062]) + `  (want isNonElectron)`);

  const nv = new Set(Object.values(table));
  log(`lastName present in new dump: ` + nv.has(`lastName`));
  log(`isNonElectron present in new dump: ` + nv.has(`isNonElectron`));
}

main().catch((e) => { console.error(e); process.exit(1); });
