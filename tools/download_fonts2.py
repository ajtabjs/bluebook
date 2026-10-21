#!/usr/bin/env python3
"""
Download missing Noto Serif font variants from Google Fonts.
Using the main WOFF2 files for each variant (latin subset).
"""

import asyncio
import os
from pathlib import Path

import aiohttp

FONT_DIR = Path(__file__).parent.parent / "fonts"

# Main WOFF2 URLs for each variant (latin subset from Google Fonts)
# These are the base files without unicode-range splitting
FONT_URLS = {
    # Noto Serif (main latin)
    "NotoSerif-Regular.woff2": "https://fonts.gstatic.com/s/notoserif/v33/ga6iaw1J5X9T9RW6j9bNVls-hfgvz8JcMofYTa32J4wsL2JAlAhZqFCjwA.woff2",
    "NotoSerif-Italic.woff2": "https://fonts.gstatic.com/s/notoserif/v33/ga6saw1J5X9T9RW6j9bNfFIMZhhWnFTyNZIQD1-_FXP0RgnaOg9MYBNLg8cP.woff2",
    "NotoSerif-Bold.woff2": "https://fonts.gstatic.com/s/notoserif/v33/ga6iaw1J5X9T9RW6j9bNVls-hfgvz8JcMofYTa32J4wsL2JAlAhZT1ejwA.woff2",
    "NotoSerif-BoldItalic.woff2": "https://fonts.gstatic.com/s/notoserif/v33/ga6saw1J5X9T9RW6j9bNfFIMZhhWnFTyNZIQD1-_FXP0RgnaOg9MYBOshMcP.woff2",
    # Noto Serif SC (Simplified Chinese)
    "NotoSerifSC-Medium.woff2": "https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.woff2",
    "NotoSerifSC-Bold.woff2": "https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.woff2",
    # Noto Serif JP (Japanese)
    "NotoSerifJP-Medium.woff2": "https://fonts.gstatic.com/s/notoserifjp/v34/xn71YHs72GKoTvER4Gn3b5eMRtWGkp6o7MjQ2bwDOubA.woff2",
    "NotoSerifJP-Bold.woff2": "https://fonts.gstatic.com/s/notoserifjp/v34/xn71YHs72GKoTvER4Gn3b5eMRtWGkp6o7MjQ2bzWPebA.woff2",
}

async def download_font(session, url, dest_path):
    """Download a single font file."""
    try:
        async with session.get(url) as resp:
            if resp.status == 200:
                content = await resp.read()
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                dest_path.write_bytes(content)
                print(f"  ✓ {dest_path.name} ({len(content)} bytes)")
                return True
            else:
                print(f"  ✗ {dest_path.name} - HTTP {resp.status}")
                return False
    except Exception as e:
        print(f"  ✗ {dest_path.name} - {e}")
        return False

async def main():
    print(f"Downloading fonts to {FONT_DIR}")
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        for name, url in FONT_URLS.items():
            dest = FONT_DIR / name
            if dest.exists():
                print(f"  Already exists: {name}")
                continue
            tasks.append(download_font(session, url, dest))
        
        if tasks:
            results = await asyncio.gather(*tasks)
            success = sum(results)
            print(f"\nDownloaded: {success}/{len(tasks)} fonts")
        else:
            print("All fonts already present")

if __name__ == "__main__":
    asyncio.run(main())