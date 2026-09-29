#!/usr/bin/env python3
# vinyl-server.py
# Read-only web server for Vinyl Library
# Run with: python vinyl-server.py
# Access at: http://localhost:3001

import sqlite3
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT    = 3001
DB_PATH = os.path.join(os.environ.get("APPDATA") or r"C:\Users\Clayton\AppData\Roaming", "vinyl-library", "vinyl.db")
WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vinyl-web")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def row_to_dict(row):
    d = dict(row)
    for key in ("tracks", "images"):
        if key in d and d[key]:
            try:
                d[key] = json.loads(d[key])
            except:
                d[key] = []
        else:
            d[key] = []
    return d

def safe_record(r):
    """Return record - all fields included"""
    return dict(r)

class Handler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        print(f"  {self.address_string()} - {format % args}")

    def send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path, mime):
        try:
            with open(path, "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)
        except FileNotFoundError:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path   = parsed.path

        # ── API ──
        if path == "/api/records":
            try:
                conn = get_db()
                rows = conn.execute("SELECT * FROM records ORDER BY artist").fetchall()
                conn.close()
                records = [safe_record(row_to_dict(r)) for r in rows]
                self.send_json({"ok": True, "records": records})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path.startswith("/api/records/") and path.endswith("/value-history"):
            try:
                parts = path.split("/")
                record_id = int(parts[3])
                conn = get_db()
                rows = conn.execute(
                    "SELECT low_value, est_value, high_value, recorded_on FROM value_history WHERE record_id=? ORDER BY recorded_on ASC",
                    (record_id,)
                ).fetchall()
                conn.close()
                self.send_json({"ok": True, "history": [dict(r) for r in rows]})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path.startswith("/api/lyrics/cached/"):
            try:
                # /api/lyrics/cached/{record_id} — returns list of track indexes with cached lyrics
                parts = path.split("/")
                record_id = int(parts[4])
                conn = get_db()
                rows = conn.execute(
                    "SELECT track_index FROM lyrics_cache WHERE record_id=? AND lyrics IS NOT NULL AND lyrics != ''",
                    (record_id,)
                ).fetchall()
                conn.close()
                self.send_json({"ok": True, "cached": [r["track_index"] for r in rows]})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path.startswith("/api/lyrics/"):
            try:
                # /api/lyrics/{record_id}/{track_index}
                parts = path.split("/")
                record_id   = int(parts[3])
                track_index = int(parts[4])
                conn = get_db()
                row = conn.execute(
                    "SELECT lyrics, source, track_title FROM lyrics_cache WHERE record_id=? AND track_index=?",
                    (record_id, track_index)
                ).fetchone()
                conn.close()
                if row and row["lyrics"]:
                    self.send_json({"ok": True, "lyrics": row["lyrics"], "source": row["source"], "trackTitle": row["track_title"]})
                else:
                    self.send_json({"ok": False, "error": "No cached lyrics for this track"})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path.startswith("/api/records/"):
            try:
                record_id = int(path.split("/")[-1])
                conn = get_db()
                row  = conn.execute("SELECT * FROM records WHERE id=?", (record_id,)).fetchone()
                conn.close()
                if row is None:
                    self.send_json({"ok": False, "error": "Not found"}, 404)
                else:
                    self.send_json({"ok": True, "record": safe_record(row_to_dict(row))})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/api/stats":
            try:
                conn    = get_db()
                total   = conn.execute("SELECT COUNT(*) as c FROM records").fetchone()["c"]
                genres  = conn.execute("SELECT genre, COUNT(*) as c FROM records WHERE genre != '' GROUP BY genre ORDER BY c DESC LIMIT 10").fetchall()
                formats = conn.execute("SELECT format, COUNT(*) as c FROM records WHERE format != '' GROUP BY format ORDER BY c DESC").fetchall()
                conn.close()
                self.send_json({
                    "ok": True,
                    "total": total,
                    "genres":  [dict(r) for r in genres],
                    "formats": [dict(r) for r in formats],
                })
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        # ── Static files ──
        elif path == "/" or path == "/index.html":
            self.send_file(os.path.join(WEB_DIR, "index.html"), "text/html; charset=utf-8")

        else:
            self.send_response(404)
            self.end_headers()


if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}")
        print("Make sure Vinyl Library has been run at least once.")
        exit(1)

    if not os.path.exists(WEB_DIR):
        print(f"ERROR: vinyl-web folder not found at {WEB_DIR}")
        print("Create a 'vinyl-web' folder next to this script and put index.html in it.")
        exit(1)

    print(f"\nVinyl Library web view running at:")
    print(f"  http://localhost:{PORT}")
    print(f"\nDatabase: {DB_PATH}")
    print(f"Web files: {WEB_DIR}")
    print(f"\nPress Ctrl+C to stop.\n")

    import time
    while True:
        try:
            server = HTTPServer(("0.0.0.0", PORT), Handler)
            print(f"Listening on port {PORT}...")
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            break
        except OSError as e:
            if "Address already in use" in str(e) or "10048" in str(e):
                print(f"Port {PORT} in use, retrying in 5s...")
                time.sleep(5)
            else:
                print(f"Server error: {e}, restarting in 3s...")
                time.sleep(3)
        except Exception as e:
            print(f"Unexpected error: {e}, restarting in 3s...")
            time.sleep(3)
