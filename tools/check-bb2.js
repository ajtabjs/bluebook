const fs = require(`fs`);
const NL = String.fromCharCode(10);
const log = (x) => console.log(x);

const d = JSON.parse(fs.readFileSync(`bb2_final.json`, `utf8`));
const t = JSON.parse(fs.readFileSync(`strings.json`, `utf8`));

const ks = Object.keys(d).map(Number).sort((a, b) => a - b);
log(`bb2_final.json`);
log(` entries =` + ks.length);
log(` range   =` + ks[0] + `..` + ks[ks.length - 1]);

const types = {};
for (const k of ks) {
  const ty = typeof d[k];
  types[ty] = (types[ty] || 0) + 1;
}
log(` types   =` + JSON.stringify(types));

log(NL + `== anchors ==`);
for (const k of [1471, 3062, 878, 5227, 57]) {
  const v = d[k];
  const want = t[k];
  log(`  ` + k + `  new=` + JSON.stringify(String(v).slice(0, 50)) +
      `  old=` + JSON.stringify(String(want).slice(0, 50)) +
      `  match=` + (v === want));
}

let agree = 0, disagree = 0, novel = 0;
for (const k of ks) {
  if (t[k] === undefined) { novel++; continue; }
  if (t[k] === d[k]) agree++;
  else disagree++;
}
log(NL + `== vs strings.json ==`);
log(` agree    =` + agree);
log(` disagree =` + disagree);
log(` novel    =` + novel);

// reverse lookup: are our values present under other indices?
const rev = new Map();
for (const [k, v] of Object.entries(t)) {
  if (typeof v !== `string`) continue;
  if (!rev.has(v)) rev.set(v, []);
  rev.get(v).push(Number(k));
}

let elsewhere = 0, notFound = 0;
const deltas = new Map();
const samples = [];
for (const k of ks) {
  const v = d[k];
  if (typeof v !== `string`) continue;
  const locs = rev.get(v);
  if (locs && locs.length) {
    elsewhere++;
    for (const L of locs) {
      const dd = L - k;
      deltas.set(dd, (deltas.get(dd) || 0) + 1);
    }
    if (samples.length < 8) {
      samples.push(`  idx=` + k + ` val=` + JSON.stringify(v.slice(0, 32)) + ` alsoAt=` + JSON.stringify(locs.slice(0, 3)));
    }
  } else {
    notFound++;
  }
}

log(NL + `== reverse lookup ==`);
log(` value found at another index =` + elsewhere);
log(` value absent from old table  =` + notFound);
log(`  top deltas (oldIdx - newIdx):`);
const ds = Array.from(deltas.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
for (const e of ds) log(`    ` + e[0] + ` x` + e[1]);
log(NL + `  samples:`);
for (const s of samples) log(s);

// quality sample of new entries
log(NL + `== random sample of 15 entries ==`);
const step = Math.max(1, Math.floor(ks.length / 15));
for (let i = 0; i < ks.length; i += step) {
  const k = ks[i];
  log(`  ` + k + `->` + JSON.stringify(String(d[k]).slice(0, 55)));
}
