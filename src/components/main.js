const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const https = require("https");
const http  = require("http");
const crypto = require("crypto");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const userDataPath = path.join(app.getPath("appData"), "vinyl-library");
const dbPath = path.join(userDataPath, "vinyl.db");

let db;
let mainWin;
const detailWindows = new Map();
const sessions = new Map();

// ── Crypto helpers (token encryption only — no DB encryption) ─────────────────
function getInstallSecret() {
  let row = db.prepare("SELECT value FROM settings WHERE key='_install_secret'").get();
  if (!row) {
    const secret = crypto.randomBytes(32).toString("hex");
    db.prepare("INSERT INTO settings (key, value) VALUES ('_install_secret', ?)").run(secret);
    return secret;
  }
  return row.value;
}

function getEncryptionKey() {
  return crypto.createHash("sha256").update(getInstallSecret()).digest();
}

function encryptValue(plaintext) {
  if (!plaintext) return plaintext;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptValue(ciphertext) {
  if (!ciphertext || !ciphertext.startsWith("enc:")) return ciphertext;
  try {
    const parts = ciphertext.split(":");
    if (parts.length !== 4) return ciphertext;
    const [, ivHex, tagHex, dataHex] = parts;
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return decipher.update(Buffer.from(dataHex, "hex")) + decipher.final("utf8");
  } catch { return ciphertext; }
}

function signData(str) {
  return crypto.createHmac("sha256", getInstallSecret()).update(str).digest("hex");
}

// ── Password policy ───────────────────────────────────────────────────────────
function validatePassword(password) {
  if (!password || password.length < 6) return "Password must be at least 6 characters.";
  return null;
}

// ── Backup record sanitizer ───────────────────────────────────────────────────
const RECORD_TEXT_FIELDS = ["artist","title","label","cat_no","runout","barcode","country","year","format","genre","vinyl_cond","jacket_cond","location","notes","added_on","updated_on","updated_by"];
const MAX_TEXT_LEN = { notes: 5000, default: 500 };

function sanitizeRecord(r) {
  const out = {};
  if (r.id != null) out.id = parseInt(r.id) || null;
  for (const f of RECORD_TEXT_FIELDS) {
    const max = MAX_TEXT_LEN[f] || MAX_TEXT_LEN.default;
    out[f] = typeof r[f] === "string" ? r[f].slice(0, max) : (r[f] == null ? null : String(r[f]).slice(0, max));
  }
  out.discs = parseInt(r.discs) || 1;
  out.rating = Math.min(5, Math.max(0, parseInt(r.rating) || 0));
  out.low_value = parseFloat(r.low_value) || null;
  out.est_value = parseFloat(r.est_value) || null;
  out.high_value = parseFloat(r.high_value) || null;
  try { out.tracks = JSON.stringify(JSON.parse(r.tracks || "[]")); } catch { out.tracks = "[]"; }
  try { out.images = JSON.stringify(JSON.parse(r.images || "[]")); } catch { out.images = "[]"; }
  return out;
}

function requireSession(event, requiredRole = null) {
  const session = sessions.get(event.sender.id);
  if (!session) throw new Error("Not authenticated.");
  if (requiredRole && session.role !== requiredRole) throw new Error("Insufficient permissions.");
  return session;
}

function initDB() {
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  // ── Base tables (always safe — IF NOT EXISTS) ────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artist TEXT, title TEXT, label TEXT, cat_no TEXT, runout TEXT, barcode TEXT,
      country TEXT, year TEXT, format TEXT, discs INTEGER DEFAULT 1,
      genre TEXT, vinyl_cond TEXT, jacket_cond TEXT,
      low_value REAL, est_value REAL, high_value REAL,
      location TEXT, rating INTEGER DEFAULT 0, notes TEXT,
      tracks TEXT DEFAULT '[]', images TEXT DEFAULT '[]',
      added_on TEXT, updated_on TEXT, updated_by TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS value_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id   INTEGER NOT NULL,
      low_value   REAL,
      est_value   REAL,
      high_value  REAL,
      recorded_on TEXT NOT NULL,
      FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS listening_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id   INTEGER NOT NULL,
      played_at   TEXT NOT NULL,
      played_by   TEXT,
      FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
    );
  `);

  // ── Versioned migrations ─────────────────────────────────────────────────
  // Each migration runs exactly once. To add a new schema change, append a
  // new entry to the MIGRATIONS array and increment CURRENT_VERSION.
  const CURRENT_VERSION = 7;

  const migrations = [
    // v1 — initial columns missing from early builds
    () => {
      db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
      db.exec("ALTER TABLE records ADD COLUMN barcode TEXT DEFAULT ''");
      db.exec("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0");
    },
    // v2 — new record fields
    () => {
      db.exec("ALTER TABLE records ADD COLUMN num_tracks INTEGER DEFAULT 0");
      db.exec("ALTER TABLE records ADD COLUMN record_size TEXT DEFAULT ''");
      db.exec("ALTER TABLE records ADD COLUMN rpm TEXT DEFAULT ''");
      db.exec("ALTER TABLE records ADD COLUMN style TEXT DEFAULT ''");
      db.exec("ALTER TABLE records ADD COLUMN channels TEXT DEFAULT ''");
    },
    // v3 — user profile fields
    () => {
      db.exec("ALTER TABLE users ADD COLUMN first_name TEXT DEFAULT ''");
      db.exec("ALTER TABLE users ADD COLUMN last_name TEXT DEFAULT ''");
      db.exec("ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''");
      db.exec("ALTER TABLE users ADD COLUMN last_login TEXT DEFAULT NULL");
    },
    // v4 — previous login tracking
    () => {
      db.exec("ALTER TABLE users ADD COLUMN previous_last_login TEXT DEFAULT NULL");
    },
    // v5 — value history table (new table, not ALTER TABLE so always safe)
    () => {
      db.exec(`CREATE TABLE IF NOT EXISTS value_history (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id   INTEGER NOT NULL,
        low_value   REAL,
        est_value   REAL,
        high_value  REAL,
        recorded_on TEXT NOT NULL,
        FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
      )`);
    },
    // v6 — listening history table
    () => {
      db.exec(`CREATE TABLE IF NOT EXISTS listening_history (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id   INTEGER NOT NULL,
        played_at   TEXT NOT NULL,
        played_by   TEXT,
        FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
      )`);
    },
    // v7 — lyrics cache table
    () => {
      db.exec(`CREATE TABLE IF NOT EXISTS lyrics_cache (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id   INTEGER NOT NULL,
        track_index INTEGER NOT NULL,
        track_title TEXT,
        lyrics      TEXT,
        source      TEXT,
        fetched_at  TEXT NOT NULL,
        UNIQUE(record_id, track_index),
        FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
      )`);
    },
  ];

  // Pre-flight: ensure critical columns exist regardless of migration version
  const criticalFixes = [
    "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'",
    "ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN first_name TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN last_name TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN last_login TEXT DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN previous_last_login TEXT DEFAULT NULL",
    "ALTER TABLE records ADD COLUMN barcode TEXT DEFAULT ''",
    "ALTER TABLE records ADD COLUMN num_tracks INTEGER DEFAULT 0",
    "ALTER TABLE records ADD COLUMN record_size TEXT DEFAULT ''",
    "ALTER TABLE records ADD COLUMN rpm TEXT DEFAULT ''",
    "ALTER TABLE records ADD COLUMN style TEXT DEFAULT ''",
    "ALTER TABLE records ADD COLUMN channels TEXT DEFAULT ''",
  ];
  for (const sql of criticalFixes) {
    try { db.exec(sql); } catch {}
  }

  const row = db.prepare("SELECT value FROM settings WHERE key='db_version'").get();
  const currentVersion = row ? parseInt(row.value) || 0 : 0;

  if (currentVersion < CURRENT_VERSION) {
    const runMigrations = db.transaction(() => {
      for (let i = currentVersion; i < CURRENT_VERSION; i++) {
        try {
          migrations[i]();
        } catch (e) {
          // Column may already exist on DBs that were partially migrated — safe to skip
          console.warn(`Migration v${i + 1} warning:`, e.message);
        }
      }
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('db_version', ?)").run(String(CURRENT_VERSION));
    });
    runMigrations();
  }

  const count = db.prepare("SELECT COUNT(*) as c FROM users").get();
  if (count.c === 0) {
    const hash = bcrypt.hashSync("vinyl123", 10);
    db.prepare("INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?,?,?,?)").run("admin", hash, "admin", 1);
  }
}

function createWindow() {
  mainWin = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600,
    titleBarStyle: "hiddenInset", backgroundColor: "#0d0d1a",
    title: "Vinyl Crate Digger",
    icon: path.join(__dirname, "../public/icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false }
  });
  isDev ? mainWin.loadURL("http://localhost:5173") : mainWin.loadFile(path.join(__dirname, "../dist/index.html"));
  // Capture webContents id before window is destroyed
  mainWin.on("close", () => {
    try { sessions.delete(mainWin.webContents.id); } catch {}
  });
  mainWin.on("closed", () => { mainWin = null; });
}

function buildMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        { label: "Add Record", accelerator: "CmdOrCtrl+N", click: () => mainWin?.webContents.send("menu:addRecord") },
        { label: "Import from Discogs", accelerator: "CmdOrCtrl+I", click: () => mainWin?.webContents.send("menu:importDiscogs") },
        { label: "Export CSV", accelerator: "CmdOrCtrl+E", click: () => mainWin?.webContents.send("menu:exportCSV") },
        { type: "separator" },
        { label: "Settings", accelerator: "CmdOrCtrl+,", click: () => mainWin?.webContents.send("menu:openSettings") },
        { type: "separator" },
        { label: "Quit", accelerator: process.platform === "darwin" ? "Cmd+Q" : "Alt+F4", click: () => app.quit() }
      ]
    },
    {
      label: "Library",
      submenu: [
        { label: "Grid View", accelerator: "CmdOrCtrl+1", click: () => mainWin?.webContents.send("menu:setView", "grid") },
        { label: "List View", accelerator: "CmdOrCtrl+2", click: () => mainWin?.webContents.send("menu:setView", "list") },
        { type: "separator" },
        { label: "Sort by Recently Added", click: () => mainWin?.webContents.send("menu:setSort", "added") },
        { label: "Sort by Artist A–Z", click: () => mainWin?.webContents.send("menu:setSort", "artist") },
        { label: "Sort by Year", click: () => mainWin?.webContents.send("menu:setSort", "year") },
        { label: "Sort by Rating", click: () => mainWin?.webContents.send("menu:setSort", "rating") }
      ]
    },
    {
      label: "Window",
      submenu: [
        { label: "Minimize", accelerator: "CmdOrCtrl+M", click: () => mainWin?.minimize() },
        { label: "Zoom", click: () => mainWin?.isMaximized() ? mainWin.unmaximize() : mainWin?.maximize() },
        { type: "separator" },
        { label: "Now Playing", accelerator: "CmdOrCtrl+P", click: () => mainWin?.webContents.send("menu:openNowPlaying") }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About Vinyl Crate Digger",
          click: () => {
            dialog.showMessageBox(mainWin, {
              type: "info", title: "About Vinyl Crate Digger", message: "Vinyl Crate Digger",
              detail: `Version 1.7.0\n\nA personal vinyl record collection manager.\n\nBuilt with Electron, React, and SQLite.`,
              buttons: ["OK"]
            });
          }
        },
        { label: "Open Data Folder", click: () => shell.openPath(userDataPath) },
        ...(isDev ? [
          { type: "separator" },
          { label: "Toggle DevTools", accelerator: "CmdOrCtrl+Shift+I", click: () => mainWin?.webContents.toggleDevTools() }
        ] : [])
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  initDB(); createWindow(); buildMenu();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

// ── Helpers ───────────────────────────────────────────────────────────────────
function fetchJSON(url, token, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        "User-Agent": "VinylLibraryApp/1.0",
        ...(token ? { "Authorization": `Discogs token=${token}` } : {}),
        ...extraHeaders
      }
    };
    https.get(url, opts, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error("Invalid JSON response")); }
      });
    }).on("error", reject);
  });
}

function getDiscogsToken() {
  const row = db.prepare("SELECT value FROM settings WHERE key='discogs_token'").get();
  return row?.value ? decryptValue(row.value) : null;
}

function parseDiscogsRelease(release) {
  const tracks = (release.tracklist || []).map(t => {
    const parts = (t.duration || "").split(":");
    const mins = parts.length === 2 ? parts[0] : "";
    const secs = parts.length === 2 ? parts[1] : "";
    return { title: t.title || "", mins, secs };
  });
  const label = release.labels?.[0]?.name || "";
  const catNo = release.labels?.[0]?.catno || "";
  const format = release.formats?.[0]?.name || "LP";
  const discs = release.formats?.[0]?.qty || 1;
  const genre = release.genres?.[0] || release.styles?.[0] || "";
  const year = String(release.year || "");
  const country = release.country || "";
  const artist = (release.artists || []).map(a => a.name.replace(/\s*\(\d+\)$/, "")).join(", ");
  const title = release.title || "";
  const notes = release.notes ? release.notes.replace(/<[^>]+>/g, "").trim() : "";
  const images = (release.images || []).filter(i => i.uri).map(i => ({ uri: i.uri, uri150: i.uri150 }));
  return { artist, title, label, cat_no: catNo, country, year, format, discs: parseInt(discs) || 1, genre, notes, tracks, images };
}

// ── Auth ──────────────────────────────────────────────────────────────────────
ipcMain.handle("auth:login", (event, { username, password }) => {
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return { ok: false, error: "Invalid username or password." };
  // Save current last_login as previous before overwriting
  const previousLogin = user.last_login || null;
  const now = new Date().toISOString().replace("T", " ").substring(0, 19);
  db.prepare("UPDATE users SET previous_last_login = last_login, last_login = ? WHERE id = ?").run(now, user.id);
  sessions.set(event.sender.id, { username: user.username, role: user.role, previousLogin });
  return {
    ok: true,
    username: user.username,
    role: user.role,
    mustChangePassword: !!user.must_change_password,
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    email: user.email || "",
    lastLogin: previousLogin,
  };
});

ipcMain.handle("auth:logout", (event) => {
  sessions.delete(event.sender.id);
  return { ok: true };
});

ipcMain.handle("auth:changePassword", (event, { username, oldPassword, newPassword }) => {
  requireSession(event);
  const pwErr = validatePassword(newPassword);
  if (pwErr) return { ok: false, error: pwErr };
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !bcrypt.compareSync(oldPassword, user.password_hash)) return { ok: false, error: "Current password is incorrect." };
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE username = ?").run(bcrypt.hashSync(newPassword, 10), username);
  return { ok: true };
});

// ── Settings ──────────────────────────────────────────────────────────────────
const ENCRYPTED_SETTINGS = new Set(["discogs_token", "listenbrainz_token", "genius_token"]);

ipcMain.handle("settings:get", (event, key) => {
  requireSession(event);
  const row = db.prepare("SELECT value FROM settings WHERE key=?").get(key);
  if (!row?.value) return null;
  return ENCRYPTED_SETTINGS.has(key) ? decryptValue(row.value) : row.value;
});

ipcMain.handle("settings:set", (event, { key, value }) => {
  requireSession(event);
  const stored = ENCRYPTED_SETTINGS.has(key) ? encryptValue(value) : value;
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)").run(key, stored);
  return { ok: true };
});

// ── User Management ───────────────────────────────────────────────────────────
// Get own profile — available to all users
ipcMain.handle("users:getMyProfile", (event) => {
  requireSession(event);
  const session = sessions.get(event.sender.id);
  const user = db.prepare("SELECT id, username, role, first_name, last_name, email, previous_last_login FROM users WHERE username=?").get(session?.username);
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    email: user.email || "",
    lastLogin: user.previous_last_login || null,
  };
});

ipcMain.handle("users:getAll", (event) => {
  requireSession(event, "admin");
  return db.prepare("SELECT id, username, role, first_name, last_name, email, last_login, previous_last_login, created_at FROM users ORDER BY id").all();
});

// Update user profile (own profile or admin editing any)
ipcMain.handle("users:updateProfile", (event, { userId, firstName, lastName, email }) => {
  requireSession(event);
  const session = sessions.get(event.sender.id);
  const target = db.prepare("SELECT id, username FROM users WHERE id=?").get(userId);
  if (!target) return { ok: false, error: "User not found." };
  // Non-admins can only edit their own profile
  const isAdmin = session?.role === "admin";
  const isOwn = db.prepare("SELECT id FROM users WHERE username=?").get(session?.username)?.id === userId;
  if (!isAdmin && !isOwn) return { ok: false, error: "Not authorized." };
  db.prepare("UPDATE users SET first_name=?, last_name=?, email=? WHERE id=?")
    .run(firstName || "", lastName || "", email || "", userId);
  return { ok: true };
});

// Get welcome data for modal
ipcMain.handle("users:welcomeData", (event) => {
  requireSession(event);
  const session = sessions.get(event.sender.id);
  const user = db.prepare("SELECT * FROM users WHERE username=?").get(session?.username);
  const total = db.prepare("SELECT COUNT(*) as c FROM records").get()?.c || 0;
  const totalValue = db.prepare("SELECT SUM(est_value) as v FROM records WHERE est_value IS NOT NULL").get()?.v || 0;
  const since = user?.previous_last_login || null;
  const addedSince = since
    ? db.prepare("SELECT COUNT(*) as c FROM records WHERE added_on >= ?").get(since)?.c || 0
    : 0;
  const noArtwork = db.prepare("SELECT COUNT(*) as c FROM records WHERE images IS NULL OR images='[]' OR images='[null,null,null,null]'").get()?.c || 0;
  // Random record with artwork
  const withArt = db.prepare("SELECT id, artist, title, images FROM records WHERE images IS NOT NULL AND images != '[]' AND images != '[null,null,null,null]' ORDER BY RANDOM() LIMIT 1").get();
  const todaysPick = withArt ? {
    id: withArt.id,
    artist: withArt.artist,
    title: withArt.title,
    image: JSON.parse(withArt.images || "[]").find(Boolean) || null,
  } : null;
  return {
    firstName: user?.first_name || "",
    lastName:  user?.last_name  || "",
    lastLogin: since || null,
    total,
    totalValue,
    addedSince,
    noArtwork,
    todaysPick,
  };
});

ipcMain.handle("users:create", (event, { username, password, role }) => {
  requireSession(event, "admin");
  if (!username || !password) return { ok: false, error: "Username and password required." };
  const pwErr = validatePassword(password);
  if (pwErr) return { ok: false, error: pwErr };
  try {
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?,?,?)").run(username, bcrypt.hashSync(password, 10), role || "user");
    return { ok: true };
  } catch { return { ok: false, error: "Username already exists." }; }
});

ipcMain.handle("users:resetPassword", (event, { userId, newPassword }) => {
  requireSession(event, "admin");
  const pwErr = validatePassword(newPassword);
  if (pwErr) return { ok: false, error: pwErr };
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(newPassword, 10), userId);
  return { ok: true };
});

ipcMain.handle("users:delete", (event, { userId }) => {
  requireSession(event, "admin");
  const admins = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='admin'").get();
  const target = db.prepare("SELECT role FROM users WHERE id=?").get(userId);
  if (target?.role === "admin" && admins.c <= 1) return { ok: false, error: "Cannot delete the last admin account." };
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  return { ok: true };
});

// ── Records ───────────────────────────────────────────────────────────────────
ipcMain.handle("records:getAll", (event) => {
  requireSession(event);
  return db.prepare("SELECT * FROM records ORDER BY id DESC").all().map(r => ({
    ...r, tracks: JSON.parse(r.tracks || "[]"), images: JSON.parse(r.images || "[]")
  }));
});

ipcMain.handle("records:save", (event, record) => {
  requireSession(event);
  const d = { ...record, tracks: JSON.stringify(record.tracks || []), images: JSON.stringify(record.images || []) };
  const now = new Date().toISOString().replace("T", " ").substring(0, 19);

  const snapshotValue = (recordId, newLow, newEst, newHigh) => {
    // Only snapshot if at least one value is set
    if (!newLow && !newEst && !newHigh) return;
    // Get last snapshot to compare
    const last = db.prepare("SELECT low_value, est_value, high_value FROM value_history WHERE record_id=? ORDER BY recorded_on DESC LIMIT 1").get(recordId);
    const changed = !last
      || parseFloat(last.low_value  || 0) !== parseFloat(newLow  || 0)
      || parseFloat(last.est_value  || 0) !== parseFloat(newEst  || 0)
      || parseFloat(last.high_value || 0) !== parseFloat(newHigh || 0);
    if (changed) {
      db.prepare("INSERT INTO value_history (record_id, low_value, est_value, high_value, recorded_on) VALUES (?,?,?,?,?)")
        .run(recordId, newLow || null, newEst || null, newHigh || null, now);
    }
  };

  if (record.id) {
    db.prepare(`UPDATE records SET artist=@artist,title=@title,label=@label,cat_no=@cat_no,runout=@runout,barcode=@barcode,
      country=@country,year=@year,format=@format,discs=@discs,genre=@genre,style=@style,vinyl_cond=@vinyl_cond,
      jacket_cond=@jacket_cond,low_value=@low_value,est_value=@est_value,high_value=@high_value,
      location=@location,rating=@rating,notes=@notes,tracks=@tracks,images=@images,
      num_tracks=@num_tracks,record_size=@record_size,rpm=@rpm,channels=@channels,
      updated_on=@updated_on,updated_by=@updated_by WHERE id=@id`).run(d);
    snapshotValue(record.id, record.low_value, record.est_value, record.high_value);
    return record.id;
  }
  const newId = db.prepare(`INSERT INTO records (artist,title,label,cat_no,runout,barcode,country,year,format,discs,genre,style,
    vinyl_cond,jacket_cond,low_value,est_value,high_value,location,rating,notes,tracks,images,
    num_tracks,record_size,rpm,channels,added_on,updated_on,updated_by)
    VALUES (@artist,@title,@label,@cat_no,@runout,@barcode,@country,@year,@format,@discs,@genre,@style,
    @vinyl_cond,@jacket_cond,@low_value,@est_value,@high_value,@location,@rating,@notes,@tracks,@images,
    @num_tracks,@record_size,@rpm,@channels,@added_on,@updated_on,@updated_by)`).run(d).lastInsertRowid;
  snapshotValue(newId, record.low_value, record.est_value, record.high_value);
  return newId;
});

ipcMain.handle("records:getValueHistory", (event, recordId) => {
  requireSession(event);
  return db.prepare("SELECT low_value, est_value, high_value, recorded_on FROM value_history WHERE record_id=? ORDER BY recorded_on ASC").all(recordId);
});

ipcMain.handle("records:delete", (event, id) => {
  requireSession(event);
  db.prepare("DELETE FROM records WHERE id=?").run(id);
  return true;
});

ipcMain.handle("records:findByBarcode", (event, barcode) => {
  requireSession(event);
  const all = db.prepare("SELECT * FROM records").all();
  const match = all.find(r => r.barcode === barcode || r.cat_no === barcode || r.runout === barcode);
  if (!match) return null;
  // Log a play automatically on every barcode scan
  const session = sessions.get(event.sender.id);
  const now = new Date().toISOString().replace("T", " ").substring(0, 19);
  db.prepare("INSERT INTO listening_history (record_id, played_at, played_by) VALUES (?,?,?)").run(match.id, now, session?.username || "");
  return { ...match, tracks: JSON.parse(match.tracks || "[]"), images: JSON.parse(match.images || "[]") };
});

// Log a play manually (from Now Playing button in RecordModal)
ipcMain.handle("records:logPlay", (event, recordId) => {
  requireSession(event);
  const session = sessions.get(event.sender.id);
  const now = new Date().toISOString().replace("T", " ").substring(0, 19);
  db.prepare("INSERT INTO listening_history (record_id, played_at, played_by) VALUES (?,?,?)").run(recordId, now, session?.username || "");
  return { ok: true };
});

// Get listening history for a record
ipcMain.handle("records:getListeningHistory", (event, recordId) => {
  requireSession(event);
  return db.prepare("SELECT played_at, played_by FROM listening_history WHERE record_id=? ORDER BY played_at DESC LIMIT 50").all(recordId);
});

// Get overall listening history for stats
ipcMain.handle("records:getListeningStats", (event) => {
  requireSession(event);
  const recentPlays = db.prepare(`
    SELECT lh.played_at, lh.played_by, r.id, r.artist, r.title, r.images
    FROM listening_history lh
    JOIN records r ON r.id = lh.record_id
    ORDER BY lh.played_at DESC LIMIT 20
  `).all();
  const mostPlayed = db.prepare(`
    SELECT r.id, r.artist, r.title, r.images, COUNT(*) as play_count,
           MAX(lh.played_at) as last_played
    FROM listening_history lh
    JOIN records r ON r.id = lh.record_id
    GROUP BY lh.record_id ORDER BY play_count DESC LIMIT 10
  `).all();
  const totalPlays = db.prepare("SELECT COUNT(*) as c FROM listening_history").get()?.c || 0;
  return { recentPlays, mostPlayed, totalPlays };
});

// ── Discogs API ───────────────────────────────────────────────────────────────
ipcMain.handle("discogs:lookupBarcode", async (event, barcode) => {
  requireSession(event);
  const token = getDiscogsToken();
  if (!token) return { ok: false, error: "No Discogs token set. Add it in Settings." };
  try {
    const data = await fetchJSON(`https://api.discogs.com/database/search?barcode=${encodeURIComponent(barcode)}&per_page=10`, token);
    if (!data.results?.length) return { ok: false, error: "No results found on Discogs for this barcode." };
    return { ok: true, results: data.results.map(r => ({
      discogs_id: r.id, type: r.type, title: r.title, year: r.year,
      label: r.label?.[0] || "", format: r.format?.[0] || "",
      country: r.country || "", catno: r.catno || "",
      thumb: r.thumb || "", resource_url: r.resource_url
    })) };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle("discogs:getRelease", async (event, { resourceUrl }) => {
  requireSession(event);
  const token = getDiscogsToken();
  if (!token) return { ok: false, error: "No Discogs token set." };
  try {
    const release = await fetchJSON(resourceUrl, token);
    const parsed = parseDiscogsRelease(release);
    let pricing = null;
    try {
      const releaseId = release.id;
      if (releaseId) {
        const priceData = await fetchJSON(`https://api.discogs.com/marketplace/price_suggestions/${releaseId}`, token);
        if (priceData && typeof priceData === "object" && !priceData.message) {
          const condMap = {};
          for (const [cond, data] of Object.entries(priceData)) {
            if (data?.value) condMap[cond] = data.value;
          }
          const vals = Object.values(condMap).sort((a, b) => a - b);
          if (vals.length) {
            const nmVal  = condMap["Near Mint (NM or M-)"] || condMap["Mint (M)"];
            const vgpVal = condMap["Very Good Plus (VG+)"];
            const vgVal  = condMap["Very Good (VG)"];
            pricing = {
              low_value:  vals[0].toFixed(2),
              est_value:  (vgpVal || vgVal || vals[Math.floor(vals.length / 2)]).toFixed(2),
              high_value: (nmVal  || vals[vals.length - 1]).toFixed(2)
            };
          }
        } else if (release.lowest_price != null) {
          pricing = { low_value: "", est_value: parseFloat(release.lowest_price).toFixed(2), high_value: "" };
        }
      }
    } catch {}
    return { ok: true, data: { ...parsed, ...(pricing || {}) } };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle("discogs:search", async (event, { query }) => {
  requireSession(event);
  const token = getDiscogsToken();
  if (!token) return { ok: false, error: "No Discogs token set. Add it in Settings." };
  try {
    const data = await fetchJSON(`https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&type=release&per_page=10`, token);
    if (!data.results?.length) return { ok: false, error: "No results found." };
    return { ok: true, results: data.results.map(r => ({
      discogs_id: r.id, title: r.title, year: r.year,
      label: r.label?.[0] || "", format: r.format?.[0] || "",
      country: r.country || "", catno: r.catno || "",
      thumb: r.thumb || "", resource_url: r.resource_url
    })) };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle("discogs:fetchImageBase64", async (event, { url, token }) => {
  requireSession(event);
  return new Promise((resolve) => {
    const opts = {
      headers: { "User-Agent": "VinylLibraryApp/1.0", "Authorization": `Discogs token=${token}` }
    };
    https.get(url, opts, res => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers["content-type"] || "image/jpeg";
        resolve(`data:${contentType};base64,${buffer.toString("base64")}`);
      });
      res.on("error", () => resolve(null));
    }).on("error", () => resolve(null));
  });
});

// ── Bulk Artwork Fetch ───────────────────────────────────────────────────────
ipcMain.handle("discogs:fetchMissingArtwork", async (event, { overwrite }) => {
  requireSession(event);
  const token = getDiscogsToken();
  if (!token) return { ok: false, error: "No Discogs token set. Add it in Settings → Connections." };

  const records = db.prepare("SELECT id, artist, title, images FROM records ORDER BY artist").all();
  const toProcess = overwrite
    ? records
    : records.filter(r => {
        try { return !JSON.parse(r.images || "[]").some(Boolean); }
        catch { return true; }
      });

  const delay = ms => new Promise(r => setTimeout(r, ms));
  let updated = 0, failed = 0;

  for (const rec of toProcess) {
    try {
      // Search Discogs
      const q = encodeURIComponent(`${rec.artist} ${rec.title}`.trim());
      const searchData = await fetchJSON(`https://api.discogs.com/database/search?q=${q}&type=release&per_page=5`, token);
      await delay(1100);

      const result = searchData.results?.[0];
      if (!result?.resource_url) { failed++; continue; }

      // Get release details for images
      const release = await fetchJSON(result.resource_url, token);
      await delay(1100);

      const imageUrls = (release.images || [])
        .filter(i => i.uri)
        .sort((a, b) => (a.type === "primary" ? -1 : 1))
        .slice(0, 4)
        .map(i => i.uri);

      if (!imageUrls.length && result.thumb) imageUrls.push(result.thumb);
      if (!imageUrls.length) { failed++; continue; }

      // Fetch images as base64
      const images = [null, null, null, null];
      for (let i = 0; i < Math.min(imageUrls.length, 4); i++) {
        images[i] = await new Promise(resolve => {
          const opts = { headers: { "User-Agent": "VinylLibraryApp/1.0", "Authorization": `Discogs token=${token}` } };
          https.get(imageUrls[i], opts, res => {
            const chunks = [];
            res.on("data", c => chunks.push(c));
            res.on("end", () => {
              const ct = res.headers["content-type"] || "image/jpeg";
              resolve(`data:${ct};base64,${Buffer.concat(chunks).toString("base64")}`);
            });
            res.on("error", () => resolve(null));
          }).on("error", () => resolve(null));
        });
        await delay(600);
      }

      // Merge with existing if not overwriting
      if (!overwrite) {
        try {
          const existing = JSON.parse(rec.images || "[]");
          for (let i = 0; i < 4; i++) {
            if (existing[i]) images[i] = existing[i];
          }
        } catch {}
      }

      db.prepare("UPDATE records SET images=? WHERE id=?").run(JSON.stringify(images), rec.id);
      updated++;

      // Send progress to renderer
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) win.webContents.send("artwork:progress", { updated, total: toProcess.length, artist: rec.artist, title: rec.title });

    } catch (e) {
      failed++;
    }
  }

  return { ok: true, updated, failed, total: toProcess.length };
});

// ── Discogs Collection Import ─────────────────────────────────────────────────
ipcMain.handle("discogs:importCollection", async (event, { username }) => {
  requireSession(event);
  const token = getDiscogsToken();
  if (!token) return { ok: false, error: "No Discogs token set. Add it in Settings." };
  try {
    const releases = [];
    let page = 1;
    while (true) {
      const data = await fetchJSON(
        `https://api.discogs.com/users/${encodeURIComponent(username)}/collection/folders/0/releases?per_page=100&page=${page}`,
        token
      );
      if (!data.releases?.length) break;
      for (const item of data.releases) {
        releases.push({ title: item.basic_information?.title || "", resource_url: item.basic_information?.resource_url || "" });
      }
      if (data.pagination?.page >= data.pagination?.pages) break;
      page++;
    }
    if (!releases.length) return { ok: false, error: `No releases found in ${username}'s collection.` };
    return { ok: true, releases };
  } catch (e) { return { ok: false, error: e.message }; }
});

// ── Album Detail Window ───────────────────────────────────────────────────────
ipcMain.handle("album:openDetail", (event, recordId) => {
  requireSession(event);
  if (detailWindows.has(recordId)) { detailWindows.get(recordId).focus(); return; }
  const rec = db.prepare("SELECT * FROM records WHERE id=?").get(recordId);
  if (!rec) return;
  rec.tracks = JSON.parse(rec.tracks || "[]");
  rec.images = JSON.parse(rec.images || "[]");

  // Preserve main window state before opening detail
  const wasMaximized = mainWin?.isMaximized();
  const wasFullScreen = mainWin?.isFullScreen();

  const win = new BrowserWindow({
    width: 760, height: 620, minWidth: 600, minHeight: 500,
    backgroundColor: "#0d0d1a", title: "Album Detail",
    parent: mainWin || undefined,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false }
  });

  // Restore main window state after detail opens
  win.once("ready-to-show", () => {
    if (mainWin) {
      if (wasFullScreen) mainWin.setFullScreen(true);
      else if (wasMaximized) mainWin.maximize();
    }
  });

  detailWindows.set(recordId, win);
  win.on("closed", () => detailWindows.delete(recordId));
  isDev ? win.loadURL(`http://localhost:5173/#/detail`) : win.loadFile(path.join(__dirname, "../dist/index.html"), { hash: "/detail" });
  win.webContents.once("did-finish-load", () => win.webContents.send("album:data", rec));
});

ipcMain.handle("album:getData", () => null);

// ── Backup / Restore ──────────────────────────────────────────────────────────
ipcMain.handle("backup:save", async (event) => {
  requireSession(event);
  const win = BrowserWindow.fromWebContents(event.sender);
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: "Save Backup", defaultPath: `vinyl_backup_${new Date().toISOString().slice(0,10)}.json`,
    filters: [{ name: "JSON Backup", extensions: ["json"] }]
  });
  if (canceled || !filePath) return { ok: false };
  const records = db.prepare("SELECT * FROM records").all();
  const recordsJson = JSON.stringify(records);
  const sig = signData(recordsJson);
  fs.writeFileSync(filePath, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), sig, records }, null, 2), "utf8");
  return { ok: true, filePath };
});

ipcMain.handle("backup:restore", async (event) => {
  requireSession(event, "admin");
  const win = BrowserWindow.fromWebContents(event.sender);
  const { filePaths, canceled } = await dialog.showOpenDialog(win, {
    title: "Restore Backup", filters: [{ name: "JSON Backup", extensions: ["json"] }], properties: ["openFile"]
  });
  if (canceled || !filePaths.length) return { ok: false };
  try {
    const stat = fs.statSync(filePaths[0]);
    if (stat.size > 50 * 1024 * 1024) return { ok: false, error: "Backup file is too large (max 50 MB)." };
    const data = JSON.parse(fs.readFileSync(filePaths[0], "utf8"));
    if (!Array.isArray(data.records)) return { ok: false, error: "Invalid backup file." };
    if (data.sig) {
      const expected = signData(JSON.stringify(data.records));
      const sigBuf = Buffer.from(data.sig, "hex");
      const expBuf = Buffer.from(expected, "hex");
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return { ok: false, error: "Backup integrity check failed. The file may have been tampered with." };
      }
    }
    const sanitized = data.records.map(sanitizeRecord);
    const insert = db.prepare(`INSERT OR REPLACE INTO records (id,artist,title,label,cat_no,runout,barcode,country,year,format,discs,genre,
      vinyl_cond,jacket_cond,low_value,est_value,high_value,location,rating,notes,tracks,images,added_on,updated_on,updated_by)
      VALUES (@id,@artist,@title,@label,@cat_no,@runout,@barcode,@country,@year,@format,@discs,@genre,@vinyl_cond,@jacket_cond,
      @low_value,@est_value,@high_value,@location,@rating,@notes,@tracks,@images,@added_on,@updated_on,@updated_by)`);
    const tx = db.transaction(records => { for (const r of records) insert.run(r); });
    tx(sanitized);
    return { ok: true, count: sanitized.length };
  } catch (e) { return { ok: false, error: e.message }; }
});

// ── Export CSV ────────────────────────────────────────────────────────────────
ipcMain.handle("records:exportCSV", async (event) => {
  requireSession(event);
  const win = BrowserWindow.fromWebContents(event.sender);
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: "Export Vinyl Crate Digger", defaultPath: "vinyl_crate_digger.csv",
    filters: [{ name: "CSV Files", extensions: ["csv"] }]
  });
  if (canceled || !filePath) return { ok: false };
  const rows = db.prepare("SELECT * FROM records ORDER BY artist").all();
  const esc = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
  const headers = ["Artist","Title","Label","CAT #","Runout #","Country","Year","Format","# Discs","Genre",
    "Vinyl Cond","Jacket Cond","Low Value","Est Value","High Value","Location","Rating","Notes","Tracks","Total Time","Added On","Updated On","Updated By"];
  const lines = rows.map(r => {
    const tracks = JSON.parse(r.tracks||"[]");
    const total = tracks.reduce((a,t)=>a+(parseInt(t.mins)||0)*60+(parseInt(t.secs)||0),0);
    const dur = total?`${Math.floor(total/60)}:${String(total%60).padStart(2,"0")}` : "";
    const trackStr = tracks.filter(t=>t.title).map((t,i)=>`${i+1}. ${t.title}${t.mins||t.secs?` (${t.mins||0}:${String(t.secs||0).padStart(2,"0")})`:""}` ).join("; ");
    return [r.artist,r.title,r.label,r.cat_no,r.runout,r.country,r.year,r.format,r.discs,r.genre,
      r.vinyl_cond,r.jacket_cond,r.low_value,r.est_value,r.high_value,r.location,r.rating,r.notes,
      trackStr,dur,r.added_on,r.updated_on,r.updated_by].map(esc).join(",");
  });
  fs.writeFileSync(filePath, [headers.map(esc).join(","),...lines].join("\n"), "utf8");
  return { ok: true };
});

// ── MusicBrainz ───────────────────────────────────────────────────────────────
ipcMain.handle("musicbrainz:search", async (event, query) => {
  requireSession(event);
  return new Promise((resolve) => {
    const url = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(query)}&fmt=json&limit=10`;
    const opts = { headers: { "User-Agent": "VinylLibraryApp/1.0 (vinyl@example.com)" } };
    https.get(url, opts, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const results = (json.releases || []).map(r => ({
            id: r.id, title: r.title,
            artist: (r["artist-credit"] || []).map(a => a.artist?.name || "").filter(Boolean).join(", "),
            year: r.date ? r.date.slice(0, 4) : "",
            country: r.country || "",
            label: r["label-info"]?.[0]?.label?.name || "",
            format: r.media?.[0]?.format || "",
            tracks: r.media?.[0]?.["track-count"] || null,
          }));
          resolve({ ok: true, results });
        } catch (e) { resolve({ ok: false, error: e.message }); }
      });
    }).on("error", e => resolve({ ok: false, error: e.message }));
  });
});

ipcMain.handle("musicbrainz:getRelease", async (event, releaseId) => {
  requireSession(event);
  return new Promise((resolve) => {
    const url = `https://musicbrainz.org/ws/2/release/${releaseId}?inc=artists+labels+recordings+release-groups&fmt=json`;
    const opts = { headers: { "User-Agent": "VinylLibraryApp/1.0 (vinyl@example.com)" } };
    https.get(url, opts, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const r = JSON.parse(data);
          const tracks = (r.media?.[0]?.tracks || []).map(t => {
            const ms = t.length || 0;
            const mins = Math.floor(ms / 60000);
            const secs = Math.floor((ms % 60000) / 1000);
            return { title: t.title || "", mins: String(mins), secs: String(secs).padStart(2,"0") };
          });
          resolve({ ok: true, data: {
            artist:  (r["artist-credit"] || []).map(a => a.artist?.name || "").filter(Boolean).join(", "),
            title:   r.title || "",
            label:   r["label-info"]?.[0]?.label?.name || "",
            cat_no:  r["label-info"]?.[0]?.["catalog-number"] || "",
            country: r.country || "",
            year:    r.date ? r.date.slice(0, 4) : "",
            format:  r.media?.[0]?.format || "LP",
            discs:   r.media?.length || 1,
            tracks,
          }});
        } catch (e) { resolve({ ok: false, error: e.message }); }
      });
    }).on("error", e => resolve({ ok: false, error: e.message }));
  });
});

// ── ListenBrainz ──────────────────────────────────────────────────────────────
// ── Lyrics ───────────────────────────────────────────────────────────────────
function getGeniusToken() {
  const row = db.prepare("SELECT value FROM settings WHERE key='genius_token'").get();
  return row?.value ? decryptValue(row.value) : null;
}

async function fetchLyricsFromOvh(artist, title) {
  try {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    const data = await fetchJSON(url);
    if (data?.lyrics && data.lyrics.trim()) return { lyrics: data.lyrics.trim(), source: "lyrics.ovh" };
    return { reason: data?.error || data?.message || "No lyrics in response" };
  } catch(e) { return { reason: e.message || "Request failed" }; }
}

async function fetchLyricsFromChartLyrics(artist, title) {
  try {
    const searchUrl = `http://api.chartlyrics.com/apiv1.asmx/SearchLyricDirect?artist=${encodeURIComponent(artist)}&song=${encodeURIComponent(title)}`;
    const result = await new Promise((resolve, reject) => {
      http.get(searchUrl, { headers: { "User-Agent": "VinylLibraryApp/1.0" } }, res => {
        let data = "";
        res.on("data", c => data += c);
        res.on("end", () => resolve(data));
      }).on("error", reject);
    });
    const match = result.match(/<Lyric>([\s\S]*?)<\/Lyric>/);
    if (match && match[1] && match[1].trim() && match[1].trim() !== "Not found") {
      return { lyrics: match[1].trim(), source: "ChartLyrics" };
    }
    // Try to extract any error message from XML
    const errMatch = result.match(/<string[^>]*>([\s\S]*?)<\/string>/);
    const reason = errMatch?.[1]?.trim() || match?.[1]?.trim() || "No lyrics in response";
    return { reason };
  } catch(e) { return { reason: e.message || "Request failed" }; }
}

async function fetchLyricsFromGenius(artist, title, token) {
  try {
    const query = encodeURIComponent(`${artist} ${title}`);
    const data = await fetchJSON(
      `https://api.genius.com/search?q=${query}`,
      null,
      { "Authorization": `Bearer ${token}` }
    );
    if (!data?.response?.hits) {
      console.log("[Genius] No hits in response:", JSON.stringify(data).substring(0, 200));
      return null;
    }
    const hit = data.response.hits.find(h =>
      h.type === "song" &&
      h.result?.primary_artist?.name?.toLowerCase().includes(artist.toLowerCase().split(" ")[0])
    ) || data.response.hits[0];
    if (!hit) {
      console.log("[Genius] No matching hit for:", artist, title);
      return null;
    }
    return { url: hit.result.url, title: hit.result.full_title, source: "genius" };
  } catch(e) {
    console.log("[Genius] Error:", e.message);
    return null;
  }
}

ipcMain.handle("lyrics:get", async (event, { recordId, trackIndex, artist, title }) => {
  // Check cache first
  const cached = db.prepare("SELECT lyrics, source FROM lyrics_cache WHERE record_id=? AND track_index=?").get(recordId, trackIndex);
  if (cached?.lyrics) return { ok: true, lyrics: cached.lyrics, source: cached.source, cached: true };

  const now = new Date().toISOString().replace("T", " ").substring(0, 19);
  const searchLog = [];

  // 1. Try lyrics.ovh (free, no key, returns raw text)
  const ovh = await fetchLyricsFromOvh(artist, title);
  if (ovh?.lyrics) {
    db.prepare("INSERT OR REPLACE INTO lyrics_cache (record_id, track_index, track_title, lyrics, source, fetched_at) VALUES (?,?,?,?,?,?)")
      .run(recordId, trackIndex, title, ovh.lyrics, ovh.source, now);
    return { ok: true, lyrics: ovh.lyrics, source: ovh.source };
  }
  searchLog.push(`lyrics.ovh — ${ovh?.reason || "No lyrics found"}`);

  // 2. Try ChartLyrics (free, no key, returns raw text)
  const chart = await fetchLyricsFromChartLyrics(artist, title);
  if (chart?.lyrics) {
    db.prepare("INSERT OR REPLACE INTO lyrics_cache (record_id, track_index, track_title, lyrics, source, fetched_at) VALUES (?,?,?,?,?,?)")
      .run(recordId, trackIndex, title, chart.lyrics, chart.source, now);
    return { ok: true, lyrics: chart.lyrics, source: chart.source };
  }
  searchLog.push(`ChartLyrics — ${chart?.reason || "No lyrics found"}`);

  // 3. Try Genius (returns URL only — user can open and paste)
  const token = getGeniusToken();
  if (token) {
    const genius = await fetchLyricsFromGenius(artist, title, token);
    if (genius) return { ok: true, lyrics: null, geniusUrl: genius.url, geniusTitle: genius.title, source: "genius", searchLog };
    searchLog.push("Genius — No match found");
  } else {
    searchLog.push("Genius — No token configured");
  }

  // 4. Not found anywhere
  return { ok: false, error: "Lyrics not found", searchLog };
});

ipcMain.handle("lyrics:testGenius", async (event) => {
  requireSession(event);
  const token = getGeniusToken();
  if (!token) return { ok: false, error: "No token found" };
  try {
    const query = encodeURIComponent("Third Eye Blind Semi-Charmed Life");
    const data = await fetchJSON(
      `https://api.genius.com/search?q=${query}`,
      null,
      { "Authorization": `Bearer ${token}` }
    );
    return { ok: true, data };
  } catch(e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle("lyrics:save", (event, { recordId, trackIndex, trackTitle, lyrics }) => {
  const now = new Date().toISOString().replace("T", " ").substring(0, 19);
  db.prepare("INSERT OR REPLACE INTO lyrics_cache (record_id, track_index, track_title, lyrics, source, fetched_at) VALUES (?,?,?,?,?,?)")
    .run(recordId, trackIndex, trackTitle, lyrics, "manual", now);
  return { ok: true };
});

ipcMain.handle("lyrics:getCachedTracks", (event, recordId) => {
  const rows = db.prepare("SELECT track_index FROM lyrics_cache WHERE record_id=? AND lyrics IS NOT NULL AND lyrics != ''").all(recordId);
  return rows.map(r => r.track_index);
});

ipcMain.handle("lyrics:delete", (event, { recordId, trackIndex }) => {
  db.prepare("DELETE FROM lyrics_cache WHERE record_id=? AND track_index=?").run(recordId, trackIndex);
  return { ok: true };
});

ipcMain.handle("listenbrainz:scrobble", async (event, { token, artist, title, album }) => {
  requireSession(event);
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      listen_type: "single",
      payload: [{ listened_at: Math.floor(Date.now() / 1000), track_metadata: { artist_name: artist, track_name: title, release_name: album } }]
    });
    const opts = {
      hostname: "api.listenbrainz.org", path: "/1/submit-listens", method: "POST",
      headers: { "Authorization": `Token ${token}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), "User-Agent": "VinylLibraryApp/1.0" }
    };
    const req = https.request(opts, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => res.statusCode === 200 ? resolve({ ok: true }) : resolve({ ok: false, error: `ListenBrainz returned ${res.statusCode}` }));
    });
    req.on("error", e => resolve({ ok: false, error: e.message }));
    req.write(payload);
    req.end();
  });
});
