const fs = require(`fs`);
const parser = require(`@babel/parser`);
const traverse = require(`@babel/traverse`).default;
const generate = require(`@babel/generator`).default;

const BS = String.fromCharCode(92);
const OPTS = {
  sourceType: `script`,
  allowReturnOutsideFunction: true,
  errorRecovery: false,
  plugins: [`optionalChaining`,`nullishCoalescingOperator`,`classProperties`,
    `classPrivateProperties`,`classPrivateMethods`,`dynamicImport`,`bigInt`,
    `numericSeparator`,`logicalAssignment`,`objectRestSpread`,`topLevelAwait`],
};

function printable(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 32 && c !== 9) return false;
    if (c > 126) return false;
  }
  return true;
}

function main() {
  const f = process.argv[2];
  const src = fs.readFileSync(f, `utf8`);
  const ast = parser.parse(src, OPTS);
  let n = 0;
  let skipped = 0;
  traverse(ast, {
    StringLiteral: function (p) {
      const v = p.node.value;
      const extra = p.node.extra;
      if (!extra || !extra.raw) return;
      const raw = extra.raw;
      const hasX = raw.indexOf(BS + `x`) >= 0;
      const hasU = raw.indexOf(BS + `u`) >= 0;
      if (!hasX && !hasU) return;
      if (!printable(v)) { skipped++; return; }
      p.node.extra = undefined;
      n++;
    },
  });
  const code = generate(ast, { comments: true, compact: false, concise: false }).code;
  parser.parse(code, OPTS);
  fs.writeFileSync(f, code);
  console.log(`decoded=` + n + ` skipped=` + skipped + ` out=` + code.length);
}

main();
