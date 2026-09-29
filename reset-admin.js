// reset-admin.js — resets the Vinyl Library "admin" password to vinyl123
// and forces a password change on next login.
//
// Run from the project folder with Electron acting as Node, so the
// Electron-built better-sqlite3 binary loads without a rebuild:
//
//   $env:ELECTRON_RUN_AS_NODE=1; npx electron reset-admin.js; Remove-Item Env:ELECTRON_RUN_AS_NODE
//
// Close the Vinyl Library app before running.

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const dbPath = path.join(process.env.APPDATA || "", "vinyl-library", "vinyl.db");

if (!fs.existsSync(dbPath)) {
  console.error("Database not found at: " + dbPath);
  process.exit(1);
}

const db = new Database(dbPath);
const hash = bcrypt.hashSync("vinyl123", 10);

const admin = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");

if (admin) {
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1 WHERE username = ?")
    .run(hash, "admin");
  console.log("Admin password reset to: vinyl123");
} else {
  db.prepare("INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?,?,?,?)")
    .run("admin", hash, "admin", 1);
  console.log("No admin user found, so one was created with password: vinyl123");
}

console.log("You'll be asked to choose a new password on next login.");
db.close();
