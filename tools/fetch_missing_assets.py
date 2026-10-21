#!/usr/bin/env python3
"""
Fetch missing assets (SVGs, fonts, manifest, fingerprint) from the live Bluebook deployment
using Playwright with proper authentication.
"""

import asyncio
import os
import sys
from pathlib import Path

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("Installing playwright...")
    import subprocess
    subprocess.run([sys.executable, '-m', 'pip', 'install', 'playwright'], check=True)
    subprocess.run([sys.executable, '-m', 'playwright', 'install', 'chromium'], check=True)
    from playwright.async_api import async_playwright

# Missing assets from console 404 errors
MISSING_ASSETS = {
    # SVG assets (hash-named, 404 on bluebook-sat.pages.dev)
    'svgs': [
        'a0d40d72a8bcba76.svg',
        '8a4450f3b685463e.svg',
        '3eea8de073cdcbd6.svg',
        '48c7e4c83d3f8b2c.svg',
        '05d5c42178aaf3ac.svg',
        '847466d490661012.svg',
        '33efc01aa2e520f7.svg',
        'a05cd026f95aec3f.svg',
    ],
    # Font
    'fonts': [
        'NotoSerif-Italic.woff2',
    ],
    # Manifest
    'manifest': [
        'manifest.webmanifest',
    ],
    # Fingerprint (likely generated at runtime, but try fetching)
    'fingerprint': [
        'fp_ee4aba30-a967-43c8-ab10-bfca6081c887',
    ],
}

# Production domains to try (in order of preference)
PRODUCTION_DOMAINS = [
    'https://bluebook-chromebook.app.collegeboard.org',
    'https://bluebook.app.collegeboard.org',
    'https://bluebook-sat.pages.dev',
]

OUTPUT_DIR = Path(__file__).parent.parent  # /workspaces/bluebook

async def fetch_asset(page, url, asset_name, asset_type):
    """Fetch an asset using page.evaluate to make fetch request with proper headers."""
    try:
        # Determine expected content type
        content_type_map = {
            'svgs': 'image/svg+xml',
            'fonts': 'font/woff2',
            'manifest': 'application/manifest+json',
            'fingerprint': 'application/octet-stream',
        }
        expected_type = content_type_map.get(asset_type, '*/*')
        
        js_code = f"""
        async () => {{
            try {{
                const response = await fetch('{url}', {{
                    method: 'GET',
                    credentials: 'include',
                    headers: {{
                        'Accept': '{expected_type},*/*;q=0.8',
                    }}
                }});
                if (response.ok) {{
                    const blob = await response.blob();
                    const arrayBuffer = await blob.arrayBuffer();
                    return Array.from(new Uint8Array(arrayBuffer));
                }} else {{
                    return {{error: response.status, statusText: response.statusText}};
                }}
            }} catch (e) {{
                return {{error: e.message}};
            }}
        }}
        """
        result = await page.evaluate(js_code)
        
        if isinstance(result, list) and len(result) > 0:
            body = bytes(result)
            
            # Validate content based on type
            is_valid = False
            if asset_type == 'svgs':
                is_valid = body.strip().startswith(b'<svg') or body.strip().startswith(b'<?xml')
            elif asset_type == 'fonts':
                is_valid = body[:4] == b'wOFF' or body[:4] == b'wOF2' or len(body) > 1000  # WOFF2 magic or reasonable size
            elif asset_type == 'manifest':
                try:
                    import json
                    json.loads(body.decode('utf-8'))
                    is_valid = True
                except:
                    is_valid = False
            elif asset_type == 'fingerprint':
                is_valid = len(body) > 0
            
            if is_valid:
                # Determine output path
                if asset_type == 'fonts':
                    output_path = OUTPUT_DIR / 'fonts' / asset_name
                else:
                    output_path = OUTPUT_DIR / asset_name
                
                output_path.parent.mkdir(parents=True, exist_ok=True)
                with open(output_path, 'wb') as f:
                    f.write(body)
                print(f"  ✓ {url} -> {output_path.relative_to(OUTPUT_DIR)} ({len(body)} bytes)")
                return True
            else:
                print(f"  ? {url} -> got {len(body)} bytes but invalid content for {asset_type}")
                return False
                
        elif isinstance(result, dict) and 'error' in result:
            return False
        else:
            return False
            
    except Exception as e:
        return False

async def fetch_asset_navigation(page, url, asset_name, asset_type):
    """Alternative: try direct navigation to fetch asset."""
    try:
        response = await page.goto(url, wait_until='networkidle', timeout=30000)
        
        if response and response.status == 200:
            content_type = response.headers.get('content-type', '')
            body = await response.body()
            
            if body and len(body) > 0:
                output_path = OUTPUT_DIR / asset_name
                if asset_type == 'fonts':
                    output_path = OUTPUT_DIR / 'fonts' / asset_name
                output_path.parent.mkdir(parents=True, exist_ok=True)
                with open(output_path, 'wb') as f:
                    f.write(body)
                print(f"  ✓ {url} -> {output_path.relative_to(OUTPUT_DIR)} ({len(body)} bytes)")
                return True
        
        return False
    except Exception as e:
        return False

async def main():
    cookies_str = os.environ.get('COOKIES', '')
    
    # Parse cookies for Playwright
    cookies = []
    if cookies_str:
        for cookie in cookies_str.split('; '):
            if '=' in cookie:
                name, value = cookie.split('=', 1)
                cookies.append({
                    'name': name.strip(),
                    'value': value.strip(),
                    'domain': '.collegeboard.org',
                    'path': '/',
                })
    else:
        print("No COOKIES provided - trying without authentication (public assets only)")
    
    # Flatten all assets
    all_assets = []
    for asset_type, assets in MISSING_ASSETS.items():
        for asset in assets:
            all_assets.append((asset_type, asset))
    
    print(f"Total assets to fetch: {len(all_assets)}")
    for atype, a in all_assets:
        print(f"  [{atype}] {a}")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        )
        await context.add_cookies(cookies)
        page = await context.new_page()
        
        # First, visit the main page to establish session
        print("\nEstablishing session on main domain...")
        try:
            await page.goto('https://bluebook-chromebook.app.collegeboard.org/', wait_until='networkidle', timeout=60000)
            await page.wait_for_timeout(3000)
            print("Session established")
        except Exception as e:
            print(f"Warning: Could not establish session: {e}")
        
        success_count = 0
        
        for asset_type, asset in all_assets:
            fetched = False
            print(f"\n[{asset_type}] Fetching: {asset}")
            
            for domain in PRODUCTION_DOMAINS:
                url = f"{domain}/{asset}"
                
                # Try fetch via page.evaluate first
                if await fetch_asset(page, url, asset, asset_type):
                    success_count += 1
                    fetched = True
                    break
                
                # Try direct navigation as fallback
                if await fetch_asset_navigation(page, url, asset, asset_type):
                    success_count += 1
                    fetched = True
                    break
                
                await page.wait_for_timeout(300)
            
            if not fetched:
                print(f"  ✗ {asset} -> FAILED on all domains")
        
        await browser.close()
    
    print(f"\nDone: {success_count}/{len(all_assets)} assets fetched successfully")
    
    # List downloaded files
    print("\nDownloaded files:")
    for asset_type in ['svgs', 'fonts', 'manifest', 'fingerprint']:
        for asset in MISSING_ASSETS[asset_type]:
            if asset_type == 'fonts':
                path = OUTPUT_DIR / 'fonts' / asset
            else:
                path = OUTPUT_DIR / asset
            if path.exists():
                print(f"  {path.relative_to(OUTPUT_DIR)} ({path.stat().st_size} bytes)")

if __name__ == '__main__':
    asyncio.run(main())