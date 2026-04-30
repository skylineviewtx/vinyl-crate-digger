const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Auth
  login:                (creds)         => ipcRenderer.invoke("auth:login", creds),
  logout:               ()              => ipcRenderer.invoke("auth:logout"),
  changePassword:       (data)          => ipcRenderer.invoke("auth:changePassword", data),
  // Settings
  getSetting:           (key)           => ipcRenderer.invoke("settings:get", key),
  setSetting:           (key, value)    => ipcRenderer.invoke("settings:set", { key, value }),
  // User management
  getUsers:             ()              => ipcRenderer.invoke("users:getAll"),
  getMyProfile:         ()              => ipcRenderer.invoke("users:getMyProfile"),
  createUser:           (data)          => ipcRenderer.invoke("users:create", data),
  resetUserPassword:    (data)          => ipcRenderer.invoke("users:resetPassword", data),
  deleteUser:           (data)          => ipcRenderer.invoke("users:delete", data),
  updateProfile:        (data)          => ipcRenderer.invoke("users:updateProfile", data),
  getWelcomeData:       ()              => ipcRenderer.invoke("users:welcomeData"),
  // Records
  getRecords:           ()              => ipcRenderer.invoke("records:getAll"),
  saveRecord:           (record)        => ipcRenderer.invoke("records:save", record),
  deleteRecord:         (id)            => ipcRenderer.invoke("records:delete", id),
  getValueHistory:      (id)            => ipcRenderer.invoke("records:getValueHistory", id),
  getListeningHistory:  (id)            => ipcRenderer.invoke("records:getListeningHistory", id),
  getListeningStats:    ()              => ipcRenderer.invoke("records:getListeningStats"),
  logPlay:              (id)            => ipcRenderer.invoke("records:logPlay", id),
  // Lyrics
  testGenius:           ()              => ipcRenderer.invoke("lyrics:testGenius"),
  getLyrics:            (data)          => ipcRenderer.invoke("lyrics:get", data),
  saveLyrics:           (data)          => ipcRenderer.invoke("lyrics:save", data),
  deleteLyrics:         (data)          => ipcRenderer.invoke("lyrics:delete", data),
  getCachedLyricsTracks:(id)            => ipcRenderer.invoke("lyrics:getCachedTracks", id),
  exportCSV:            ()              => ipcRenderer.invoke("records:exportCSV"),
  findByBarcode:        (barcode)       => ipcRenderer.invoke("records:findByBarcode", barcode),
  // Discogs
  discogsLookupBarcode: (barcode)       => ipcRenderer.invoke("discogs:lookupBarcode", barcode),
  discogsGetRelease:    (data)          => ipcRenderer.invoke("discogs:getRelease", data),
  discogsSearch:        (data)          => ipcRenderer.invoke("discogs:search", data),
  discogsFetchImage:    (url, token)    => ipcRenderer.invoke("discogs:fetchImageBase64", { url, token }),
  discogsImportCollection: (data)      => ipcRenderer.invoke("discogs:importCollection", data),
  discogsFetchMissingArtwork: (data)   => ipcRenderer.invoke("discogs:fetchMissingArtwork", data),
  onArtworkProgress: (cb)              => ipcRenderer.on("artwork:progress", (_, data) => cb(data)),
  // Menu events
  onMenu: (channel, cb) => ipcRenderer.on(channel, (_, ...args) => cb(...args)),
  // Album detail window
  openAlbumDetail:      (id)            => ipcRenderer.invoke("album:openDetail", id),
  onAlbumData:          (cb)            => ipcRenderer.on("album:data", (_, data) => cb(data)),
  // Backup / Restore
  backupSave:           ()              => ipcRenderer.invoke("backup:save"),
  backupRestore:        ()              => ipcRenderer.invoke("backup:restore"),
  // MusicBrainz
  musicbrainzSearch:    (query)         => ipcRenderer.invoke("musicbrainz:search", query),
  musicbrainzGetRelease:(id)            => ipcRenderer.invoke("musicbrainz:getRelease", id),
  // ListenBrainz
  listenbrainzScrobble: (data)          => ipcRenderer.invoke("listenbrainz:scrobble", data),
});
