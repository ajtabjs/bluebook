const fs = require(`fs`);
const parser = require(`@babel/parser`);
const traverse = require(`@babel/traverse`).default;
const generate = require(`@babel/generator`).default;
const t = require(`@babel/types`);

const OPTS = {
  sourceType: `script`,
  allowReturnOutsideFunction: true,
  errorRecovery: false,
  plugins: [`optionalChaining`,`nullishCoalescingOperator`,`classProperties`,
    `classPrivateProperties`,`classPrivateMethods`,`dynamicImport`,`bigInt`,
    `numericSeparator`,`logicalAssignment`,`objectRestSpread`,`topLevelAwait`],
};

function isIdentStart(c) {
  const n = c.charCodeAt(0);
  if (n >= 65 && n <= 90) return true;
  if (n >= 97 && n <= 122) return true;
  if (c === `_`) return true;
  if (c === String.fromCharCode(36)) return true;
  return false;
}

function isIdentPart(c) {
  const n = c.charCodeAt(0);
  if (n >= 48 && n <= 57) return true;
  return isIdentStart(c);
}

function isIdent(s) {
  if (!s.length) return false;
  if (!isIdentStart(s.charAt(0))) return false;
  for (let i = 1; i < s.length; i++) {
    if (!isIdentPart(s.charAt(i))) return false;
  }
  return true;
}

const RESERVED = {
  break: 1, case: 1, catch: 1, class: 1, const: 1, continue: 1, debugger: 1,
  default: 1, delete: 1, do: 1, else: 1, export: 1, extends: 1, finally: 1,
  for: 1, function: 1, if: 1, import: 1, in: 1, instanceof: 1, let: 1, new: 1,
  return: 1, super: 1, switch: 1, this: 1, throw: 1, try: 1, typeof: 1,
  var: 1, void: 1, while: 1, with: 1, yield: 1, await: 1, enum: 1,
  null: 1, true: 1, false: 1,
};

function main() {
  const f = process.argv[2];
  const src = fs.readFileSync(f, `utf8`);
  const ast = parser.parse(src, OPTS);
  let n = 0;
  traverse(ast, {
    MemberExpression: function (p) {
      if (!p.node.computed) return;
      const prop = p.node.property;
      if (!t.isStringLiteral(prop)) return;
      const v = prop.value;
      if (!isIdent(v)) return;
      if (RESERVED[v]) return;
      p.node.computed = false;
      p.node.property = t.identifier(v);
      n++;
    },
  });
  const code = generate(ast, { comments: true, compact: false, concise: false }).code;
  parser.parse(code, OPTS);
  fs.writeFileSync(f, code);
  console.log(`dotified=` + n + ` out=` + code.length);
}

main();
