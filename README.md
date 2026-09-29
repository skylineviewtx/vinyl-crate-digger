# Vinyl Crate Digger

A desktop app for cataloging and enjoying your vinyl record collection. Built for Windows with Electron, React, and SQLite. Everything is stored locally on your own computer.

## Features

- **Your collection, your way.** Browse records in a grid of album covers or a sortable list, search by artist, title, or barcode, and filter by genre, format, or condition.
- **Automatic record details.** Look up releases on Discogs or MusicBrainz by barcode or title to fill in tracklists, labels, catalog numbers, and artwork.
- **Barcode scanner support.** Works with any USB or Bluetooth barcode scanner that types like a keyboard.
- **Discogs import.** Pull in your entire Discogs collection, with options for handling records you already have.
- **Now Playing.** Scan a record to pull it up and scrobble it to ListenBrainz.
- **Lyrics.** Look up lyrics for tracks (Genius token optional).
- **Stats.** Collection overview, genre and format breakdowns, condition summaries, top rated, and duplicate finder.
- **Make it yours.** Themes, fonts, animation settings, and editable lists for genres, styles, formats, and storage locations.
- **Multiple users.** Admin and standard accounts, with a recovery code for password resets.
- **Backup and restore** to a JSON file.

## Getting started

**Just want to use it?** Download the latest installer from the [Releases page](https://github.com/skylineviewtx/vinyl-crate-digger/releases) and follow the "Install the app" section of [SETUP.md](SETUP.md). No programming tools needed.

**Want to build it yourself?** See "Build from source" in [SETUP.md](SETUP.md).

Either way, the app starts with an empty library. Your records are never shared with anyone.

## Built with

Electron 29, React 18, Vite 5, better-sqlite3, and Node.js 20 LTS.

## Where your data lives

The app keeps its database at:

```
%APPDATA%\vinyl-library\vinyl.db
```

This file holds your records, artwork, user accounts, and settings. It is not part of the app's install folder, so installing, updating, or uninstalling the app leaves it untouched. Use **Settings → Backup** to save a copy of your collection.

## License

Vinyl Crate Digger is **source available** under the [PolyForm Noncommercial License 1.0.0](LICENSE). You're free to use, modify, and share it for personal and other noncommercial purposes.

**Commercial use is not permitted without a separate license.** If you'd like to use this project commercially, contact clayton@claytonjkucera.com.

Copyright (c) 2026 Clayton Kucera.
