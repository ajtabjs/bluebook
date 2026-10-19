const fs = require(`fs`);
const NL = String.fromCharCode(10);
const BLANK = String.fromCharCode(10);

const s = fs.readFileSync(`main.js`, `utf8`);
const table = JSON.parse(fs.readFileSync(`strings.json`, `utf8`));

// capture receiver more liberally: allow ) ] or identifier before .r_J
const re = /(\b[A-Za-z_]*|\)|\])?\.r_J\(\s*(\d+)\s*\)/g;
const idxCount = new Map();
let m;
while ((m = re.exec(s)) !== null) {
  const i = Number(m[2]);
  idxCount.set(i, (idxCount.get(i) || 0) + 1);
}

const all = Array.from(idxCount.keys()).sort(function (a, b) { return a - b; });
const missing = all.filter(function (i) { return table[i] === undefined; });
const present = all.filter(function (i) { return table[i] !== undefined; });

const out = [];
const push = function (x) { out.push(x); };

push(`distinct_indices_referenced=` + all.length);
push(`resolved=` + present.length + ` missing=` + missing.length);
push(`ref_min=` + all[0] + ` ref_max=` + all[all.length - 1]);

const tk = Object.keys(table).map(Number).sort(function (a, b) { return a - b; });
push(`table_min=` + tk[0] + ` table_max=` + tk[tk.length - 1] + ` table_count=` + tk.length);

// how many table slots in [min,max] are absent?
let holes = 0;
for (let i = tk[0]; i <= tk[tk.length - 1]; i++) if (table[i] === undefined) holes++;
push(`holes_inside_table_range=` + holes);

blank();
push(`-- missing index buckets (by 1000) --`);
const buckets = new Map();
for (const i of missing) {
  const b = Math.floor(i / 1000) * 1000;
  buckets.set(b, (buckets.get(b) || 0) + 1);
}
for (const e of Array.from(buckets.entries()).sort(function (a, b) { return a[0] - b[0]; })) {
  push(`  ` + e[0] + `-` + (e[0] + 999) + `: ` + e[1]);
}

blank();
push(`-- 20 sample missing indices + call counts --`);
for (const i of missing.slice(0, 20)) push(`  ` + i + ` x` + idxCount.get(i));

blank();
push(`-- value shape of resolved entries --`);
const vk = new Map();
for (const i of present) {
  const v = table[i];
  const k = typeof v + `:` + (typeof v === `string` ? v.length : 0);
  vk.set(k, (vk.get(k) || 0) + 1);
}
for (const e of Array.from(vk.entries()).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8)) push(`  ` + e[0] + `->` + e[1]);

blank();
push(`-- longest resolved values --`);
const longOnes = present.map(function (i) { return { i: i, v: String(table[i]) }; })
  .sort(function (a, b) { return b.v.length - a.v.length; }).slice(0, 5);
for (const x of longOnes) push(`  ` + x.i + ` len=` + x.v.length + ` ` + JSON.stringify(x.v.slice(0, 80)));

fs.writeFileSync(`work/gap.txt`, out.join(NL));
console.log(out.join(NL));
