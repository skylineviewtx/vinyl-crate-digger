#!/usr/bin/env python3
# fetch_artwork.py
# Bulk fetch missing album artwork from Discogs for all records in your library.
#
# Usage:
#   python fetch_artwork.py
#
# Requirements:
#   - Discogs personal access token set in the app (Settings -> Connections -> Discogs)
#   - OR pass your token directly: python fetch_artwork.py --token YOUR_TOKEN_HERE
#
# Options:
#   --token TOKEN     Discogs personal access token (if not set in DB)
#   --overwrite       Replace existing images too (default: only fills missing)
#   --dry-run         Show what would be updated without making changes
#   --limit N         Only process N records (useful for testing)

import sqlite3
import json
import os
import sys
import time
import base64
import urllib.request
import urllib.parse
import urllib.error

DB_PATH = os.path.join(os.environ.get("APPDATA", ""), "vinyl-library", "vinyl.db")
DISCOGS_SEARCH_URL = "https://api.discogs.com/database/search"
DISCOGS_AGENT = "VinylLibrary/1.0 +https://github.com/vinyl-library"

def get_setting(conn, key):
    row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return row[0] if row else None

def fetch_json(url, token):
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Discogs token={token}")
    req.add_header("User-Agent", DISCOGS_AGENT)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())

def fetch_image_b64(url, token):
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Discogs token={token}")
    req.add_header("User-Agent", DISCOGS_AGENT)
    with urllib.request.urlopen(req, timeout=20) as r:
        data = r.read()
    content_type = "image/jpeg"
    ext = url.split(".")[-1].lower().split("?")[0]
    if ext == "png": content_type = "image/png"
    elif ext == "gif": content_type = "image/gif"
    elif ext == "webp": content_type = "image/webp"
    return f"data:{content_type};base64,{base64.b64encode(data).decode()}"

def search_discogs(artist, title, token):
    query = f"{artist} {title}".strip()
    url = f"{DISCOGS_SEARCH_URL}?q={urllib.parse.quote(query)}&type=release&per_page=5"
    try:
        data = fetch_json(url, token)
        return data.get("results", [])
    except Exception as e:
        print(f"    Search error: {e}")
        return []

def get_release_images(resource_url, token):
    try:
        data = fetch_json(resource_url, token)
        images = data.get("images", [])
        return [img["uri"] for img in images if img.get("uri") and img.get("type") == "primary"][:1] + \
               [img["uri"] for img in images if img.get("uri") and img.get("type") != "primary"][:3]
    except Exception as e:
        print(f"    Release fetch error: {e}")
        return []

def main():
    # Parse args
    token_arg = None
    overwrite = False
    dry_run = False
    limit = None

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--token" and i+1 < len(args):
            token_arg = args[i+1]; i += 2
        elif args[i] == "--overwrite":
            overwrite = True; i += 1
        elif args[i] == "--dry-run":
            dry_run = True; i += 1
        elif args[i] == "--limit" and i+1 < len(args):
            limit = int(args[i+1]); i += 2
        else:
            i += 1

    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}")
        print("Make sure Vinyl Library has been run at least once.")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Get token
    token = token_arg or get_setting(conn, "discogs_token")
    if not token:
        print("ERROR: No Discogs token found.")
        print("Either set it in Settings -> Connections -> Discogs, or pass --token YOUR_TOKEN")
        conn.close()
        return

    # Decrypt token if needed (stored encrypted in newer versions)
    # If it looks like base64 cipher text, warn the user
    if len(token) > 100 and not token.startswith("data:"):
        print("NOTE: Token may be encrypted. If lookups fail, try passing --token directly.")

    # Get all records
    all_records = conn.execute("SELECT id, artist, title, images FROM records ORDER BY artist").fetchall()

    # Filter to those missing images (unless --overwrite)
    if overwrite:
        to_process = list(all_records)
        print(f"Mode: overwrite — processing all {len(to_process)} records")
    else:
        to_process = []
        for r in all_records:
            try:
                imgs = json.loads(r["images"] or "[]")
                has_image = any(img for img in imgs if img)
            except:
                has_image = False
            if not has_image:
                to_process.append(r)
        print(f"Mode: fill missing — {len(to_process)} of {len(all_records)} records need artwork")

    if limit:
        to_process = to_process[:limit]
        print(f"Limit: processing first {limit} records only")

    if dry_run:
        print("\nDRY RUN — no changes will be made\n")
        for r in to_process:
            print(f"  Would fetch: {r['artist']} - {r['title']}")
        conn.close()
        return

    print()
    updated = 0
    skipped = 0
    failed  = 0

    for idx, rec in enumerate(to_process):
        artist = rec["artist"] or ""
        title  = rec["title"] or ""
        print(f"[{idx+1}/{len(to_process)}] {artist} - {title}")

        # Search Discogs
        results = search_discogs(artist, title, token)
        if not results:
            print(f"    No results found — skipping")
            failed += 1
            time.sleep(1)
            continue

        # Use first result
        result = results[0]
        resource_url = result.get("resource_url")
        if not resource_url:
            print(f"    No resource URL — skipping")
            failed += 1
            time.sleep(1)
            continue

        print(f"    Found: {result.get('title', '?')} ({result.get('year', '?')})")

        # Rate limit
        time.sleep(1.1)

        # Get full release images
        image_urls = get_release_images(resource_url, token)
        if not image_urls:
            # Fall back to thumb
            thumb = result.get("thumb") or result.get("cover_image")
            if thumb:
                image_urls = [thumb]

        if not image_urls:
            print(f"    No images available — skipping")
            failed += 1
            time.sleep(1)
            continue

        # Fetch images as base64
        images = [None, None, None, None]
        for i, url in enumerate(image_urls[:4]):
            try:
                images[i] = fetch_image_b64(url, token)
                print(f"    Image {i+1} fetched ✓")
                time.sleep(0.5)
            except Exception as e:
                print(f"    Image {i+1} failed: {e}")

        if not any(images):
            print(f"    All image fetches failed — skipping")
            failed += 1
            continue

        # If not overwriting, merge with existing images
        if not overwrite:
            try:
                existing = json.loads(rec["images"] or "[]")
                # Fill empty slots only
                for i in range(4):
                    if i < len(existing) and existing[i]:
                        images[i] = existing[i]
                    elif i < len(existing) and not existing[i] and i < len(images) and images[i]:
                        pass  # keep new image
            except:
                pass

        conn.execute("UPDATE records SET images=? WHERE id=?", (json.dumps(images), rec["id"]))
        conn.commit()
        updated += 1
        print(f"    Saved ✓")
        time.sleep(1)

    conn.close()
    print()
    print(f"Done — {updated} updated, {skipped} skipped, {failed} failed/no results")
    print()
    if failed > 0:
        print(f"Tip: Records with no results may have unusual artist names or titles.")
        print(f"     Try editing the record to clean up the artist/title, then run again.")

if __name__ == "__main__":
    main()
