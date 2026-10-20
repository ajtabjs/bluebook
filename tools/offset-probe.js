const fs = require(`fs`);
const cur = JSON.parse(fs.readFileSync(`strings.current.json`, `utf8`));
const raw = JSON.parse(fs.readFileSync(`strings.raw.json`, `utf8`));
const src = fs.readFileSync(`clean/vendor-private.js`, `utf8`);

// reverse map: value -> canonical index in cur
const rev = new Map();
for (const k of Object.keys(cur)) {
  const v = cur[k];
  if (typeof v !== `string`) continue;
  if (!rev.has(v)) rev.set(v, []);
  rev.get(v).push(Number(k));
}

// reverse map for raw
const rawRev = new Map();
for (const k of Object.keys(raw)) {
  const v = raw[k];
  if (typeof v !== `string`) continue;
  if (!rawRev.has(v)) rawRev.set(v, []);
  rawRev.get(v).push(Number(k));
}

const MARK = `O5z.`;
const samples = new Map();
let pos = 0;

while (true) {
  const at = src.indexOf(MARK, pos);
  if (at < 0) break;
  pos = at + MARK.length;

  let j = pos;
  while (j < src.length) {
    const c = src.charCodeAt(j);
    const ok = (c >= 65 && c <= 90) || (c >= 97 && c <= 122) ||
               (c >= 48 && c <= 57) || c === 95 || c === 36;
    if (!ok) break;
    j++;
  }
  if (j === pos) continue;
  const meth = src.slice(pos, j);
  if (src.charAt(j) !== `(`) continue;
  j++;
  while (j < src.length && (src.charAt(j) === ` ` || src.charAt(j) === `\t`)) j++;
  const ns = j;
  while (j < src.length) {
    const c = src.charCodeAt(j);
    if (c < 48 || c > 57) break;
    j++;
  }
  if (j === ns) continue;
  const idx = Number(src.slice(ns, j));
  while (j < src.length && (src.charAt(j) === ` ` || src.charAt(j) === `\t`)) j++;
  if (src.charAt(j) !== `)`) continue;

  const list = samples.get(meth) || [];
  if (list.length < 40 && !list.some(function (x) { return x === idx; })) list.push(idx);
  samples.set(meth, list);
}

for (const e of samples) {
  const meth = e[0];
  const idxs = e[1];
  const deltasCur = new Map();
  const deltasRaw = new Map();
  let resolved = 0;

  for (const i of idxs) {
    const rv = raw[i];
    if (typeof rv !== `string`) continue;
    resolved++;
    const curLocs = rev.get(rv);
    if (curLocs) for (const L of curLocs) {
      const d = L - i;
      deltasCur.set(d, (deltasCur.get(d) || 0) + 1);
    }
    const rawLocs = rawRev.get(rv);
    if (rawLocs) for (const L of rawLocs) {
      const d = L - i;
      deltasRaw.set(d, (deltasRaw.get(d) || 0) + 1);
    }
  }

  console.log(``);
  console.log(`== ` + meth + `(sampled` + idxs.length + `, resolved ` + resolved + `) ==`);
  const topCur = Array.from(deltasCur.entries()).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 4);
  const topRaw = Array.from(deltasRaw.entries()).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 4);
  console.log(` vs cur offsets:` + JSON.stringify(topCur));
  console.log(` vs raw offsets:` + JSON.stringify(topRaw));
  // show 5 raw samples
  const shown = idxs.slice(0, 5);
  for (const i of shown) {
    console.log(`    ` + i + ` raw=` + JSON.stringify(raw[i]).slice(0, 40));
  }
}
