#!/usr/bin/env python3
"""
Patch D9z function in main.js to always return SUCCESS (verified mode on).
"""

import sys

def patch_d9z(input_path, output_path):
    with open(input_path, 'rb') as f:
        data = bytearray(f.read())
    
    original_len = len(data)
    print(f"Original size: {original_len} bytes")
    
    # Find the D9z function start
    search = b'function D9z(){var t_W=[arguments];return '
    idx = data.find(search)
    if idx == -1:
        print(f"ERROR: Could not find D9z function start")
        return False
    
    print(f"Found D9z at offset {idx}")
    
    # The function body starts after "return "
    func_body_start = idx + len(search)
    
    # We need to find the end of the function to replace it
    # But it's complex. Simpler: patch right after the return to immediately return SUCCESS
    # The new body: return Promise.resolve({code:"SUCCESS",silent:!1});
    # This replaces from func_body_start to the end of the function
    
    # Find the matching closing brace for the function
    # This is tricky in minified code. Let's instead patch at a strategic point.
    
    # Better approach: find the first "return" after the function start that returns the Promise
    # The pattern is: return (t_W[7]=function*(){...}, new Promise(...))
    
    # Let's find the end of the function by counting braces
    brace_count = 0
    in_string = False
    string_char = None
    i = idx
    func_end = -1
    
    while i < len(data):
        c = data[i]
        if not in_string:
            if c == ord('"') or c == ord("'") or c == ord('`'):
                in_string = True
                string_char = c
            elif c == ord('{'):
                brace_count += 1
            elif c == ord('}'):
                brace_count -= 1
                if brace_count == 0:
                    func_end = i + 1
                    break
        else:
            if c == string_char and (i == 0 or data[i-1] != ord('\\')):
                in_string = False
                string_char = None
        i += 1
    
    if func_end == -1:
        print("ERROR: Could not find function end")
        return False
    
    print(f"Function spans from {idx} to {func_end} (length {func_end - idx})")
    
    # New function body: return Promise.resolve({code:"SUCCESS",silent:!1});
    # We'll replace from after "function D9z(){" to the closing "}"
    # Keep the function declaration, replace the body
    new_body = b'var t_W=[arguments];return Promise.resolve({code:"SUCCESS",silent:!1});}'
    # The function declaration is "function D9z(){"
    decl_end = idx + len(b'function D9z(){')
    
    # Replace from decl_end to func_end with new_body
    data[decl_end:func_end] = new_body
    
    new_len = len(data)
    print(f"New size: {new_len} bytes (delta: {new_len - original_len})")
    
    with open(output_path, 'wb') as f:
        f.write(data)
    
    print(f"Written to {output_path}")
    return True

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 patch_d9z.py <main.js> [output.js]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file + '.patched'
    
    success = patch_d9z(input_file, output_file)
    sys.exit(0 if success else 1)