#!/usr/bin/env python3
# import_csv.py
# One-time import of old Excel CSV data into vinyl library database
# Run from your project folder:
#   python import_csv.py
#
# Place your CSV files in the same folder as this script:
#   OldRecordLibraryDataAlbums.csv
#   OldRecordLibraryDataTracks.csv

import sqlite3
import csv
import os
import json
import re
from datetime import datetime

DB_PATH      = os.path.join(os.environ.get("APPDATA", ""), "vinyl-library", "vinyl.db")
ALBUMS_CSV   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "OldRecordLibraryDataAlbums.csv")
TRACKS_CSV   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "OldRecordLibraryDataTracks.csv")

# ── Grade mapping ─────────────────────────────────────────────────────────────
GRADE_MAP = {
    "mint (m)":                  "M",
    "near mint (nm/m-)":         "NM",
    "near mint (nm or m-)":      "NM",
    "very good plus (vg+)":      "VG+",
    "very good (vg)":            "VG",
    "good plus (g+)":            "G+",
    "good (g)":                  "G",
    "fair (f)":                  "F",
    "poor (p)":                  "P",
    "no jacket":                 "",
}

def map_grade(val):
    if not val:
        return ""
    return GRADE_MAP.get(val.strip().lower(), val.strip())

# ── Format mapping ────────────────────────────────────────────────────────────
def map_format(disc_size, num_discs):
    try:
        n = int(float(str(num_discs).strip())) if num_discs else 1
    except:
        n = 1
    size = str(disc_size or "").strip().replace('"', '').replace("'", "")
    if n == 2:   return "2xLP"
    if n == 3:   return "3xLP"
    if n >= 4:   return "Box Set"
    if "7" in size: return '7"'
    if "10" in size: return '10"'
    return "LP"

# ── Parse runtime ─────────────────────────────────────────────────────────────
def parse_runtime(rt):
    if not rt or not rt.strip():
        return "", ""
    rt = rt.strip()
    # formats: M:SS, MM:SS, M.SS
    m = re.match(r'^(\d+)[:\.](\d+)$', rt)
    if m:
        return m.group(1), m.group(2).zfill(2)
    # just seconds
    m = re.match(r'^(\d+)$', rt)
    if m:
        total = int(m.group(1))
        return str(total // 60), str(total % 60).zfill(2)
    return "", ""

# ── Parse date ────────────────────────────────────────────────────────────────
def parse_date(val):
    if not val or not val.strip():
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    # Try "Monday, 02/05/2024 @ 04:55:59 PM"
    m = re.search(r'(\d{2}/\d{2}/\d{4})\s*@\s*(\d{2}:\d{2}:\d{2}\s*[AP]M)', val)
    if m:
        try:
            dt = datetime.strptime(f"{m.group(1)} {m.group(2).strip()}", "%m/%d/%Y %I:%M:%S %p")
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except:
            pass
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# ── Load image as base64 ─────────────────────────────────────────────────────
def load_image(path):
    if not path or not path.strip():
        return None
    fixed = path.strip()
    # Fix drive letter if needed — CSV may have K:\ but files are on D:\
    if fixed.upper().startswith("K:"):
        fixed = "D:" + fixed[2:]
    if not os.path.exists(fixed):
        return None
    try:
        import base64
        ext = os.path.splitext(fixed)[1].lower()
        mime = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp"}.get(ext, "image/jpeg")
        with open(fixed, "rb") as f:
            data = base64.b64encode(f.read()).decode("utf-8")
        return f"data:{mime};base64,{data}"
    except Exception as e:
        return None

# ── Load tracks ───────────────────────────────────────────────────────────────
def load_tracks(tracks_csv):
    tracks_by_barcode = {}
    if not os.path.exists(tracks_csv):
        print(f"  Warning: Tracks CSV not found at {tracks_csv}, skipping tracks.")
        return tracks_by_barcode

    with open(tracks_csv, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            barcode = row.get("Barcode", "").strip()
            if not barcode:
                continue
            name = row.get("Track Name", "").strip()
            if not name:
                continue
            mins, secs = parse_runtime(row.get("Run Time", ""))
            if barcode not in tracks_by_barcode:
                tracks_by_barcode[barcode] = []
            tracks_by_barcode[barcode].append({
                "title": name,
                "mins":  mins,
                "secs":  secs,
            })
    return tracks_by_barcode

# ── Main import ───────────────────────────────────────────────────────────────
def main():
    import sys
    args = sys.argv[1:]

    def get_arg(flag):
        try:
            i = args.index(flag)
            return args[i + 1]
        except (ValueError, IndexError):
            return None

    do_update   = "--update" in args
    albums_path = get_arg("--albums") or ALBUMS_CSV
    tracks_path = get_arg("--tracks") or TRACKS_CSV
    db_path     = get_arg("--db")     or DB_PATH

    if not os.path.exists(db_path):
        print(f"ERROR: Database not found at {db_path}")
        print("Make sure Vinyl Library has been run at least once.")
        return

    if not os.path.exists(albums_path):
        print(f"ERROR: Albums CSV not found at {albums_path}")
        return

    print(f"Database: {db_path}")
    print(f"Albums:   {albums_path}")
    print(f"Tracks:   {tracks_path}")
    print(f"Mode:     {'UPDATE existing + add new' if do_update else 'Add new only'}")
    print()

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Load existing records for duplicate detection
    existing = cur.execute("SELECT id, barcode, cat_no, title, artist FROM records").fetchall()
    existing_by_barcode = {r["barcode"]: r["id"] for r in existing if r["barcode"]}
    existing_by_title   = {(r["title"] or "").lower() + "|" + (r["artist"] or "").lower(): r["id"] for r in existing}

    tracks_map = load_tracks(tracks_path)

    added = 0
    updated = 0
    skipped = 0
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with open(albums_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            title  = row.get("Album Title", "").strip()
            artist = row.get("Artist", "").strip()
            if not title or not artist:
                continue

            barcode = row.get("Barcode/UPC", "").strip()

            # Duplicate detection — always runs regardless of --update flag
            existing_id = existing_by_barcode.get(barcode)
            if not existing_id:
                key = title.lower() + "|" + artist.lower()
                existing_id = existing_by_title.get(key)

            # If exists and not updating, skip
            if existing_id and not do_update:
                print(f"  SKIP (exists): {artist} - {title}")
                skipped += 1
                continue

            # Map fields
            year       = row.get("Year", "").strip()
            genre      = row.get("Genre", "").strip()
            label      = row.get("Record Label", "").strip()
            cat_no     = row.get("CAT#", "").strip()
            runout     = row.get("Runout#", "").strip()
            country    = row.get("Cntry", "").strip()
            location   = row.get("Loc", "").strip()
            notes      = row.get("Notes", "").strip()
            added_on   = parse_date(row.get("Added or Updated on", ""))
            updated_by = row.get("Updated By", "").strip()

            img1 = load_image(row.get("Image Path", ""))
            img2 = load_image(row.get("Back Image Path", ""))
            images_json = json.dumps([img1, img2, None, None])

            vinyl_cond  = map_grade(row.get("Vinyl Condition", ""))
            jacket_cond = map_grade(row.get("Jacket Condition", ""))

            try:
                low_value  = float(row.get("Low Value", "") or 0) or None
                est_value  = float(row.get("Estimated Value", "") or 0) or None
                high_value = float(row.get("High Value", "") or 0) or None
            except:
                low_value = est_value = high_value = None

            num_discs = row.get("# of Discs", "1").strip() or "1"
            disc_size = row.get("Disc Size", "12\"").strip()
            fmt = map_format(disc_size, num_discs)
            try:
                discs = int(float(num_discs))
            except:
                discs = 1

            tracks      = tracks_map.get(barcode, [])
            tracks_json = json.dumps(tracks)

            if existing_id:
                # Update — overwrite all fields, keep images/tracks if CSV has none
                cur.execute("""
                    UPDATE records SET
                        artist=?, title=?, label=?, cat_no=?,
                        runout=?, barcode=?, country=?, year=?,
                        format=?, discs=?, genre=?, vinyl_cond=?,
                        jacket_cond=?, low_value=?, est_value=?, high_value=?,
                        location=?, notes=?,
                        tracks  = CASE WHEN ? != '[]'                    THEN ? ELSE tracks END,
                        images  = CASE WHEN ? != '[null, null, null, null]' THEN ? ELSE images END,
                        updated_on=?
                    WHERE id=?
                """, (
                    artist, title, label, cat_no,
                    runout, barcode, country, year,
                    fmt, discs, genre, vinyl_cond,
                    jacket_cond, low_value, est_value, high_value,
                    location, notes,
                    tracks_json, tracks_json,
                    images_json, images_json,
                    now, existing_id
                ))
                updated += 1
                print(f"  UPDATED: {artist} - {title}")
            else:
                # Insert new record and add to in-memory lookup to prevent within-run duplicates
                cur.execute("""
                    INSERT INTO records
                    (artist, title, label, cat_no, runout, barcode, country, year, format, discs,
                     genre, vinyl_cond, jacket_cond, low_value, est_value, high_value,
                     location, rating, notes, tracks, images, added_on, updated_on, updated_by)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, (
                    artist, title, label, cat_no, runout, barcode, country, year, fmt, discs,
                    genre, vinyl_cond, jacket_cond, low_value, est_value, high_value,
                    location, 0, notes, tracks_json, images_json, added_on, added_on, updated_by
                ))
                new_id = cur.lastrowid
                if barcode:
                    existing_by_barcode[barcode] = new_id
                existing_by_title[title.lower() + "|" + artist.lower()] = new_id
                added += 1
                print(f"  ADDED: {artist} - {title}")

    conn.commit()
    conn.close()

    print()
    print(f"Done — {added} records added, {updated} updated, {skipped} skipped.")
    print(f"IMPORT_DONE added={added} updated={updated} skipped={skipped}")

if __name__ == "__main__":
    main()


    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}")
        print("Make sure Vinyl Library has been run at least once.")
        return

    if not os.path.exists(ALBUMS_CSV):
        print(f"ERROR: Albums CSV not found at {ALBUMS_CSV}")
        return

    print(f"Database: {DB_PATH}")
    print(f"Albums:   {ALBUMS_CSV}")
    print(f"Tracks:   {TRACKS_CSV}")
    print(f"Mode:     {'UPDATE existing + add new' if do_update else 'Add new only (use --update to also update existing)'}")
    print()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Load existing records for duplicate detection
    existing = cur.execute("SELECT id, barcode, cat_no, title, artist FROM records").fetchall()
    existing_by_barcode = {r["barcode"]: r["id"] for r in existing if r["barcode"]}
    existing_by_title   = {(r["title"] or "").lower() + "|" + (r["artist"] or "").lower(): r["id"] for r in existing}

    tracks_map = load_tracks()

    added = 0
    updated = 0
    skipped = 0
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with open(ALBUMS_CSV, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Skip malformed rows
            title  = row.get("Album Title", "").strip()
            artist = row.get("Artist", "").strip()
            if not title or not artist:
                continue

            barcode = row.get("Barcode/UPC", "").strip()

            # Check if exists
            existing_id = existing_by_barcode.get(barcode)
            if not existing_id:
                key = title.lower() + "|" + artist.lower()
                existing_id = existing_by_title.get(key)

            if existing_id and not do_update:
                print(f"  SKIP (exists): {artist} - {title}")
                skipped += 1
                continue

            # Map fields
            year       = row.get("Year", "").strip()
            genre      = row.get("Genre", "").strip()
            label      = row.get("Record Label", "").strip()
            cat_no     = row.get("CAT#", "").strip()
            runout     = row.get("Runout#", "").strip()
            country    = row.get("Cntry", "").strip()
            location   = row.get("Loc", "").strip()
            notes      = row.get("Notes", "").strip()
            added_on   = parse_date(row.get("Added or Updated on", ""))
            updated_by = row.get("Updated By", "").strip()

            # Load images from disk
            img1 = load_image(row.get("Image Path", ""))
            img2 = load_image(row.get("Back Image Path", ""))
            images = [img1, img2, None, None]
            images_json = json.dumps(images)

            vinyl_cond  = map_grade(row.get("Vinyl Condition", ""))
            jacket_cond = map_grade(row.get("Jacket Condition", ""))

            try:
                low_value  = float(row.get("Low Value", "") or 0) or None
                est_value  = float(row.get("Estimated Value", "") or 0) or None
                high_value = float(row.get("High Value", "") or 0) or None
            except:
                low_value = est_value = high_value = None

            num_discs  = row.get("# of Discs", "1").strip() or "1"
            disc_size  = row.get("Disc Size", "12\"").strip()
            fmt        = map_format(disc_size, num_discs)
            try:
                discs = int(float(num_discs))
            except:
                discs = 1

            # Get tracks for this barcode
            tracks = tracks_map.get(barcode, [])
            tracks_json = json.dumps(tracks)
            # images_json already set above

            cur.execute("""
                INSERT INTO records
                (artist, title, label, cat_no, runout, barcode, country, year, format, discs,
                 genre, vinyl_cond, jacket_cond, low_value, est_value, high_value,
                 location, rating, notes, tracks, images, added_on, updated_on, updated_by)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                artist, title, label, cat_no, runout, barcode, country, year, fmt, discs,
                genre, vinyl_cond, jacket_cond, low_value, est_value, high_value,
                location, 0, notes, tracks_json, images_json, added_on, added_on, updated_by
            ))

            if existing_id:
                # Update existing record — overwrite all fields from CSV
                cur.execute("""
                    UPDATE records SET
                        artist      = ?, title       = ?, label       = ?, cat_no      = ?,
                        runout      = ?, barcode     = ?, country     = ?, year        = ?,
                        format      = ?, discs       = ?, genre       = ?, vinyl_cond  = ?,
                        jacket_cond = ?, low_value   = ?, est_value   = ?, high_value  = ?,
                        location    = ?, notes       = ?,
                        tracks      = CASE WHEN ? != '[]' THEN ? ELSE tracks END,
                        images      = CASE WHEN ? != '[null, null, null, null]' THEN ? ELSE images END,
                        updated_on  = ?
                    WHERE id = ?
                """, (
                    artist, title, label, cat_no,
                    runout, barcode, country, year,
                    fmt, discs, genre, vinyl_cond,
                    jacket_cond, low_value, est_value, high_value,
                    location, notes,
                    tracks_json, tracks_json,
                    images_json, images_json,
                    now, existing_id
                ))
                updated += 1
                print(f"  UPDATED: {artist} - {title}")
            else:
                cur.execute("""
                    INSERT INTO records
                    (artist, title, label, cat_no, runout, barcode, country, year, format, discs,
                     genre, vinyl_cond, jacket_cond, low_value, est_value, high_value,
                     location, rating, notes, tracks, images, added_on, updated_on, updated_by)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, (
                    artist, title, label, cat_no, runout, barcode, country, year, fmt, discs,
                    genre, vinyl_cond, jacket_cond, low_value, est_value, high_value,
                    location, 0, notes, tracks_json, images_json, added_on, added_on, updated_by
                ))
                existing_by_barcode[barcode] = cur.lastrowid
                existing_by_title[title.lower() + "|" + artist.lower()] = cur.lastrowid
                added += 1
                print(f"  ADDED: {artist} - {title}")

    conn.commit()
    conn.close()

    print()
    print(f"Done — {added} records added, {updated} updated, {skipped} skipped.")

if __name__ == "__main__":
    main()
