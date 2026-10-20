// Compare main.js.orig (pristine) vs main.js (patched).
const fs = require('fs');

const A = fs.readFileSync('main.js.orig');
const B = fs.readFileSync('main.js');
console.log('orig len', A.length, 'patched len', B.length, 'delta', B.length - A.length);

let i = 0, j = 0;
const regions = [];
let region = null;

function resynced(pi, pj, n) {
  for (let k = 0; k < n; k++) {
    if (pi + k >= A.length || pj + k >= B.length) return false;
    if (A[pi + k] !== B[pj + k]) return false;
  }
  return true;
}

while (i < A.length || j < B.length) {
  const inA = i < A.length, inB = j < B.length;
  if (inA && inB && A[i] === B[j]) {
    if (region) { regions.push(region); region = null; }
    i++; j++; continue;
  }
  if (!region) region = { origStart: i, patchedStart: j, origBytes: [], patchedBytes: [] };
  if (i >= A.length) break;
  if (resynced(i + 1, j + 1, 8)) {
    region.origBytes.push(A[i]);
    region.patchedBytes.push(B[j]);
    i++; j++; continue;
  }
  if (resynced(i, j + 1, 8)) {
    region.patchedBytes.push(B[j]); j++; continue;
  }
  if (resynced(i + 1, j, 8)) {
    region.origBytes.push(A[i]); i++; continue;
  }
  region.origBytes.push(A[i]);
  region.patchedBytes.push(B[j]);
  i++; j++;
}
if (region) regions.push(region);

console.log('region count', regions.length);
for (const r of regions.slice(0, 40)) {
  const oa = Buffer.from(r.origBytes);
  const pa = Buffer.from(r.patchedBytes);
  console.log('---');
  console.log('orig@start=' + r.origStart + ' len=' + oa.length);
  console.log('patched@start=' + r.patchedStart + ' len=' + pa.length);
  console.log('ORI ' + JSON.stringify(oa.toString('utf8')));
  console.log('NEW ' + JSON.stringify(pa.toString('utf8')));
}
