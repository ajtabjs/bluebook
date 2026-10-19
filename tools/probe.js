const fs = require(`fs`);
const parser = require(`@babel/parser`);

const OPTS = {
  sourceType: `script`,
  allowReturnOutsideFunction: true,
  errorRecovery: false,
  plugins: [
    `optionalChaining`, `nullishCoalescingOperator`, `classProperties`,
    `classPrivateProperties`, `classPrivateMethods`, `dynamicImport`,
    `bigInt`, `numericSeparator`, `logicalAssignment`, `objectRestSpread`,
    `topLevelAwait`,
  ],
};

const NL = String.fromCharCode(10);
const files = process.argv.slice(2);

for (const f of files) {
  if (!fs.existsSync(f)) { console.log(`MISSING ` + f); continue; }
  const s = fs.readFileSync(f, `utf8`);
  const out = [];
  out.push(`file=` + f);
  out.push(`  bytes=` + s.length);

  try {
    const ast = parser.parse(s, OPTS);
    out.push(`  parse=OK`);
  } catch (e) {
    out.push(` parse=FAIL` + e.message.slice(0, 120));
    console.log(out.join(NL));
    continue;
  }

  const count = function (re) { const m = s.match(re); return m ? m.length : 0; };

  out.push(`  switch_stmt=` + count(/switch\s*\(/g));
  out.push(`  while_stmt=` + count(/while\s*\(/g));
  out.push(`  for_stmt=` + count(/for\s*\(/g));
  out.push(`  defineProperty=` + count(/Object\.defineProperty/g));
  out.push(`  globalThis=` + count(/globalThis/g));
  out.push(`  hex_escapes=` + count(/\x[0-9a-fA-F]{2}/g));
  out.push(`  unicode_escapes=` + count(/\u[0-9a-fA-F]{4}/g));
  out.push(`  eval_calls=` + count(/\beval\s*\(/g));
  out.push(`  newFunction=` + count(/new\s+Function\s*\(/g));
  out.push(`  atob_calls=` + count(/\batob\s*\(/g));
  out.push(`  fromCharCode=` + count(/fromCharCode/g));
  out.push(`  decoder_calls=` + count(/\.[A-Za-z_]*\(\s*[0-9]+\s*\)/g));
  out.push(`  webpack_push=` + count(/webpackChunk/g));
  out.push(`  module_exports=` + count(/module\.exports/g));

  const longest = s.split(/[^A-Za-z0-9+/=]/).reduce(function (a, b) { return b.length > a.length ? b : a; }, ``);
  out.push(`  longest_b64ish=` + longest.length);

  console.log(out.join(NL));
}
