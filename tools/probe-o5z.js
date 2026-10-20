const fs = require(`fs`);
const cur = JSON.parse(fs.readFileSync(`strings.current.json`, `utf8`));
const raw = JSON.parse(fs.readFileSync(`strings.raw.json`, `utf8`));
const src = fs.readFileSync(`clean/vendor-private.js`, `utf8`);

const MARK = `O5z.`;
const stats = new Map();
let pos = 0;
let count = 0;

while (true) {
  const at = src.indexOf(MARK, pos);
  if (at < 0) break;
  pos = at + MARK.length;

  // parse method name: letters/digits/_/$
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

  // expect (
  if (src.charAt(j) !== `(`) continue;
  j++;

  // optional whitespace
  while (j < src.length && (src.charAt(j) === ` ` || src.charAt(j) === `\t`)) j++;

  // parse digits
  const numStart = j;
  while (j < src.length) {
    const c = src.charCodeAt(j);
    if (c < 48 || c > 57) break;
    j++;
  }
  if (j === numStart) continue;
  const idx = Number(src.slice(numStart, j));

  // expect )
  while (j < src.length && (src.charAt(j) === ` ` || src.charAt(j) === `\t`)) j++;
  if (src.charAt(j) !== `)`) continue;

  count++;
  const s = stats.get(meth) || { total: 0, cur: 0, raw: 0, samples: [] };
  s.total++;
  if (typeof cur[idx] === `string`) s.cur++;
  if (typeof raw[idx] === `string`) s.raw++;
  if (s.samples.length < 4) {
    s.samples.push({ idx: idx, cur: cur[idx], raw: raw[idx] });
  }
  stats.set(meth, s);
}

console.log(`total parsed calls = ` + count);
console.log("");
console.log(`method         total    cur-hit   cur%    raw-hit   raw%`);
console.log(`----------------------------------------------------------`);

const rows = Array.from(stats.entries()).sort(function (a, b) { return b[1].total - a[1].total; });
for (const e of rows) {
  const meth = e[0];
  const s = e[1];
  const cp = (s.cur / s.total * 100).toFixed(1);
  const rp = (s.raw / s.total * 100).toFixed(1);
  console.log(meth.padEnd(14) + String(s.total).padStart(6) +
    String(s.cur).padStart(9) + String(cp).padStart(8) +
    String(s.raw).padStart(10) + String(rp).padStart(7));
}

console.log("");
console.log(`== samples ==`);
for (const e of rows) {
  console.log(e[0] + `:`);
  for (const s of e[1].samples) {
    console.log(`  ` + s.idx + `  cur=` + JSON.stringify(s.cur) + `  raw=` + JSON.stringify(s.raw));
  }
}
