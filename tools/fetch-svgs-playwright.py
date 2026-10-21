#!/usr/bin/env python3
"""
Fetch SVG assets using Playwright headless browser.
This can handle JavaScript-rendered content and dynamic asset loading.
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

SVG_ASSETS = [
    '1e8ffee1ac6ff755.svg',
    '3ebda4955e48bdfa.svg',
    '45f9e80d892a8583.svg',
    '7616ebc5551f295d.svg',
    '7c5454f13e7d157c.svg',
    '802e74d124150325.svg',
    '89da239509290a5b.svg',
    'a059f9a86ee9f66a.svg',
    'c3ee5d4d5a1f2c34.svg',
    'cba6998ee1bf9b2a.svg',
    'd65cbe15e1e0a517.svg',
    'f8e6109dd28f690d.svg',
]

PRODUCTION_DOMAINS = [
    'https://bluebook.app.collegeboard.org',
    'https://bluebook-chromebook.app.collegeboard.org',
]

OUTPUT_DIR = Path('fetched-svgs')

async def fetch_svg(page, url, asset_name):
    """Fetch SVG by navigating to its URL and capturing the response."""
    try:
        # Set up request interception to capture SVG responses
        response = await page.goto(url, wait_until='networkidle', timeout=30000)
        
        if response and response.status == 200:
            content_type = response.headers.get('content-type', '')
            if 'svg' in content_type or 'xml' in content_type:
                body = await response.body()
                if body and (body.strip().startswith(b'<svg') or body.strip().startswith(b'<?xml')):
                    output_path = OUTPUT_DIR / asset_name
                    OUTPUT_DIR.mkdir(exist_ok=True)
                    with open(output_path, 'wb') as f:
                        f.write(body)
                    print(f"✓ {url} -> {output_path} ({len(body)} bytes)")
                    return True
        
        # If direct navigation didn't work, try to fetch via page.evaluate
        print(f"? {url} -> status={response.status if response else 'no response'}")
        return False
        
    except Exception as e:
        print(f"✗ {url} -> ERROR: {e}")
        return False

async def fetch_svg_direct(page, url, asset_name):
    """Fetch SVG using page.evaluate to make fetch request with proper headers."""
    try:
        js_code = f"""
        async () => {{
            try {{
                const response = await fetch('{url}', {{
                    method: 'GET',
                    credentials: 'include',
                    headers: {{
                        'Accept': 'image/svg+xml,image/*,*/*;q=0.8',
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
            # Convert array of bytes back to bytes
            body = bytes(result)
            if body.strip().startswith(b'<svg') or body.strip().startswith(b'<?xml'):
                output_path = OUTPUT_DIR / asset_name
                OUTPUT_DIR.mkdir(exist_ok=True)
                with open(output_path, 'wb') as f:
                    f.write(body)
                print(f"✓ {url} -> {output_path} ({len(body)} bytes)")
                return True
            else:
                print(f"? {url} -> got {len(body)} bytes but not SVG")
                return False
        elif isinstance(result, dict) and 'error' in result:
            print(f"? {url} -> {result}")
            return False
        else:
            print(f"? {url} -> unexpected result")
            return False
            
    except Exception as e:
        print(f"✗ {url} -> ERROR: {e}")
        return False

async def main():
    cookies_str = os.environ.get('COOKIES', '')
    if not cookies_str:
        print("ERROR: COOKIES env var required")
        sys.exit(1)
    
    # Parse cookies for Playwright
    cookies = []
    for cookie in cookies_str.split('; '):
        if '=' in cookie:
            name, value = cookie.split('=', 1)
            cookies.append({
                'name': name.strip(),
                'value': value.strip(),
                'domain': '.collegeboard.org',
                'path': '/',
            })
    
    print(f"Loaded {len(SVG_ASSETS)} SVG assets")
    print(f"Testing {len(PRODUCTION_DOMAINS)} domains")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        )
        await context.add_cookies(cookies)
        page = await context.new_page()
        
        # First, visit the main page to establish session
        print("Establishing session on main domain...")
        await page.goto('https://bluebook-chromebook.app.collegeboard.org/', wait_until='networkidle')
        await page.wait_for_timeout(2000)
        
        success_count = 0
        
        for asset in SVG_ASSETS:
            fetched = False
            for domain in PRODUCTION_DOMAINS:
                url = f"{domain}/{asset}"
                print(f"\nTrying: {url}")
                
                # Try direct fetch via page.evaluate
                if await fetch_svg_direct(page, url, asset):
                    success_count += 1
                    fetched = True
                    break
                
                await page.wait_for_timeout(500)
            
            if not fetched:
                print(f"✗ {asset} -> FAILED on all domains")
        
        await browser.close()
    
    print(f"\nDone: {success_count}/{len(SVG_ASSETS)} SVGs fetched successfully")

if __name__ == '__main__':
    asyncio.run(main())