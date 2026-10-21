#!/usr/bin/env python3
"""
Download missing assets from the live Bluebook deployment (bluebook-sat.pages.dev)
and save them to the local repo with correct relative paths.
"""

import asyncio
import os
import sys
from pathlib import Path
from urllib.parse import urljoin

import aiohttp

# Assets that are 404ing on bluebook-sat.pages.dev (from console logs)
MISSING_ASSETS = [
    # Favicon/png
    "bluebook-16x16.1121fe81.png",
    "bluebook-32x32.cb8ed68a.png",
    
    # SVG assets (hash-named)
    "a0d40d72a8bcba76.svg",
    "8a4450f3b685463e.svg",
    "3eea8de073cdcbd6.svg",
    "48c7e4c83d3f8b2c.svg",
    "05d5c42178aaf3ac.svg",
    "847466d490661012.svg",
    "33efc01aa2e520f7.svg",
    "a05cd026f95aec3f.svg",
    
    # Font
    "NotoSerif-Italic.woff2",
    
    # Manifest
    "manifest.webmanifest",
    
    # Fingerprint file (likely generated at runtime)
    "fp_ee4aba30-a967-43c8-ab10-bfca6081c887",
]

# Base URLs to try
BASE_URLS = [
    "https://bluebook-chromebook.app.collegeboard.org/"
]

OUTPUT_DIR = Path(__file__).parent.parent  # /workspaces/bluebook

async def download_asset(session, url, dest_path):
    """Download a single asset."""
    try:
        async with session.get(url) as resp:
            if resp.status == 200:
                content = await resp.read()
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                dest_path.write_bytes(content)
                print(f"  ✓ {url} -> {dest_path.relative_to(OUTPUT_DIR)} ({len(content)} bytes)")
                return True
            else:
                print(f"  ✗ {url} - HTTP {resp.status}")
                return False
    except Exception as e:
        print(f"  ✗ {url} - {e}")
        return False

async def try_download_asset(session, asset_name):
    """Try downloading an asset from multiple base URLs."""
    for base_url in BASE_URLS:
        url = urljoin(base_url, asset_name)
        dest_path = OUTPUT_DIR / asset_name
        if await download_asset(session, url, dest_path):
            return True
    return False

async def main():
    print(f"Downloading missing assets to {OUTPUT_DIR}")
    print(f"Assets to fetch: {len(MISSING_ASSETS)}")
    
    async with aiohttp.ClientSession() as session:
        tasks = [try_download_asset(session, asset) for asset in MISSING_ASSETS]
        results = await asyncio.gather(*tasks)
    
    success = sum(results)
    print(f"\nDownloaded: {success}/{len(MISSING_ASSETS)} assets")
    
    # Also check for any other assets referenced in index.html or service-worker.js
    print("\nChecking for additional referenced assets...")
    
    # Check index.html for referenced assets
    index_path = OUTPUT_DIR / "index.html"
    if index_path.exists():
        content = index_path.read_text()
        import re
        # Find all href/src references
        refs = re.findall(r'(?:href|src)=["\']?([^"\'\s>]+)', content)
        for ref in refs:
            if ref.startswith("./") or ref.startswith("/"):
                asset_name = ref.lstrip("./")
                dest_path = OUTPUT_DIR / asset_name
                if not dest_path.exists() and asset_name not in MISSING_ASSETS:
                    print(f"  Referenced but missing: {asset_name}")

if __name__ == "__main__":
    asyncio.run(main())