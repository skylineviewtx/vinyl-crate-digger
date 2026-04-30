// vinyl-server.js
// Read-only web server for Vinyl Library
// Run with: node vinyl-server.js
// Access at: http://localhost:3001

const express  = require("express");
const Database = require("better-sqlite3");
const path     = require("path");
const fs       = require("fs");

const PORT    = 3001;
const DB_PATH = path.join(process.env.APPDATA, "vinyl-library", "vinyl.db");

if (!fs.existsSync(DB_PATH)) {
  console.error(`Database not found at: ${DB_PATH}`);
  process.exit(1);
}

const db  = new Database(DB_PATH, { readonly: true });
const app = express();

app.use(express.static(path.join(__dirname, "vinyl-web")));

// ── API ───────────────────────────────────────────────────────────────────────

// GET /api/records — full collection (no pricing)
app.get("/api/records", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM records ORDER BY artist").all();
    const records = rows.map(r => ({
      id:         r.id,
      artist:     r.artist,
      title:      r.title,
      label:      r.label,
      cat_no:     r.cat_no,
      country:    r.country,
      year:       r.year,
      format:     r.format,
      discs:      r.discs,
      genre:      r.genre,
      vinyl_cond: r.vinyl_cond,
      jacket_cond:r.jacket_cond,
      location:   r.location,
      rating:     r.rating,
      notes:      r.notes,
      tracks:     JSON.parse(r.tracks  || "[]"),
      images:     JSON.parse(r.images  || "[]"),
      added_on:   r.added_on,
    }));
    res.json({ ok: true, records });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/records/:id — single record
app.get("/api/records/:id", (req, res) => {
  try {
    const r = db.prepare("SELECT * FROM records WHERE id=?").get(req.params.id);
    if (!r) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({
      ok: true,
      record: {
        ...r,
        tracks: JSON.parse(r.tracks || "[]"),
        images: JSON.parse(r.images || "[]"),
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/stats — quick stats
app.get("/api/stats", (req, res) => {
  try {
    const total   = db.prepare("SELECT COUNT(*) as c FROM records").get().c;
    const genres  = db.prepare("SELECT genre, COUNT(*) as c FROM records WHERE genre != '' GROUP BY genre ORDER BY c DESC LIMIT 10").all();
    const formats = db.prepare("SELECT format, COUNT(*) as c FROM records WHERE format != '' GROUP BY format ORDER BY c DESC").all();
    res.json({ ok: true, total, genres, formats });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`\nVinyl Library web view running at:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`\nDatabase: ${DB_PATH}`);
  console.log(`\nPress Ctrl+C to stop.\n`);
});
