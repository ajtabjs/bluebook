#!/usr/bin/env python3
"""
Fetch blocked assets using provided cookies, trying multiple domains.
Usage: COOKIES='cookie1=value1; cookie2=value2' python3 fetch-assets.py
Or: python3 fetch-assets.py --cookies-file cookies.txt
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

try:
    import aiohttp
except ImportError:
    print("Installing aiohttp...")
    import subprocess
    subprocess.run([sys.executable, '-m', 'pip', 'install', 'aiohttp'], check=True)
    import aiohttp

ASSETS_FILE = Path('assets-needing-cookies.txt')
OUTPUT_DIR = Path('fetched-assets')

# Production domains to try for each asset
PRODUCTION_DOMAINS = [
    'https://bluebook.app.collegeboard.org',
    'https://assets.app.collegeboard.org',
    'https://bluebook.collegeboard.org',
]

def load_urls():
    with open(ASSETS_FILE) as f:
        return [line.strip() for line in f if line.strip()]

def load_cookies():
    # Try environment variable first
    cookies_str = os.environ.get('COOKIES', '')
    if cookies_str:
        return cookies_str
    
    # Try cookies file
    cookies_file = Path('cookies.txt')
    if cookies_file.exists():
        with open(cookies_file) as f:
            return f.read().strip()
    
    # Try JSON format
    cookies_json = Path('cookies.json')
    if cookies_json.exists():
        with open(cookies_json) as f:
            data = json.load(f)
            if isinstance(data, list):
                return '; '.join(f"{c['name']}={c['value']}" for c in data)
            elif isinstance(data, dict):
                return '; '.join(f"{k}={v}" for k, v in data.items())
    
    return ''

def generate_urls_for_asset(asset_url):
    """Generate all URL variants to try for a given asset."""
    parsed = urlparse(asset_url)
    filename = Path(parsed.path).name
    
    urls = [asset_url]  # Original URL first
    
    # Try production domains
    for domain in PRODUCTION_DOMAINS:
        urls.append(f"{domain}/{filename}")
    
    return urls

async def fetch_asset(session, url, cookies, semaphore):
    async with semaphore:
        try:
            # Use the Chromebook app origin for all requests
            fixed_origin = 'https://bluebook-chromebook.app.collegeboard.org'
            headers = {
                'Cookie': cookies,
                'Origin': fixed_origin,
                'Referer': fixed_origin + '/',
                'User-Agent': 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
            } if cookies else {
                'Origin': fixed_origin,
                'Referer': fixed_origin + '/',
                'User-Agent': 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
            }
            async with session.get(url, headers=headers) as resp:
                content = await resp.read()
                mime = resp.headers.get('Content-Type', 'unknown')
                
                # Parse filename from URL
                parsed = urlparse(url)
                filename = Path(parsed.path).name
                if not filename or filename == '/':
                    filename = 'index.html'
                
                # Sanitize filename
                filename = filename.replace('%', '_').replace('?', '_')
                
                output_path = OUTPUT_DIR / filename
                OUTPUT_DIR.mkdir(exist_ok=True)
                
                if resp.status == 200 and not mime.startswith('text/html'):
                    with open(output_path, 'wb') as f:
                        f.write(content)
                    print(f"✓ {url} -> {output_path} ({len(content)} bytes, {mime})")
                    return True
                else:
                    # Check if it's an error page
                    text = content[:500].decode('utf-8', errors='ignore')
                    if 'ERROR' in text.upper() or 'blocked' in text.lower() or 'cloudfront' in text.lower():
                        print(f"✗ {url} -> BLOCKED ({resp.status}, {mime})")
                    else:
                        print(f"? {url} -> {resp.status} {mime} ({len(content)} bytes)")
                    return False
        except Exception as e:
            print(f"✗ {url} -> ERROR: {e}")
            return False

async def main():
    original_urls = load_urls()
    cookies = load_cookies()
    
    if not cookies:
        print("ERROR: No cookies provided!")
        print("Set COOKIES env var, or create cookies.txt/cookies.json")
        sys.exit(1)
    
    # Expand URLs with production domain variants
    all_urls = []
    for url in original_urls:
        all_urls.extend(generate_urls_for_asset(url))
    
    print(f"Loaded {len(original_urls)} base URLs, expanded to {len(all_urls)} total")
    print(f"Cookie length: {len(cookies)} chars")
    print(f"Output dir: {OUTPUT_DIR}")
    print(f"Production domains: {', '.join(PRODUCTION_DOMAINS)}")
    
    connector = aiohttp.TCPConnector(limit=5)
    timeout = aiohttp.ClientTimeout(total=30)
    semaphore = asyncio.Semaphore(3)
    
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        tasks = [fetch_asset(session, url, cookies, semaphore) for url in all_urls]
        results = await asyncio.gather(*tasks)
    
    success = sum(results)
    print(f"\nDone: {success}/{len(all_urls)} requests succeeded")

if __name__ == '__main__':
    asyncio.run(main())