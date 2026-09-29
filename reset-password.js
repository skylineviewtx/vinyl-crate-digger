const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const db = new Database("C:\\Users\\Clayton\\AppData\\Roaming\\vinyl-library\\vinyl.db");

const username = "admin"; // change if resetting a different user
const newPassword = "TempPass123!"; // pick something meeting your 6-char + number/special rule

const hash = bcrypt.hashSync(newPassword, 10);
db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1 WHERE username = ?")
  .run(hash, username);

console.log(`Password for "${username}" reset. Temp password: ${newPassword}`);