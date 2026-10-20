// Dump string-table entries that look like version / browser / outdated gate copy.
const fs = require('fs');
const sb = JSON.parse(fs.readFileSync('strings.current.json', 'utf8'));

function toEntries(o) {
  if (Array.isArray(o)) return o.map((v, i) => [i, v]);
  return Object.entries(o);
}

const re = /version|outdated|unsupported|browser|chrome|compatibility|insecure|update|required/i;
for (const [i, v] of toEntries(sb)) {
  if (typeof v !== 'string') continue;
  if (re.test(v) && v.length < 300) console.log(i, JSON.stringify(v));
}
