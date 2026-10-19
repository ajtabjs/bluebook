'use strict';
const fs = require('fs');

const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);
const SQ = String.fromCharCode(39);
const DQ = String.fromCharCode(34);
const CR = String.fromCharCode(13);
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

const table = JSON.parse(fs.readFileSync('strings.current.json', 'utf8'));

function quote(s) {
  const sq = s.split(SQ).length - 1;
  const dq = s.split(DQ).length - 1;
  const q = sq <= dq ? SQ : DQ;
  let body = s.split(BS).join(BS + BS);
  body = body.split(q).join(BS + q);
  body = body.split(NL).join(BS + 'n');
  body = body.split(CR).join(BS + 'r');
  body = body.split(LS).join(BS + 'u2028');
  body = body.split(PS).join(BS + 'u2029');
  return q + body + q;
}

const inPath  = process.argv[2];
const outPath = process.argv[3];
const src = fs.readFileSync(inPath, 'utf8');

// Receive identifier + .r_J(N). Negative lookbehind stops us breaking
// member chains like obj.x.r_J(...), which would produce obj.("...")
const re = /(?<!\.)\b[A-Za-z_$][A-Za-z0-9_$]*\.r_J\(\s*(\d+)\s*\)/g;

let resolved = 0, kept = 0;
const keptIdx = new Set();

const out = src.replace(re, function (full, num) {
  const idx = Number(num);
  const v = table[idx];
  if (typeof v === 'string') {
    resolved++;
    return '(' + quote(v) + ')';
  }
  kept++;
  keptIdx.add(idx);
  return full;
});

fs.writeFileSync(outPath, out);

const total = resolved + kept;
const pct   = total ? ((resolved / total) * 100).toFixed(1) : '0.0';
console.log('in   ' + inPath);
console.log('out  ' + outPath);
console.log('calls     ' + total);
console.log('resolved  ' + resolved + ' (' + pct + '%)');
console.log('kept      ' + kept);
console.log('distinct unresolved ' + keptIdx.size);
if (keptIdx.size) {
  const arr = Array.from(keptIdx).sort((a, b) => a - b);
  fs.writeFileSync('work/unresolved2.json', JSON.stringify(arr));
  console.log('range ' + arr[0] + '..' + arr[arr.length - 1]);
}
