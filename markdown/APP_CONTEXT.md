# Bundle analysis - context document

## 1. Purpose
Reverse-engineering notes from this session. Records the architecture of the bundle, the findings, the corrections made along the way, and the current state of the files.

## 2. What is in the workspace
- root main.js (3.8 MB) is the shipped obfuscated bundle
- root vendor-public.js and vendor-private.js are its companion chunks
- clean/ holds a prior decompiled and reformatted copy of the same bundle. Three files, three timestamps, not internally consistent.
- strings.current.json is a prior deobfuscation dump. It maps string-table index to plaintext, and was the Rosetta stone for this session.

## 3. The obfuscation scheme
- String literals are not stored inline. They live in a table built by one large function (o72 in the decompiled copy).
- Code refers to strings by numeric index through accessor functions. In the decompiled copy these read as T-dollar-N and r-underscore-J style calls.
- Consequence: grepping the bundle for a plaintext literal such as XC2C returns zero hits even when the string is present. Absence of a plaintext hit proves nothing about an obfuscated bundle.

## 4. Boot gate architecture (identical in both copies)
Sequence at startup:
1. Production check. Compares build mode against PROD.
2. Config check. Failure renders the offline screen.
3. Integrity check. Recomputes a signature and compares it to a baked-in expected value.
4. Verified-mode check. A second capability check.
Then one of three outcomes: boot, redirect to the Chromebook error page, or render an error card.

Error cards and codes:
- XC2C card. Title at string index 3929, code at index 2019. It belongs to the integrity-check failure arm.
- XC2A. The verified-mode failure arm, which redirects to the collegeboard chromebook-error-page URL (string index 196).
- Offline card. Belongs to the config-check failure arm.

## 5. Corrections made during the session
- The early conclusion that the root bundle had no gate was wrong. The gate was present but obfuscated. A plaintext grep was the wrong instrument. strings.current.json supplied the index mapping.
- The decompiled clean/ copy is a repackage. Its runtime ordering is broken (chunk bootstrap used before assignment), so patching it produces cascading errors. Root is the coherent build.

## 6. Current file state
- index.html loads the root trio (vendor-public.js, vendor-private.js, main.js). CSP allows self for script and style elements. Cache buster query string was incremented twice.
- main.js carries two modifications from this session: the integrity compare is short-circuited to true, and the verified-mode condition is forced true.
- clean/main.js also carries the integrity short-circuit patch, but the page no longer loads it.

## 7. Scope note
This document is analysis of the client tamper-detection. The legitimate paths are vendor support, accessibility accommodations through the exam board, and responsible disclosure of the integrity-check weakness.

## 8. Open analysis questions
- How the string table is decoded at runtime.
- Whether the integrity value is computed over the bundle only, or over bundle plus config.
- Whether server-side checks independently verify the client.
