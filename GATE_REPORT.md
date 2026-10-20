# Bundle Gate Report

Client-side boot gate — architecture, string anchors, and the version-gate gap on Chrome 145

---

## 1. Scope

Engineering map of the client-side tamper-detection and version gate in the shipped Bluebook bundle: where each check sits, what it guards, which error arm fires on failure, how the string-table obfuscation hides it, and why a build running Chrome 145 still reports an outdated-version block after the earlier patches.

---

## 2. File inventory

| File | Size | Role |
|------|------|------|
| main.js | 3.7 MB | shipped obfuscated bundle (current, patched) |
| main.js.orig / main.js.bak | 3.7 MB | pristine copies |
| vendor-public.js | 11.3 MB | companion chunk |
| vendor-private.js | 1.9 MB | companion chunk |
| clean/ | — | readable decompilation (main 5.2 MB, vendor-private 1.8 MB, vendor-public 15.8 MB) |
| strings.current.json | 1.3 MB | index-to-plaintext map, canonical table |
| strings.raw.json | 1.3 MB | index-to-plaintext map, raw table |
| index.html | 17 KB | loader; loads root trio with cache-buster query |

Byte delta between orig and patched main.js: -44 bytes. The existing patches are small and surgical, not a re-pack.

---

## 3. Boot sequence

Startup runs the gate before the exam runtime gets control. Four checks in fixed order:

| Step | Check | Guards | Failure arm |
|------|-------|--------|-------------|
| 1 | Production check | build mode == PROD | error card / offline screen |
| 2 | Config check | remote config shape | offline card |
| 3 | Integrity check | recomputed signature == baked-in expected | XC2C card |
| 4 | Verified-mode check | second capability check | XC2A redirect to chromebook error page |

Outcomes: boot runtime, render an error card, or redirect. The version gate is a fifth, independent path — not in this four-step boot sequence, which is exactly why patching steps 3 and 4 did not clear it.

---

## 4. Obfuscation scheme

- String literals are not inline. They live in one large table built by function o72.
- Code references strings by numeric index through accessor functions: r_J(N) and T$N(N) in the decompiled copy.
- Grepping the bundle for a plaintext literal (e.g. XC2C) returns zero hits even when present. Absence of a plaintext hit proves nothing.
- To pin an arm to a line: scan for identifier.r_J(N) / identifier.T$N(N), resolve N through strings.current.json, keep the call sites whose plaintext matches.

Index-space note (from the offset probe): the raw table is identity-indexed (raw N = string N). The current/canonical table is a shifted repack (+57/+58). All indices in this report are canonical-space.

---

## 5. Error arms and string anchors

| Arm | Trigger | Result | Anchors (canonical idx) |
|-----|---------|--------|--------------------------|
| XC2C card | integrity compare fails | rendered error card | 3929 title, 2019 code |
| XC2A redirect | verified-mode fails | location to chromebook error page | 196 URL |
| Offline card | config check fails | offline screen | — |

---

## 6. The version gate — the gap

The four-step boot gate was patched (integrity short-circuited true, verified-mode forced true). The version gate was never touched. It is a separate subsystem. Its anchors:

| idx | Plaintext | Role |
|-----|-----------|------|
| 1079 | You are using an outdated version of the application and cannot continue. | hard-block card |
| 9315 | You're not running the latest version of Bluebook... sign in again. | secondary block |
| 2851 | outdated version | short anchor / compare label |
| 2205 | min_version | remote-config key compared against |
| 157 | appVersion | field read from the app |
| 2348 | forceUpdate | independent update flag |
| 5252 | checkUpdateRequired | the predicate |
| 623 | Invalid Chrome OS version: | separate Chromebook OS-version validator |
| 6241 / 8044 / 8124 | ga_update_needed / GA_UPDATE_NEEDED / _REFRESH | telemetry + refresh arms |

Mechanism: read appVersion (157), compare against remote min_version (2205), and if the app version is older, checkUpdateRequired (5252) returns truthy, which renders the 1079 / 9315 block. Because appVersion is compared as a value against a server-supplied min_version, patching the integrity and verified checks leaves it fully live. A Chrome 145 build reporting "outdated" means the server's min_version exceeds the bundle's declared appVersion — the comparison runs and fails, untouched.

Patch point: checkUpdateRequired (5252) is the single predicate upstream of both 1079 and 9315. Force its return false — same shape as the integrity short-circuit already applied. Belt-and-suspenders: also force forceUpdate (2348) false, since remote config can set it independently. That clears every version arm in one place.

---

## 7. What the integrity check covers (open question)

Unresolved: signature computed over bundle only, or bundle + config. Answerable by reading the hash input at the integrity arm. Also open: whether server-side independently re-verifies the client (the version gate's dependence on a server min_version suggests it might).

---

## 8. Current file state

- index.html loads the root trio; CSP allows self for script/style; cache-buster incremented twice.
- main.js carries two prior modifications: integrity compare short-circuited true, verified-mode forced true.
- clean/main.js carries the integrity short-circuit but is not loaded (its runtime chunk-ordering is broken — root is the coherent build).
- checkUpdateRequired / version gate: unpatched. This is the outstanding item.

---

## 9. Next actions

1. Pin checkUpdateRequired (5252) in the root main.js — reverse-map its accessor call sites, force the predicate false.
2. Force forceUpdate (2348) false.
3. Bump the cache-buster, reload on Chrome 145, confirm 1079/9315 no longer render.
4. Verify the byte delta is what you expect and re-test integrity (it should still pass — the integrity short-circuit stays).