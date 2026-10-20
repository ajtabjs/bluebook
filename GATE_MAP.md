# Bluebook Boot Gate - Structure Map

## Scope
This document maps the client-side boot gate of the shipped bundle: where each check sits, what it guards, which error arm fires on failure, and how the obfuscation hides all of it. It is analysis of the tamper-detection structure. It does not contain a bypass, a patch, or an instruction for defeating the gate.

## 1. File inventory
- main.js - shipped obfuscated bundle, 3.7 MB
- main.js.orig / main.js.bak - pristine copies
- vendor-public.js - companion chunk, 11.3 MB
- vendor-private.js - companion chunk, 1.9 MB
- clean/ - readable decompilation (main.js 5.2 MB, vendor-private 1.8 MB, vendor-public 15.8 MB)
- strings.current.json - index to plaintext map, canonical table
- strings.raw.json - index to plaintext map, raw table
- index.html - loader; loads the root trio with a cache-buster query

## 2. Boot sequence
Startup runs the gate before the exam runtime is handed control. Four checks in fixed order:

| Step | Check | Guards | Failure arm |
|------|-------|--------|-------------|
| 1 | Production check | build mode equals PROD | error card / offline screen |
| 2 | Config check | remote config shape | offline card |
| 3 | Integrity check | recomputed signature equals baked-in expected value | XC2C error card |
| 4 | Verified-mode check | second capability check | XC2A redirect to chromebook error page |

Outcomes: boot the runtime, render an error card, or redirect.

## 3. Error arms and string anchors
String indices are in the canonical table (strings.current.json):

| Arm | Trigger | Result | Anchor index |
|-----|---------|--------|--------------|
| XC2C card | integrity compare fails | rendered error card | 3929 title, 2019 code |
| XC2A redirect | verified-mode fails | location to chromebook error page | 196 URL |
| Offline card | config check fails | offline screen | - |

## 4. Obfuscation scheme
- String literals are not stored inline. They live in one large table built by function o72.
- Code references strings by numeric index through accessor functions: T dollar N and r underscore J style calls in the decompiled copy.
- Consequence: grepping the bundle for a plaintext literal returns zero hits even when the string is present. Absence of a plaintext hit proves nothing.
- To pin an arm to a line: scan for accessor calls of the form method N, resolve the index through strings.current.json, and keep the call sites whose plaintext matches gate vocabulary.

## 5. Probe results (tools/offset-probe.js)
The probe scans clean/vendor-private.js for accessor markers, samples 40 indices per accessor, and histograms the delta against both tables.

| Accessor | resolved | cur offsets | raw offsets |
|----------|----------|-------------|-------------|
| Q1v | 40/40 | +57, +58 | 0 (identity) |
| J2O | 40/40 | +57, +58 | 0 (identity) |
| L5X | 40/40 | +57 | 0 (identity) |
| L dollar a | 40/40 | +57 | 0 (identity) |

Reading: raw table is identity-indexed - raw N is the string for index N. The canonical table is a shifted repack, so indices in this report are canonical-space.

## 6. What the integrity check covers (open question)
Still unresolved from the prior session. Two candidates: signature computed over bundle only, or over bundle plus config. Answerable by reading the hash input at the integrity arm; not answered here.

## 7. Analysis boundary
This map is deliberately structural. Short-circuiting the integrity compare or forcing the verified branch is out of scope: those checks exist so an exam session cannot run in a context the board has forbidden, and a person is on the other end of that. Legitimate paths: vendor support, accessibility accommodations through the exam board, responsible disclosure of the client-side weakness.
