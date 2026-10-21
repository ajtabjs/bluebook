#!/usr/bin/env python3
"""
Fetch ALL missing assets from vendor-public.js using Playwright.
"""

import asyncio
import os
import sys
from playwright.async_api import async_playwright

# Load SVG assets
with open('vendor-svgs.txt') as f:
    SVG_ASSETS = [line.strip() for line in f if line.strip()]

# Load font/image assets
with open('vendor-fonts-images.txt') as f:
    FONT_IMAGE_ASSETS = [line.strip() for line in f if line.strip()]

ALL_ASSETS = SVG_ASSETS + FONT_IMAGE_ASSETS

# Remove leading slash for local file saving
def local_name(asset):
    return asset.lstrip('/')

async def main():
    cookies_str = os.environ.get('COOKIES', '')
    if not cookies_str:
        print("ERROR: COOKIES env var required")
        sys.exit(1)
    
    # Parse cookies
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
    
    print(f"Total assets to fetch: {len(ALL_ASSETS)} ({len(SVG_ASSETS)} SVGs, {len(FONT_IMAGE_ASSETS)} fonts/images)")
    
    # Check what we already have
    missing = []
    for asset in ALL_ASSETS:
        local = local_name(asset)
        if not os.path.exists(local):
            missing.append(asset)
        else:
            # Verify it's not a 1424-byte error page
            size = os.path.getsize(local)
            if size == 1424:
                missing.append(asset)
                os.remove(local)
    
    print(f"Already have: {len(ALL_ASSETS) - len(missing)}, Need to fetch: {len(missing)}")
    
    if not missing:
        print("All assets already present!")
        return
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        )
        await context.add_cookies(cookies)
        page = await context.new_page()
        
        # Establish session on chromebook domain
        print("Establishing session...")
        await page.goto('https://bluebook-chromebook.app.collegeboard.org/', wait_until='networkidle')
        await page.wait_for_timeout(2000)
        
        success_count = 0
        failed = []
        
        for asset in missing:
            # Try chromebook domain first, then app domain
            for domain in ['https://bluebook-chromebook.app.collegeboard.org', 'https://bluebook.app.collegeboard.org']:
                url = f"{domain}/{asset}"
                print(f"Fetching {url}...")
                
                js_code = f'''
                async () => {{
                    try {{
                        const response = await fetch('{url}', {{
                            method: 'GET',
                            credentials: 'include',
                            headers: {{ 'Accept': '*/*' }}
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
                '''
                result = await page.evaluate(js_code)
                
                if isinstance(result, list) and len(result) > 0:
                    body = bytes(result)
                    is_html = body[:100].decode('utf-8', errors='ignore').strip().startswith('<!DOCTYPE') or body[:100].decode('utf-8', errors='ignore').strip().startswith('<html')
                    if not is_html and len(body) > 100:
                        local = local_name(asset)
                        d = os.path.dirname(local)
                        if d:
                            os.makedirs(d, exist_ok=True)
                        with open(local, 'wb') as f:
                            f.write(body)
                        print(f"  ✓ {asset} ({len(body)} bytes)")
                        success_count += 1
                        break
                    else:
                        print(f"  ✗ {asset} - error page ({len(body)} bytes)")
                else:
                    print(f"  ✗ {asset} - {result}")
                
                await page.wait_for_timeout(200)
            else:
                failed.append(asset)
        
        await browser.close()
    
    print(f"\nDone: {success_count}/{len(missing)} fetched successfully")
    if failed:
        print(f"Failed ({len(failed)}):")
        for f in failed:
            print(f"  {f}")

if __name__ == '__main__':
    import os
    asyncio.run(main())