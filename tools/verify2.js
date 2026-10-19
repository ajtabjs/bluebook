const fs = require(`fs`);
const { JSDOM } = require(`jsdom`);

const NL = String.fromCharCode(10);
const log = (x) => console.log(x);

const code = fs.readFileSync(`main.hooked2.js`, `utf8`);
const old = JSON.parse(fs.readFileSync(`strings.json`, `utf8`));

const dom = new JSDOM(`<!doctype html><html><body></body></html>`, {
  runScripts: `outside-only`,
  pretendToBeVisual: true,
  url: `https://bluebook.app.collegeboard.org/`,
});
const w = dom.window;
w.matchMedia = () => ({ matches: false, media: ``, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
try {
  const f = require(`fake-indexeddb`);
  w.indexedDB = f.indexedDB;
  w.IDBKeyRange = f.IDBKeyRange;
} catch (e) {}

log(`evaluating main.hooked2.js ...`);
try { w.eval(code); } catch (e) { log(`eval threw: ` + String(e.message).slice(0, 140)); }

log(`HOOKERR = ` + JSON.stringify(w.__HOOKERR));
log(`TRAPERR = ` + JSON.stringify(w.__TRAPERR));
log(`ASSIGN  = ` + w.__ASSIGN);
log(`WRAPS   = ` + w.__WRAPS);
log(`SEEN    = ` + JSON.stringify(w.__SEEN));
log(`captured at boot = ` + w.__COUNT());

const LOG = w.__LOG || {};
const keys = Object.keys(LOG).map(Number).sort((a, b) => a - b);
log(`index range = ` + (keys.length ? keys[0] + `..` + keys[keys.length - 1] : `none`));

log(NL + `== anchors ==`);
for (const k of [1471, 3062, 878]) {
  log(`  ` + k + `  old=` + JSON.stringify(old[k]) + `  hook=` + JSON.stringify(LOG[k]) + `  match=` + (old[k] === LOG[k]));
}

let agree = 0, disagree = 0, extra = 0;
for (const k of Object.keys(LOG)) {
  const idx = Number(k);
  if (old[idx] === undefined) { extra++; continue; }
  if (old[idx] === LOG[k]) agree++; else disagree++;
}
log(NL + `overlap: agree=` + agree + ` disagree=` + disagree + ` new_indices=` + extra);

fs.writeFileSync(`strings.hook2.json`, JSON.stringify(LOG, null, 0));
log(`wrote strings.hook2.json entries=` + Object.keys(LOG).length);

log(NL + `== sample ==`);
for (const k of keys.slice(0, 20)) log(`  ` + k + `->` + JSON.stringify(String(LOG[k]).slice(0, 50)));
