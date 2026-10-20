#!/usr/bin/env python3
"""
Patch the version gate in main.js:
1. Force forceUpdate (index 2348) to false
2. Force checkUpdateRequired (index 5252) to false
"""

import sys

def patch_main_js(input_path, output_path):
    with open(input_path, 'rb') as f:
        data = bytearray(f.read())
    
    original_len = len(data)
    print(f"Original size: {original_len} bytes")
    
    # Patch 1: forceUpdate (2348) at offset ~2230197
    # Find: U6e[v0J.T$N(2348)]=void 0;
    # Change void 0 to !1 (keeping same byte length with padding)
    search1 = b'U6e[v0J.T$N(2348)]=void 0;'
    # Replace 'void 0' (6 bytes) with '!1;;;;' (6 bytes) to maintain length
    replace1 = b'U6e[v0J.T$N(2348)]=!1;;;;;'
    
    idx1 = data.find(search1)
    if idx1 == -1:
        print(f"ERROR: Could not find pattern 1: {search1}")
        return False
    print(f"Found forceUpdate at offset {idx1}")
    data[idx1:idx1+len(search1)] = replace1
    print(f"Patched forceUpdate: void 0 -> !1")
    
    # Patch 2: checkUpdateRequired (5252) at offset ~2284223
    # Find: A3_[v0J.T$N(5252)]=L6q[v0J.r_J(9203)];
    # Change RHS to !1 with padding to maintain length
    search2 = b'A3_[v0J.T$N(5252)]=L6q[v0J.r_J(9203)];'
    # L6q[v0J.r_J(9203)]; is 19 bytes, !1 + 17 semicolons = 19 bytes
    replace2 = b'A3_[v0J.T$N(5252)]=!1;;;;;;;;;;;;;;;;;'
    
    idx2 = data.find(search2)
    if idx2 == -1:
        print(f"ERROR: Could not find pattern 2: {search2}")
        return False
    print(f"Found checkUpdateRequired at offset {idx2}")
    data[idx2:idx2+len(search2)] = replace2
    print(f"Patched checkUpdateRequired: L6q[v0J.r_J(9203)] -> !1")
    
    new_len = len(data)
    print(f"New size: {new_len} bytes (delta: {new_len - original_len})")
    
    with open(output_path, 'wb') as f:
        f.write(data)
    
    print(f"Written to {output_path}")
    return True

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 patch_version_gate.py <main.js> [output.js]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file + '.patched'
    
    success = patch_main_js(input_file, output_file)
    sys.exit(0 if success else 1)