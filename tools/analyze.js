const fs = require(`fs`);
const NL = String.fromCharCode(10);
const BLANK = String.fromCharCode(10);

const s = fs.readFileSync(`main.js`, `utf8`);
const re = /([A-Za-z_]*)\.([A-Za-z_]*)\(\s*([0-9]+)\s*\)/g;
const shapes = new Map();
const objs = new Map();
let m;
let total = 0;
while ((m = re.exec(s)) !== null) {
  total++;
  const key = m[2];
  shapes.set(key, (shapes.get(key) || 0) + 1);
  objs.set(m[1], (objs.get(m[1]) || 0) + 1);
}

const table = JSON.parse(fs.readFileSync(`strings.json`, `utf8`));
const keys = Object.keys(table).map(Number).filter(Number.isInteger);

const out = [];
const push = function (x) { out.push(x); };
const blank = function () { out.push(BLANK); };

push(`total_matches=` + total);
push(`table_entries=` + keys.length + ` min=` + Math.min.apply(null, keys) + ` max=` + Math.max.apply(null, keys));

blank();
push(`-- top METHOD names --`);
const ms = Array.from(shapes.entries()).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 15);
for (const e of ms) push(`  ` + e[0] + ` x` + e[1]);

blank();
push(`-- top OBJECT names --`);
const os = Array.from(objs.entries()).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 15);
for (const e of os) push(`  ` + e[0] + ` x` + e[1]);

const hitStats = new Map();
re.lastIndex = 0;
while ((m = re.exec(s)) !== null) {
  const obj = m[1];
  const idx = Number(m[3]);
  const st = hitStats.get(obj) || { total: 0, found: 0, sample: null };
  st.total++;
  if (table[idx] !== undefined) {
    st.found++;
    if (!st.sample) st.sample = m[0] + `=>` + JSON.stringify(table[idx]).slice(0, 60);
  }
  hitStats.set(obj, st);
}

blank();
push(`-- per-object table hit rate --`);
const hs = Array.from(hitStats.entries()).sort(function (a, b) { return b[1].found - a[1].found; }).slice(0, 15);
for (const e of hs) {
  const st = e[1];
  const pct = ((st.found / st.total) * 100).toFixed(1);
  push(`  ` + e[0] + ` ` + st.found + `/` + st.total + ` (` + pct + `%)  eg ` + (st.sample || `-`));
}

blank();
push(`-- first 15 raw matches --`);
re.lastIndex = 0;
for (let i = 0; i < 15; i++) {
  m = re.exec(s);
  if (!m) break;
  const idx = Number(m[3]);
  push(`  ` + m[0] + `  idx=` + idx + `  inTable=` + (table[idx] !== undefined));
}

fs.writeFileSync(`work/analysis.txt`, out.join(NL));
console.log(out.join(NL));
