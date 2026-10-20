const fs = require(`fs`);

const cur = JSON.parse(fs.readFileSync(`strings.current.json`, `utf8`));
const raw = JSON.parse(fs.readFileSync(`strings.raw.json`, `utf8`));

function t(n) {
  if (typeof cur[n] === `string`) return cur[n];
  if (typeof raw[n] === `string`) return raw[n];
  return null;
}

function dump(label, from, to) {
  console.log(`);
  console.log(`## ` + label);
  for (let i = from; i <= to; i++) {
    const v = t(i);
    if (v === null) continue;
    console.log(i + `\t` + JSON.stringify(v).slice(0, 110));
  }
}

console.log(`## ANCHORS`);
const anchors = { XC2C_title: 3929, XC2C_code: 2019, XC2A_url: 196 };
for (const k of Object.keys(anchors)) {
  const n = anchors[k];
  console.log(k + `\t` + n + `\t` + JSON.stringify(t(n)));
}

dump(`TABLE 3880-3980`, 3880, 3980);
dump(`TABLE 1980-2060`, 1980, 2060);
dump(`TABLE 160-230`, 160, 230);

console.log(`);
console.log(`## KEYWORD HITS`);
const kws = [`verified`, `verify`, `integrity`, `signature`, `production`, `prod`, `chromebook`, `collegeboard`, `XC2`, `offline`, `tamper`, `build mode`];
for (const kw of kws) {
  const hits = [];
  for (const n of Object.keys(cur)) {
    const v = cur[n];
    if (typeof v !== `string`) continue;
    if (v.toLowerCase().indexOf(kw.toLowerCase()) < 0) continue;
    hits.push(n + `=` + JSON.stringify(v).slice(0, 80));
  }
  if (hits.length) console.log(`[` + kw + `] ` + hits.slice(0, 15).join(`|`));
}

console.log(`);
console.log(`## CALL SITES`);
const gateRe = /verified|integrity|signature|prod|chromebook|collegeboard|xc2|offline|tamper|mode/i;

for (const file of [`clean/vendor-private.js`, `clean/main.js`]) {
  const src = fs.readFileSync(file, `utf8`);
  const re = /([A-Za-z_$][\w$]*)\s*\.\s*([A-Za-z_$][\w$]*)\s*\(\s*(\d+)\s*\)/g;
  const byMeth = new Map();
  let m;
  let total = 0;
  while ((m = re.exec(src)) !== null) {
    total++;
    const meth = m[1] + `.` + m[2];
    const idx = Number(m[3]);
    const v = t(idx);
    if (v === null) continue;
    if (!gateRe.test(v)) continue;
    const list = byMeth.get(meth) || [];
    if (list.length < 12) list.push(idx + `=` + v.slice(0, 55) + `@` + m.index);
    byMeth.set(meth, list);
  }
  console.log(`);
  console.log(`-- ` + file + `(scanned` + total + ` accessor calls)`);
  if (byMeth.size === 0) console.log(`   no gate-related resolved accessor calls`);
  for (const e of byMeth) console.log(`   ` + e[0] + `::` + e[1].join(`;`));
}
