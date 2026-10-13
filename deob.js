// deobfuscate.js
const fs = require('fs');
const path = require('path');

// ---- 1. load the string table ----
const stringsPath = path.join(__dirname, 'strings.json');
if (!fs.existsSync(stringsPath)) {
    console.error(`missing ${stringsPath} — export w205U from the running app first`);
    process.exit(1);
}
const mapping = JSON.parse(fs.readFileSync(stringsPath, 'utf8'));

// normalize keys to numbers (JSON keys are strings)
const table = {};
for (const k of Object.keys(mapping)) {
    const n = parseInt(k, 10);
    if (!Number.isNaN(n)) table[n] = mapping[k];
}
console.log(`loaded ${Object.keys(table).length} strings`);

// ---- 2. load the obfuscated bundle ----
const inPath = path.join(__dirname, 'main.js');
if (!fs.existsSync(inPath)) {
    console.error(`missing ${inPath}`);
    process.exit(1);
}
const original = fs.readFileSync(inPath, 'utf8');

// ---- 3. scan which indices are actually referenced ----
const methodRe = /\b([A-Za-z_$][\w$]*)\.(Q1v|J2O|a0k|b1u|M9K|A3S|z7Z|x15|L5X|L\$a|I50|G80|P1r|F4j|T\$N|r_J)\((\d+)\)/g;
const bracketRe = /\b([A-Za-z_$][\w$]*)\[(\d+)\]/g;

const referenced = new Set();
let m;
while ((m = methodRe.exec(original)) !== null) referenced.add(parseInt(m[3], 10));
while ((m = bracketRe.exec(original)) !== null) referenced.add(parseInt(m[2], 10));

const missing = [];
for (const idx of referenced) {
    if (table[idx] === undefined) missing.push(idx);
}
if (missing.length) {
    console.warn(`warning: ${missing.length} referenced indices are not in strings.json`);
    console.warn(`  sample: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ' …' : ''}`);
    console.warn(`  you may need to expand the range in your w205U dump loop (try 50000)`);
}

// ---- 4. rewrite ----
let out = original;

out = out.replace(methodRe, (full, obj, meth, num) => {
    const idx = parseInt(num, 10);
    return table[idx] !== undefined ? JSON.stringify(table[idx]) : full;
});

out = out.replace(bracketRe, (full, obj, num) => {
    const idx = parseInt(num, 10);
    return table[idx] !== undefined ? JSON.stringify(table[idx]) : full;
});

// ---- 5. write ----
const outPath = path.join(__dirname, 'deobfuscated.js');
fs.writeFileSync(outPath, out);
console.log(`wrote ${outPath}`);
console.log(`  ${original.length.toLocaleString()} → ${out.length.toLocaleString()} bytes`);