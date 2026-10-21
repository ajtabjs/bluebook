#!/usr/bin/env python3
"""
Download missing Noto Serif font variants from Google Fonts.
"""

import asyncio
import os
from pathlib import Path
from urllib.parse import urljoin

import aiohttp

FONT_DIR = Path(__file__).parent.parent / "fonts"

# Noto Serif variants needed (from NotoSerif.css)
FONT_VARIANTS = {
    "NotoSerif-Regular.woff2": "https://fonts.gstatic.com/s/notoserif/v30/ga6Law1J5X9T9RW6j9bNd8DKhVeT0qj9avKzrjI.woff2",
    "NotoSerif-Italic.woff2": "https://fonts.gstatic.com/s/notoserif/v30/ga6Iaw1J5X9T9RW6j9bNf8fN5qU.woff2",
    "NotoSerif-Bold.woff2": "https://fonts.gstatic.com/s/notoserif/v30/ga6Iaw1J5X9T9RW6j9bNf8fN5qU.woff2",  # same URL pattern
    "NotoSerif-BoldItalic.woff2": "https://fonts.gstatic.com/s/notoserif/v30/ga6Iaw1J5X9T9RW6j9bNf8fN5qU.woff2",
    "NotoSerifSC-Medium.woff2": "https://fonts.gstatic.com/s/notoserifsc/v18/OZpEi_spyRlnzG3eRVEZJWJ5HCM.woff2",
    "NotoSerifSC-Bold.woff2": "https://fonts.gstatic.com/s/notoserifsc/v18/OZpEi_spyRlnzG3eRVEZJWJ5HCM.woff2",
    "NotoSerifJP-Medium.woff2": "https://fonts.gstatic.com/s/notoserifjp/v25/OZpEi_spyRlnzG3eRVEZJWJ5HCM.woff2",
    "NotoSerifJP-Bold.woff2": "https://fonts.gstatic.com/s/notoserifjp/v25/OZpEi_spyRlnzG3eRVEZJWJ5HCM.woff2",
}

# More accurate URLs from Google Fonts API
GOOGLE_FONTS_API = "https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400;1,700&family=Noto+Serif+SC:wght@500;700&family=Noto+Serif+JP:wght@500;700&display=swap"

async def fetch_google_fonts_css(session):
    """Fetch the CSS from Google Fonts to get actual font URLs."""
    async with session.get(GOOGLE_FONTS_API) as resp:
        if resp.status == 200:
            return await resp.text()
        return ""

async def download_font(session, url, dest_path):
    """Download a single font file."""
    try:
        async with session.get(url) as resp:
            if resp.status == 200:
                content = await resp.read()
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                dest_path.write_bytes(content)
                print(f"  ✓ {url} -> {dest_path.name} ({len(content)} bytes)")
                return True
            else:
                print(f"  ✗ {url} - HTTP {resp.status}")
                return False
    except Exception as e:
        print(f"  ✗ {url} - {e}")
        return False

async def main():
    print(f"Downloading fonts to {FONT_DIR}")
    
    async with aiohttp.ClientSession() as session:
        # First, get the Google Fonts CSS to extract actual URLs
        css = await fetch_google_fonts_css(session)
        print("Google Fonts CSS fetched, extracting URLs...")
        
        # Extract URLs from CSS
        import re
        urls = re.findall(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', css)
        print(f"Found {len(urls)} font URLs")
        
        # Also try to download from known patterns
        tasks = []
        for name, url in FONT_VARIANTS.items():
            dest = FONT_DIR / name
            if dest.exists():
                print(f"  Already exists: {name}")
                continue
            tasks.append(download_font(session, url, dest))
        
        # Also download from extracted URLs
        for url in urls:
            filename = url.split("/")[-1].split("?")[0]
            if not filename.endswith(".woff2"):
                continue
            dest = FONT_DIR / filename
            if not dest.exists():
                tasks.append(download_font(session, url, dest))
        
        if tasks:
            results = await asyncio.gather(*tasks)
            success = sum(results)
            print(f"\nDownloaded: {success}/{len(tasks)} fonts")
        else:
            print("All fonts already present")

if __name__ == "__main__":
    asyncio.run(main())