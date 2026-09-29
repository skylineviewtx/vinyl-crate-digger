# Setup Guide

There are two ways to get Vinyl Crate Digger running. Most people should use **Install the app**. **Build from source** is for anyone who wants to change the code.

---

## Install the app

1. Go to the [Releases page](https://github.com/skylineviewtx/vinyl-crate-digger/releases) and download the `Setup .exe` file from the latest release.
2. Double-click it to install.
3. Windows may show a blue **"Windows protected your PC"** screen, because the app isn't code-signed. Click **More info**, then **Run anyway**.
4. Open **Vinyl Crate Digger** from the Start menu.

To update later, download the newer installer and run it. It replaces the old version and keeps your collection.

---

## First run

1. Sign in with:
   - **Username:** `admin`
   - **Password:** `vinyl123`
2. You'll be asked to choose a new password right away. Passwords need at least 6 characters, including at least one number or symbol.
3. **Set up a recovery code.** Go to **Settings → Account → Recovery code** and click **Generate recovery code**. Write the code down and keep it somewhere safe. If you ever forget your password, click **Forgot password?** on the sign-in screen and enter this code. The code keeps working until you generate a new one.
4. **Add your connections** (optional) in **Settings → Connections**:

| Service | What it does | Where to get a token |
|---|---|---|
| Discogs | Record lookups, pricing, collection import, artwork | discogs.com → Settings → Developers → Generate token |
| ListenBrainz | Scrobbles records you play in Now Playing | listenbrainz.org → your profile → User token |
| Genius | Lyrics search (a free fallback works without it) | genius.com/api-clients → New API client → Client access token |

MusicBrainz lookups work without a token.

### Other users

Admins can add accounts in **Settings → Users**. Each person can generate their own recovery code once they sign in.

### Barcode scanners

Any USB or Bluetooth scanner that acts like a keyboard will work. To test yours, open Notepad and scan a barcode: the numbers should appear and the cursor should move to a new line. If there's no new line, check your scanner's manual for the setup barcode that adds an "Enter" (CR) suffix.

---

## Build from source

### Requirements

- Windows 10 or 11
- [Git](https://git-scm.com/)
- **Node.js 20 LTS.** Use version 20 specifically. Newer versions break the database library. The easiest way to get it is [nvm-windows](https://github.com/coreybutler/nvm-windows/releases):
  ```powershell
  nvm install 20
  nvm use 20
  node -v
  ```

### Get the code and run it

```powershell
git clone https://github.com/skylineviewtx/vinyl-crate-digger.git
cd vinyl-crate-digger
npm install --legacy-peer-deps
npm run dev
```

> **Important:** Always install with `npm install --legacy-peer-deps`. **Never run `npm audit fix --force`.** It upgrades Electron and breaks the build.

### Build your own installer

1. Update `"version"` in `package.json`.
2. Close any running copy of the app.
3. Run:
   ```powershell
   npm run dist:win
   ```
4. The installer appears in the `dist-app` folder.

The first build downloads extra tools and takes a few minutes.

---

## Troubleshooting

**"'node' is not recognized"**
Node.js isn't installed, or PowerShell was opened before it was installed. Install Node 20 (see Requirements), then open a new PowerShell window.

**"running scripts is disabled on this system"**
Run this once, then try again:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**"was compiled against a different Node.js version" / `NODE_MODULE_VERSION` error**
The database library needs rebuilding for Electron:
```powershell
npx electron-rebuild -f -w better-sqlite3
```

**"Cannot create symbolic link" or "A required privilege is not held" during `npm run dist:win`**
Run PowerShell as Administrator, or turn on **Developer Mode** in Windows Settings → System → For developers.

**Forgot your password and don't have a recovery code**
If you have the source code set up, close the app and run this from the project folder. It resets `admin` to `vinyl123` and asks for a new password at next sign-in:
```powershell
$env:ELECTRON_RUN_AS_NODE=1; npx electron reset-admin.js; Remove-Item Env:ELECTRON_RUN_AS_NODE
```
Close that PowerShell window afterward before running the app again.

---

## Your data

Everything is stored in one file:

```
%APPDATA%\vinyl-library\vinyl.db
```

- **Back up** with **Settings → Backup**, or copy that file while the app is closed.
- **Move to a new computer** by copying `vinyl.db` into the same folder on the new machine before first launch. Also copy `vinyl.db-wal` and `vinyl.db-shm` if they exist.
- **Start over** by closing the app and deleting or renaming `vinyl.db`. A fresh, empty library is created on the next launch. This permanently removes your collection unless you have a backup.
