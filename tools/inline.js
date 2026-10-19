const fs = require(`fs`);

const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);
const SQ = String.fromCharCode(39);
const DQ = String.fromCharCode(34);
const CR = String.fromCharCode(13);
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

const table = JSON.parse(fs.readFileSync(`strings.json`, `utf8`));

function quote(s) {
  const singles = s.split(SQ).length - 1;
  const doubles = s.split(DQ).length - 1;
  const q = singles <= doubles ? SQ : DQ;
  let body = s.split(BS).join(BS + BS);
  body = body.split(q).join(BS + q);
  body = body.split(NL).join(BS + `n`);
  body = body.split(CR).join(BS + `r`);
  body = body.split(LS).join(BS + `u2028`);
  body = body.split(PS).join(BS + `u2029`);
  return q + body + q;
}

function inlineFile(inPath, outPath) {
  const src = fs.readFileSync(inPath, `utf8`);
  const re = /\.r_J\(\s*(\d+)\s*\)/g;

  let resolved = 0;
  let kept = 0;
  const keptIdx = new Set();

  const out = src.replace(re, (full, num) => {
    const idx = Number(num);
    const v = table[idx];
    if (typeof v === `string`) {
      resolved++;
      return `/*rJ*/` + quote(v);
    }
    kept++;
    keptIdx.add(idx);
    return full;
  });

  fs.writeFileSync(outPath, out);

  const total = resolved + kept;
  const pct = total ? ((resolved / total) * 100).toFixed(1) : `0.0`;
  console.log(`
=== ` + inPath);
  console.log(` bytes in  =` + src.length);
  console.log(` bytes out =` + out.length);
  console.log(` r_J calls =` + total);
  console.log(` resolved  =` + resolved + ` (` + pct + `%)`);
  console.log(` kept      =` + kept);
  console.log(` distinct unresolved indices =` + keptIdx.size);

  return { resolved, kept, keptIdx };
}

const a = inlineFile(`work/main-fresh.js`, `work/main-inlined.js`);
const b = inlineFile(`work/vp-fresh.js`, `work/vp-inlined.js`);

const allKept = new Set([...a.keptIdx, ...b.keptIdx]);
const sorted = [...allKept].sort((x, y) => x - y);

fs.writeFileSync(`work/unresolved-indices.json`, JSON.stringify(sorted));
console.log(`
unresolved distinct indices across both: ` + sorted.length);
console.log(` range` + sorted[0] + `..` + sorted[sorted.length - 1]);
console.log(`  wrote work/unresolved-indices.json`);
