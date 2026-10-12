# script used for crawling pages
# use the network tab in chrome devtools, clear it before loading the game,
# and when all assets have finished being requested, press the Export HAR button.
# then use: python3 dehar.py example.com.har outputdirectory/

import os, sys, subprocess

banned = []  # e.g. [".php", ".asp"]

infile = sys.argv[1]
outdir = sys.argv[2]

with open(infile, "r", encoding="utf-8") as f:
    input_lines = f.read().splitlines()

lis2 = []
for x in input_lines:
    if ('"url"' in x) and not any(i in x for i in banned):
        lis2.append(x.split('"')[3].split("?")[0])

lis2 = list(dict.fromkeys(lis2))

tmpfile = "./wgettemp.txt"
with open(tmpfile, "w", encoding="utf-8") as f:
    f.write("\n".join(lis2))

# Browser-like headers copied from the working curl invocation.
# These are what stop the CDN from returning 403 Forbidden.
UA = ("Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) "
      "AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/145.0.0.0 Safari/537.36")

headers = [
    "--user-agent=" + UA,
    '--header=accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    "--header=accept-language: en-US,en;q=0.9",
    "--header=cache-control: no-cache",
    "--header=pragma: no-cache",
    "--header=priority: u=0, i",
    '--header=sec-ch-ua: "Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
    "--header=sec-ch-ua-mobile: ?0",
    '--header=sec-ch-ua-platform: "Chrome OS"',
    "--header=sec-fetch-dest: document",
    "--header=sec-fetch-mode: navigate",
    "--header=sec-fetch-site: none",
    "--header=sec-fetch-user: ?1",
    "--header=upgrade-insecure-requests: 1",
]

cmd = [
    "wget",
    "-x",                       # preserve directory structure
    "-i", tmpfile,              # read URLs from file
    "-P", outdir,               # output dir
    "-e", "robots=off",         # ignore robots.txt
    "--no-check-certificate",   # don't die on cert quirks
    "--content-disposition",    # respect server filename hints
    "--tries=3",
    "--timeout=30",
    "--waitretry=2",
] + headers

subprocess.call(cmd)
os.remove(tmpfile)