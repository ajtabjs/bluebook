#!/usr/bin/env python3
"""Add all missing SVG files to service worker STATIC_ASSETS array."""

import os
import re

# Get all SVG files in root
svg_files = sorted([f for f in os.listdir('.') if f.endswith('.svg')])

# Read service worker
with open('service-worker.js', 'r') as f:
    sw_content = f.read()

# Get existing SVG entries (both with and without ./ prefix)
sw_svgs = set(re.findall(r'\'(\./[^\']+\.svg)\'', sw_content))

# Find missing
missing = []
for svg in sorted([f for f in os.listdir('.') if f.endswith('.svg')]):
    if f'./{svg}' not in sw_svgs:
        missing.append(svg)

print(f'Missing SVG count: {len(missing)}')

# Find the insertion point in the service worker
# We want to add after the "// Newly fetched SVG assets (2026-10-21 continued)" section
# and before "// Font file"

insert_marker = "// Font file"
insert_lines = []

# Group by sections for readability
# First, the newly fetched SVG assets section
insert_lines.append("  // Additional SVG assets (2026-10-21)")
for svg in sorted([f for f in os.listdir('.') if f.endswith('.svg')]):
    if f'./{svg}' not in open('service-worker.js').read():
        pass

# Actually, let's just append all missing SVGs after the existing SVG section
# Find the "// Font file" comment and insert before it

with open('service-worker.js', 'r') as f:
    lines = f.readlines()

# Find the "// Font file" line
font_file_idx = -1
for i, line in enumerate(lines):
    if "// Font file" in line:
        font_file_idx = i
        break

if font_file_idx == -1:
    print("Could not find // Font file marker")
    exit(1)

# Get all missing SVGs
svg_files = sorted([f for f in os.listdir('.') if f.endswith('.svg')])
sw_svgs = set(re.findall(r'\'(\./[^\']+\.svg)\'', open('service-worker.js').read()))

missing = []
for svg in sorted([f for f in os.listdir('.') if f.endswith('.svg')]):
    if f'./{svg}' not in open('service-worker.js').read():
        missing.append(svg)

print(f"Adding {len(missing)} missing SVG files...")

# Build new lines to insert
new_lines = []
for svg in missing:
    new_lines.append(f"  './{svg}',\n")

# Insert before "// Font file"
new_content = ''.join(lines[:font_file_idx] + new_lines + lines[font_file_idx:])

with open('service-worker.js', 'w') as f:
    f.write(new_content)

print(f"Added {len(missing)} SVG files to service worker")