import React, { useState, useEffect } from "react";
import { EMPTY_RECORD } from "./shared";
import { setVolume, getVolume, getSoundConfigs, setSoundConfig, saveSoundConfig, loadSoundConfigs, previewSound, SOUND_DEFAULTS, startCrackle, stopCrackle } from "../sounds";
import { C } from "./shared";
import ThemeTab from "./ThemeTab";
import FontTab from "./FontTab";

const sinp = {
  fontSize: 13, padding: "7px 10px", border: `1px solid ${C.border}`,
  borderRadius: 6, background: "rgba(255,255,255,0.05)", color: C.text,
  width: "100%", boxSizing: "border-box", outline: "none", marginBottom: 10,
  boxShadow: "inset 0 2px 6px rgba(0,0,0,0.4), inset 0 1px 3px rgba(0,0,0,0.3)"
};

function SectionHead({ title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "22px 0 12px" }}>
      <div style={{ width: 3, height: 14, borderRadius: 2,
        background: `linear-gradient(to bottom,${C.purple},${C.blueMid})` }}/>
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
        color: C.purpleLight, textTransform: "uppercase" }}>{title}</span>
      <div style={{ flex: 1, height: "0.5px", background: `linear-gradient(to right,${C.border},transparent)` }}/>
    </div>
  );
}

function formatDate(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr.replace(" ", "T") + (isoStr.includes("T") ? "" : "Z"));
  return d.toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long", month: "long", day: "numeric"
  }) + " at " + d.toLocaleTimeString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric", minute: "2-digit"
  });
}

export default function Settings({ user, role, onClose, onRefresh }) {
  const [pos, setPos] = React.useState({ x: 0, y: 40 });
  const [dragging, setDragging] = React.useState(false);
  const dragStart = React.useRef(null);

  const onMouseDown = (e) => {
    if (e.target.closest("button, input, select, textarea, span[onClick], span[onclick]")) return;
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  };

  React.useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      const newY = Math.max(0, Math.min(dragStart.current.py + dy, window.innerHeight - 100));
      const newX = Math.max(-400, Math.min(dragStart.current.px + dx, 400));
      setPos({ x: newX, y: newY });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  // Resize
  const [size, setSize] = React.useState({ w: 540, h: 680 });
  const [resizing, setResizing] = React.useState(false);
  const resizeStart = React.useRef(null);
  React.useEffect(() => {
    if (!resizing) return;
    const onMove = e => {
      const dw = e.clientX - resizeStart.current.mx;
      const dh = e.clientY - resizeStart.current.my;
      setSize({
        w: Math.max(420, Math.min(resizeStart.current.pw + dw, 900)),
        h: Math.max(400, Math.min(resizeStart.current.ph + dh, window.innerHeight - 40))
      });
    };
    const onUp = () => setResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [resizing]);
  const onResizeStart = e => {
    e.stopPropagation();
    setResizing(true);
    resizeStart.current = { mx: e.clientX, my: e.clientY, pw: size.w, ph: size.h };
  };

  const [tab, setTab] = useState("account");
  // Library lists state
  const [listGenres,    setListGenres]    = useState([]);
  const [listStyles,    setListStyles]    = useState([]);
  const [listFormats,   setListFormats]   = useState([]);
  const [listLocations, setListLocations] = useState([]);
  const [listInput,     setListInput]     = useState({ genres:"", styles:"", formats:"", locations:"" });
  const [listMsg,       setListMsg]       = useState("");
  const [clearHistoryMsg, setClearHistoryMsg] = useState("");
  const [pwForm, setPwForm] = useState({ old: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [hasRecovery, setHasRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryMsg, setRecoveryMsg] = useState("");
  const [profile, setProfile] = useState({ firstName: "", lastName: "", email: "" });
  const [lastLogin, setLastLogin] = useState(null);
  const [profileMsg, setProfileMsg] = useState("");
  const [customGreeting, setCustomGreeting] = useState("");
  const [greetingMsg, setGreetingMsg] = useState("");
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "user" });
  const [userMsg, setUserMsg] = useState("");
  const [resetPw, setResetPw] = useState({});
  const [backupMsg, setBackupMsg] = useState("");
  const [discogsToken, setDiscogsToken] = useState("");
  const [lbToken, setLbToken] = useState("");
  const [lbMsg, setLbMsg] = useState("");
  const [geniusToken, setGeniusToken] = useState("");
  const [geniusMsg, setGeniusMsg] = useState("");
  const [discogsMsg, setDiscogsMsg] = useState("");
  const [volume, setVolumeState] = useState(() => getVolume());
  const [soundCfgs, setSoundCfgs] = useState(() => JSON.parse(JSON.stringify(getSoundConfigs())));
  const [animDuration, setAnimDuration] = useState(1.0);
  const [animRowDelay, setAnimRowDelay] = useState(150);
  const [animColDelay, setAnimColDelay] = useState(50);
  const [parallaxTilt, setParallaxTilt] = useState(10);
  const [parallaxScale, setParallaxScale] = useState(1.04);
  const [parallaxResponse, setParallaxResponse] = useState(0.08);
  const [parallaxReturn, setParallaxReturn] = useState(0.5);
  const [importUsername, setImportUsername] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null); // { current, total, status }
  const [importConflicts, setImportConflicts] = useState([]); // records that already exist
  const [importQueue, setImportQueue] = useState([]);         // full parsed records pending save
  const [importDone, setImportDone] = useState(null);         // summary { added, updated, skipped }

  // CSV import state
  const [csvAlbumsPath, setCsvAlbumsPath] = useState("");
  const [csvTracksPath, setCsvTracksPath] = useState("");
  const [csvUpdate, setCsvUpdate] = useState(false);
  const [csvRunning, setCsvRunning] = useState(false);
  const [csvLog, setCsvLog] = useState([]);
  const [csvDone, setCsvDone] = useState(null);

  React.useEffect(() => {
    window.api.onCsvProgress?.(msg => {
      if (!msg) return;
      setCsvLog(prev => [...prev.slice(-199), msg]);
    });
  }, []);

  useEffect(() => { if (tab === "users" && role === "admin") loadUsers(); }, [tab]);

  useEffect(() => {
    if (tab === "account") {
      // Load current user's profile
      window.api.getMyProfile && window.api.getMyProfile().then(me => {
        if (me) {
          setProfile({ firstName: me.firstName || "", lastName: me.lastName || "", email: me.email || "" });
          setLastLogin(me.lastLogin || null);
        }
      }).catch(() => {});
      window.api.getSetting("welcome_greeting").then(g => { if (g) setCustomGreeting(g); });
      window.api.hasRecoveryCode && window.api.hasRecoveryCode().then(res => {
        if (res?.ok) setHasRecovery(res.hasCode);
      }).catch(() => {});
    } else {
      // Clear the one-time code when leaving the tab
      setRecoveryCode(""); setRecoveryMsg("");
    }
  }, [tab]);
  useEffect(() => {
    if (tab === "library") {
      const load = async () => {
        const dg = await window.api.getSetting("list_genres");
        const ds = await window.api.getSetting("list_styles");
        const df = await window.api.getSetting("list_formats");
        const dl = await window.api.getSetting("list_locations");
        const { GENRES, STYLES, FORMATS, LOCATIONS } = await import("./shared");
        setListGenres(dg ? JSON.parse(dg) : GENRES);
        setListStyles(ds ? JSON.parse(ds) : STYLES);
        setListFormats(df ? JSON.parse(df) : FORMATS);
        setListLocations(dl ? JSON.parse(dl) : LOCATIONS);
      };
      load();
    }
  }, [tab]);
  useEffect(() => {
    (async () => {
      const d = await window.api.getSetting("anim_duration");
      const r = await window.api.getSetting("anim_row_delay");
      const c = await window.api.getSetting("anim_col_delay");
      if (d) setAnimDuration(parseFloat(d));
      if (r) setAnimRowDelay(parseInt(r));
      if (c) setAnimColDelay(parseInt(c));
      const pt = await window.api.getSetting("parallax_tilt");
      const ps = await window.api.getSetting("parallax_scale");
      const pr = await window.api.getSetting("parallax_response");
      const prr = await window.api.getSetting("parallax_return");
      if (pt) setParallaxTilt(parseFloat(pt));
      if (ps) setParallaxScale(parseFloat(ps));
      if (pr) setParallaxResponse(parseFloat(pr));
      if (prr) setParallaxReturn(parseFloat(prr));
    })();
  }, []);
  useEffect(() => {
    (async () => {
      const token = await window.api.getSetting("discogs_token");
      if (token) setDiscogsToken(token);
      const lbt = await window.api.getSetting("listenbrainz_token");
      if (lbt) setLbToken(lbt);
      const gnt = await window.api.getSetting("genius_token");
      if (gnt) setGeniusToken(gnt);
      const du = await window.api.getSetting("discogs_username");
      if (du) setImportUsername(du);
      await loadSoundConfigs();
      setSoundCfgs(JSON.parse(JSON.stringify(getSoundConfigs())));
    })();
  }, []);

  const loadUsers = async () => { setUsers(await window.api.getUsers()); };

  const saveProfile = async () => {
    // Get user id
    const users = await window.api.getUsers().catch(() => []);
    const me = users?.find(u => u.username === user);
    if (!me) return;
    const res = await window.api.updateProfile({ userId: me.id, firstName: profile.firstName, lastName: profile.lastName, email: profile.email });
    setProfileMsg(res.ok ? "Profile saved!" : (res.error || "Failed to save."));
    setTimeout(() => setProfileMsg(""), 3000);
  };

  const saveGreeting = async () => {
    await window.api.setSetting("welcome_greeting", customGreeting);
    setGreetingMsg("Greeting saved!");
    setTimeout(() => setGreetingMsg(""), 3000);
  };

  const changePw = async () => {
    if (pwForm.next !== pwForm.confirm) { setPwMsg("Passwords do not match."); return; }
    if (pwForm.next.length < 6) { setPwMsg("Password must be at least 6 characters."); return; }
    if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwForm.next)) { setPwMsg("Password must include at least one number or special character."); return; }
    
    const res = await window.api.changePassword({ username: user, oldPassword: pwForm.old, newPassword: pwForm.next });
    setPwMsg(res.ok ? "Password updated successfully." : res.error);
    if (res.ok) setPwForm({ old: "", next: "", confirm: "" });
  };

  const generateRecovery = async () => {
    if (hasRecovery && !confirm("This replaces your current code. The old one will stop working.")) return;
    setRecoveryMsg("");
    const res = await window.api.generateRecoveryCode();
    if (res.ok) { setRecoveryCode(res.code); setHasRecovery(true); }
    else setRecoveryMsg(res.error || "Failed to generate code.");
  };

  const copyRecovery = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setRecoveryMsg("Copied to clipboard.");
      setTimeout(() => setRecoveryMsg(""), 3000);
    } catch { setRecoveryMsg("Copy failed — write it down instead."); }
  };

  const saveDiscogsToken = async () => {
    if (!discogsToken.trim()) { setDiscogsMsg("Please enter a token."); return; }
    await window.api.setSetting("discogs_token", discogsToken.trim());
    setDiscogsMsg("Discogs token saved successfully.");
  };

  const createUser = async () => {
    const res = await window.api.createUser(newUser);
    setUserMsg(res.ok ? `User "${newUser.username}" created.` : res.error);
    if (res.ok) { setNewUser({ username: "", password: "", role: "user" }); loadUsers(); }
  };

  const doResetPw = async (userId) => {
    const pw = resetPw[userId];
    if (!pw || pw.length < 6) { setUserMsg("New password must be at least 6 characters."); return; }
      if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw)) { setUserMsg("Password must include at least one number or special character."); return; }
    
    await window.api.resetUserPassword({ userId, newPassword: pw });
    setUserMsg("Password reset."); setResetPw(p => ({...p, [userId]: ""}));
  };

  const deleteUser = async (u) => {
    if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    const res = await window.api.deleteUser({ userId: u.id });
    setUserMsg(res.ok ? `User "${u.username}" deleted.` : res.error);
    if (res.ok) loadUsers();
  };

  const startImport = async () => {
    const username = importUsername.trim();
    if (!username) return;
    window.api.setSetting("discogs_username", username);
    setImporting(true);
    setImportProgress({ current: 0, total: 0, status: "Fetching collection…" });
    setImportConflicts([]);
    setImportQueue([]);
    setImportDone(null);

    const res = await window.api.discogsImportCollection({ username });
    if (!res.ok) {
      setImportProgress(null);
      setImporting(false);
      setImportDone({ error: res.error });
      return;
    }

    const releases = res.releases;
    const total = releases.length;
    setImportProgress({ current: 0, total, status: `Fetching details for ${total} records…` });

    // Fetch existing records once for conflict checking
    const existing = await window.api.getRecords();
    const conflicts = [];
    let added = 0;

    for (let i = 0; i < releases.length; i++) {
      setImportProgress({ current: i + 1, total, status: `Fetching ${i + 1} of ${total}: ${releases[i].title}` });
      const detail = await window.api.discogsGetRelease({ resourceUrl: releases[i].resource_url });
      if (!detail.ok) {
        await new Promise(r => setTimeout(r, 1100));
        continue;
      }
      const rec = detail.data;
      const now = new Date().toISOString().replace("T"," ").substring(0,19);

      // Check for conflict
      const match = existing.find(e =>
        e.artist?.toLowerCase() === rec.artist?.toLowerCase() &&
        e.title?.toLowerCase()  === rec.title?.toLowerCase()
      );

      if (match) {
        conflicts.push({ incoming: rec, existing: match });
      } else {
        // Fetch images via main process to avoid CORS
        let images = [null, null, null, null];
        if (rec.images?.length) {
          const token = await window.api.getSetting("discogs_token");
          const imgList = rec.images.filter(i => i.uri).slice(0, 4);
          const fetched = await Promise.all(
            imgList.map(img => window.api.discogsFetchImage(img.uri, token).catch(() => null))
          );
          fetched.forEach((b64, i) => { if (b64) images[i] = b64; });
        }

        // Save immediately so it appears in library in real time
        // Spread EMPTY_RECORD first to guarantee all required fields are present
        await window.api.saveRecord({ ...EMPTY_RECORD, ...rec, id: null,
          tracks: rec.tracks || [], images,
          added_on: now, updated_on: now, updated_by: username });
        added++;
        if (onRefresh) onRefresh();
      }

      await new Promise(r => setTimeout(r, 1100));
    }

    setImportConflicts(conflicts);
    setImportProgress(null);
    setImporting(false);

    if (conflicts.length === 0) {
      setImportDone({ added, updated: 0, skipped: 0 });
    } else {
      setImportDone({ added, updated: 0, skipped: 0, pendingConflicts: conflicts.length });
    }
  };

  const resolveConflict = async (conflict, action) => {
    const now = new Date().toISOString().replace("T"," ").substring(0,19);
    if (action === "update") {
      // Keep existing record but update with Discogs data
      await window.api.saveRecord({ ...EMPTY_RECORD, ...conflict.existing, ...conflict.incoming,
        id: conflict.existing.id, images: conflict.existing.images,
        updated_on: now, updated_by: importUsername });
      setImportDone(d => ({ ...d, updated: (d.updated||0) + 1 }));
    } else if (action === "replace") {
      // Delete existing and save Discogs version as new
      await window.api.deleteRecord(conflict.existing.id);
      await window.api.saveRecord({ ...EMPTY_RECORD, ...conflict.incoming, id: null,
        tracks: conflict.incoming.tracks || [], images: conflict.incoming.images || [null,null,null,null],
        added_on: now, updated_on: now, updated_by: importUsername });
      setImportDone(d => ({ ...d, updated: (d.updated||0) + 1 }));
      if (onRefresh) onRefresh();
    } else if (action === "delete") {
      // Delete the existing duplicate, keep nothing (incoming was never saved)
      await window.api.deleteRecord(conflict.existing.id);
      setImportDone(d => ({ ...d, skipped: (d.skipped||0) + 1 }));
      if (onRefresh) onRefresh();
    } else {
      // Skip — dismiss without changes
      setImportDone(d => ({ ...d, skipped: (d.skipped||0) + 1 }));
    }
    setImportConflicts(prev => prev.filter(c => c.incoming.title + c.incoming.artist !== conflict.incoming.title + conflict.incoming.artist));
  };

  const pickCsvFile = async (type) => {
    const res = await window.api.csvPickFile({ title: `Select ${type} CSV` });
    if (!res.ok) return;
    if (type === "Albums") setCsvAlbumsPath(res.filePath);
    else setCsvTracksPath(res.filePath);
  };

  const startCsvImport = async () => {
    if (!csvAlbumsPath || !csvTracksPath) return;
    setCsvRunning(true);
    setCsvLog([]);
    setCsvDone(null);
    const res = await window.api.csvImport({ albumsPath: csvAlbumsPath, tracksPath: csvTracksPath, update: csvUpdate });
    setCsvRunning(false);
    setCsvDone(res.ok ? { added: res.added, updated: res.updated, skipped: res.skipped } : { error: res.error });
    if (res.ok && onRefresh) onRefresh();
  };

  const [artworkStatus, setArtworkStatus] = React.useState(null); // null | "running" | "done"
  const [artworkProgress, setArtworkProgress] = React.useState({ updated: 0, total: 0, current: "" });
  const [artworkOverwrite, setArtworkOverwrite] = React.useState(false);

  React.useEffect(() => {
    window.api.onArtworkProgress?.(p => {
      setArtworkProgress({ updated: p.updated, total: p.total, current: `${p.artist} - ${p.title}` });
    });
  }, []);

  const fetchArtwork = async () => {
    setArtworkStatus("running");
    setArtworkProgress({ updated: 0, total: 0, current: "" });
    const res = await window.api.discogsFetchMissingArtwork({ overwrite: artworkOverwrite });
    setArtworkStatus("done");
    if (res.ok) {
      setArtworkProgress(p => ({ ...p, total: res.total, updated: res.updated, current: `Done — ${res.updated} updated, ${res.failed} failed` }));
    } else {
      setArtworkProgress(p => ({ ...p, current: res.error || "Failed" }));
    }
  };

  const doBackup = async () => {
    const res = await window.api.backupSave();
    setBackupMsg(res.ok ? `Backup saved to: ${res.filePath}` : "Backup cancelled.");
  };

  const doRestore = async () => {
    if (!confirm("Restoring will merge backup records into your current library. Continue?")) return;
    const res = await window.api.backupRestore();
    if (res.ok) setBackupMsg(`Restored ${res.count} records successfully.`);
    else setBackupMsg(res.error || "Restore cancelled.");
  };

  const tabs = [
    { id: "account",     label: "Account" },
    { id: "library",     label: "Library" },
    { id: "connections", label: "Connections" },
    { id: "import",      label: "Import" },
    { id: "display",     label: "Display" },
    { id: "audio",       label: "Audio" },
    { id: "backup",      label: "Backup" },
    ...(role === "admin" ? [{ id: "users", label: "Users" }] : []),
  ];

  const tabBtn = (id) => ({
    padding: "7px 14px", fontSize: 12, cursor: "pointer",
    border: "none", borderRadius: 6,
    background: tab === id ? `linear-gradient(135deg,${C.purple},${C.blueMid})` : "rgba(255,255,255,0.04)",
    color: tab === id ? "#fff" : C.textMuted, fontWeight: tab === id ? 500 : 400,
    boxShadow: tab === id
      ? "inset 0 3px 6px rgba(0,0,0,0.45), inset 0 1px 3px rgba(0,0,0,0.3)"
      : "0 3px 0 rgba(0,0,0,0.4), 0 5px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
    transform: tab === id ? "translateY(1px)" : "translateY(0)",
    transition: "all 0.08s ease",
  });

  const actionBtn = (color) => ({
    padding: "8px 20px", fontSize: 13, fontWeight: 500, border: "none",
    borderRadius: 7, cursor: "pointer",
    background: color || `linear-gradient(135deg,${C.purple},${C.blueMid})`,
    color: "#fff",
    boxShadow: `0 4px 0 rgba(0,0,0,0.5), 0 6px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.25)`,
    position: "relative",
    overflow: "hidden",
    transition: "transform 0.08s ease, box-shadow 0.08s ease, filter 0.08s ease",
  });

  return (
    <>
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 300, pointerEvents: "none" }}/>
      <div style={{
        position: "fixed",
        top: pos.y,
        left: `calc(50% + ${pos.x}px)`,
        transform: "translateX(-50%)",
        background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: "24px 28px", width: size.w, height: size.h, display: "flex", flexDirection: "column",
        boxShadow: `0 8px 0 rgba(0,0,0,0.4), 0 16px 48px rgba(124,58,237,0.25), inset 0 1px 0 rgba(255,255,255,0.08)`,
        userSelect: dragging || resizing ? "none" : "auto",
        pointerEvents: "auto", overflow: "hidden", zIndex: 301,
      }}>
        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div
          onMouseDown={onMouseDown}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 16, cursor: dragging ? "grabbing" : "grab" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500, color: C.text }}>Settings</h2>
          <span onClick={onClose} style={{ cursor: "pointer", fontSize: 18, color: C.textMuted }}>✕</span>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 4, background: "rgba(255,255,255,0.04)",
          borderRadius: 8, padding: 4, flexWrap: "wrap" }}>
          {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={tabBtn(t.id)}>{t.label}</button>)}
        </div>

        <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
          <style>{`::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${C.purpleDim};border-radius:2px}`}</style>

          {/* ── Password ── */}
          {tab === "account" && (
            <div>
              <SectionHead title="Your profile" />
              <p style={{ fontSize: 12, color: C.textDim, marginBottom: 12, marginTop: -8 }}>
                Last login: {lastLogin ? formatDate(lastLogin) : "First Login"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input placeholder="First name" value={profile.firstName}
                  onChange={e => setProfile(p => ({...p, firstName: e.target.value}))} style={sinp}/>
                <input placeholder="Last name" value={profile.lastName}
                  onChange={e => setProfile(p => ({...p, lastName: e.target.value}))} style={sinp}/>
              </div>
              <input placeholder="Email address" value={profile.email} type="email"
                onChange={e => setProfile(p => ({...p, email: e.target.value}))}
                style={{ ...sinp, marginBottom: 0 }}/>
              {profileMsg && <p style={{ margin: "10px 0 0", fontSize: 12,
                color: profileMsg.includes("saved") ? "#4ade80" : "#f87171" }}>{profileMsg}</p>}
              <button onClick={saveProfile} style={{ ...actionBtn(), marginTop: 12 }}>Save profile</button>

              <SectionHead title="Change your password" />
              <input type="password" placeholder="Current password" value={pwForm.old}
                onChange={e => setPwForm(f => ({...f, old: e.target.value}))} style={sinp}/>
              <input type="password" placeholder="New password (min 6 chars)" value={pwForm.next}
                onChange={e => setPwForm(f => ({...f, next: e.target.value}))} style={sinp}/>
              <input type="password" placeholder="Confirm new password" value={pwForm.confirm}
                onChange={e => setPwForm(f => ({...f, confirm: e.target.value}))}
                style={{ ...sinp, marginBottom: 0 }}/>
              {pwMsg && <p style={{ margin: "10px 0 0", fontSize: 12,
                color: pwMsg.includes("success") ? "#4ade80" : "#f87171" }}>{pwMsg}</p>}
              <button onClick={changePw} style={{ ...actionBtn(), marginTop: 16 }}>Update password</button>

              <SectionHead title="Recovery code" />
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 10, lineHeight: 1.6 }}>
                A recovery code lets you reset your password from the login screen if you forget it.
                It stays valid until you generate a new one.
              </p>
              <p style={{ fontSize: 12, color: hasRecovery ? "#4ade80" : C.textDim, marginBottom: 12 }}>
                {hasRecovery ? "A recovery code is set" : "No recovery code set"}
              </p>
              {recoveryCode && (
                <div style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: "14px 16px", marginBottom: 12 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 20, letterSpacing: "0.1em",
                    color: C.text, textAlign: "center", marginBottom: 10, userSelect: "all" }}>
                    {recoveryCode}
                  </div>
                  <p style={{ fontSize: 12, color: "#fbbf24", margin: "0 0 10px", textAlign: "center" }}>
                    Write this down. It won't be shown again.
                  </p>
                  <div style={{ textAlign: "center" }}>
                    <button onClick={copyRecovery} style={actionBtn("rgba(255,255,255,0.06)")}>Copy</button>
                  </div>
                </div>
              )}
              {recoveryMsg && <p style={{ margin: "0 0 10px", fontSize: 12,
                color: recoveryMsg.includes("Copied") ? "#4ade80" : "#f87171" }}>{recoveryMsg}</p>}
              <button onClick={generateRecovery} style={actionBtn()}>
                {hasRecovery ? "Generate new code" : "Generate recovery code"}
              </button>

              {role === "admin" && (
                <>
                  <SectionHead title="Welcome greeting" />
                  <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 10, lineHeight: 1.6 }}>
                    Customize the greeting shown on the welcome screen. Use <span style={{ color: C.purpleLight, fontFamily: "monospace" }}>{"{name}"}</span> to insert the user's first name. Leave blank to use a random built-in greeting.
                  </p>
                  <input placeholder='e.g. "Welcome back, {name}! The turntable is ready."'
                    value={customGreeting}
                    onChange={e => setCustomGreeting(e.target.value)}
                    style={{ ...sinp, marginBottom: 0 }}/>
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button onClick={saveGreeting} style={actionBtn()}>Save greeting</button>
                    <button onClick={() => { setCustomGreeting(""); window.api.setSetting("welcome_greeting", ""); setGreetingMsg("Cleared — random greetings will be used."); setTimeout(() => setGreetingMsg(""), 3000); }}
                      style={{ ...actionBtn("rgba(255,255,255,0.06)"), color: C.textMuted }}>Clear (use random)</button>
                  </div>
                  {greetingMsg && <p style={{ margin: "10px 0 0", fontSize: 12, color: "#4ade80" }}>{greetingMsg}</p>}
                </>
              )}
            </div>
          )}

          {/* ── Library Lists ── */}
          {tab === "library" && (
            <div>
              <SectionHead title="Manage lists" />
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
                Edit the dropdown options for Genre, Style, Format, and Location. Changes apply immediately when editing records.
              </p>
              {[
                { label: "Genres", key: "list_genres", items: listGenres, setItems: setListGenres },
                { label: "Styles", key: "list_styles", items: listStyles, setItems: setListStyles },
                { label: "Formats", key: "list_formats", items: listFormats, setItems: setListFormats },
                { label: "Locations", key: "list_locations", items: listLocations, setItems: setListLocations },
              ].map(({ label, key, items, setItems }) => (
                <div key={key} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.purpleLight, marginBottom: 8 }}>{label}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {items.map((item, i) => (
                      <span key={i} style={{ display: "flex", alignItems: "center", gap: 4,
                        fontSize: 12, padding: "3px 8px", borderRadius: 6,
                        background: "rgba(124,58,237,0.12)", border: `1px solid ${C.border}`, color: C.text }}>
                        {item}
                        <span onClick={async () => {
                          const updated = items.filter((_, j) => j !== i);
                          setItems(updated);
                          await window.api.setSetting(key, JSON.stringify(updated));
                          setListMsg(`${label} updated.`);
                          setTimeout(() => setListMsg(""), 2000);
                        }} style={{ cursor: "pointer", color: C.textDim, fontSize: 11, marginLeft: 2 }}>✕</span>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={listInput[key.replace("list_","")]}
                      onChange={e => setListInput(p => ({ ...p, [key.replace("list_","")]: e.target.value }))}
                      onKeyDown={async e => {
                        if (e.key !== "Enter") return;
                        const val = listInput[key.replace("list_","")].trim();
                        if (!val || items.includes(val)) return;
                        const updated = [...items, val].sort();
                        setItems(updated);
                        await window.api.setSetting(key, JSON.stringify(updated));
                        setListInput(p => ({ ...p, [key.replace("list_","")]: "" }));
                        setListMsg(`${label} updated.`);
                        setTimeout(() => setListMsg(""), 2000);
                      }}
                      placeholder={`Add ${label.toLowerCase().slice(0,-1)}… (press Enter)`}
                      style={{ ...sinp, flex: 1, marginBottom: 0 }}/>
                    <button onClick={async () => {
                      const val = listInput[key.replace("list_","")].trim();
                      if (!val || items.includes(val)) return;
                      const updated = [...items, val].sort();
                      setItems(updated);
                      await window.api.setSetting(key, JSON.stringify(updated));
                      setListInput(p => ({ ...p, [key.replace("list_","")]: "" }));
                      setListMsg(`${label} updated.`);
                      setTimeout(() => setListMsg(""), 2000);
                    }} style={{ ...actionBtn(), padding: "7px 14px", fontSize: 12 }}>Add</button>
                  </div>
                </div>
              ))}
              {listMsg && <p style={{ fontSize: 12, color: "#4ade80", margin: "4px 0 0" }}>{listMsg}</p>}

              {role === "admin" && (
                <div style={{ marginTop: 28 }}>
                  <SectionHead title="Danger zone" />
                  <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)",
                    borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#f87171" }}>Clear listening history</div>
                      <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>Permanently deletes all play history. Cannot be undone.</div>
                    </div>
                    <button onClick={async () => {
                      if (!confirm("Are you sure? This will permanently delete all listening history.")) return;
                      await window.api.clearListeningHistory();
                      setClearHistoryMsg("Listening history cleared.");
                      setTimeout(() => setClearHistoryMsg(""), 3000);
                    }} style={{ padding: "7px 16px", border: "1px solid rgba(248,113,113,0.4)",
                      borderRadius: 7, background: "rgba(248,113,113,0.1)",
                      color: "#f87171", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}>
                      Clear history
                    </button>
                  </div>
                  {clearHistoryMsg && <p style={{ fontSize: 12, color: "#4ade80", margin: "8px 0 0" }}>{clearHistoryMsg}</p>}
                </div>
              )}
            </div>
          )}

          {/* ── Connections ── */}
          {tab === "connections" && (
            <div>
              <SectionHead title="Discogs personal access token" />
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
                Your Discogs token allows the app to look up records, pull tracklists, and retrieve pricing data. Keep it private.
              </p>
              <p style={{ fontSize: 12, color: C.textDim, marginBottom: 10 }}>
                Get your token at: <span style={{ color: C.purpleLight }}>discogs.com/settings/developers</span> → Generate Token
              </p>
              <input type="password" placeholder="Paste your Discogs token here"
                value={discogsToken} onChange={e => setDiscogsToken(e.target.value)}
                style={{ ...sinp, marginBottom: 0 }}/>
              {discogsMsg && <p style={{ margin: "10px 0 0", fontSize: 12,
                color: discogsMsg.includes("success") ? "#4ade80" : "#f87171" }}>{discogsMsg}</p>}
              <button onClick={saveDiscogsToken} style={{ ...actionBtn(), marginTop: 14 }}>Save Discogs token</button>

              <SectionHead title="ListenBrainz token" />
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
                Your ListenBrainz user token allows the app to scrobble records when you scan them in Now Playing.
              </p>
              <p style={{ fontSize: 12, color: C.textDim, marginBottom: 10 }}>
                Get your token at: <span style={{ color: C.purpleLight }}>listenbrainz.org/profile</span> → User Token
              </p>
              <input type="password" placeholder="Paste your ListenBrainz token here"
                value={lbToken} onChange={e => setLbToken(e.target.value)}
                style={{ ...sinp, marginBottom: 0 }}/>
              {lbMsg && <p style={{ margin: "10px 0 0", fontSize: 12,
                color: lbMsg.includes("saved") ? "#4ade80" : "#f87171" }}>{lbMsg}</p>}
              <button onClick={async () => {
                if (!lbToken.trim()) { setLbMsg("Please enter a token."); return; }
                await window.api.setSetting("listenbrainz_token", lbToken.trim());
                setLbMsg("ListenBrainz token saved successfully.");
              }} style={{ ...actionBtn(), marginTop: 14 }}>Save ListenBrainz token</button>

              <SectionHead title="Genius API token" />
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
                Your Genius Client Access Token enables lyrics search. lyrics.ovh is used as a free fallback even without this token.
              </p>
              <p style={{ fontSize: 12, color: C.textDim, marginBottom: 10 }}>
                Get your token at: <span style={{ color: C.purpleLight }}>genius.com/api-clients</span> → New API Client → Client Access Token
              </p>
              <input type="password" placeholder="Paste your Genius Client Access Token here"
                value={geniusToken} onChange={e => setGeniusToken(e.target.value)}
                style={{ ...sinp, marginBottom: 0 }}/>
              {geniusMsg && <p style={{ margin: "10px 0 0", fontSize: 12,
                color: geniusMsg.includes("saved") ? "#4ade80" : "#f87171" }}>{geniusMsg}</p>}
              <button onClick={async () => {
                if (!geniusToken.trim()) { setGeniusMsg("Please enter a token."); return; }
                await window.api.setSetting("genius_token", geniusToken.trim());
                setGeniusMsg("Genius token saved successfully.");
                setTimeout(() => setGeniusMsg(""), 3000);
              }} style={{ ...actionBtn(), marginTop: 14 }}>Save Genius token</button>
            </div>
          )}

          {/* ── Display ── */}
          {tab === "display" && (
            <div>
              <SectionHead title="Fonts" />
              <FontTab />
              <SectionHead title="Theme" />
              <ThemeTab onThemeChange={onRefresh}/>
              <SectionHead title="Animation" />
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
                Controls how cards animate when the library loads.
              </p>
              {[
                { label: "Card duration", key: "anim_duration", val: animDuration, set: setAnimDuration, min: 0.1, max: 2.0, step: 0.1, display: v => `${v.toFixed(1)}s` },
                { label: "Row delay", key: "anim_row_delay", val: animRowDelay, set: setAnimRowDelay, min: 0, max: 500, step: 10, display: v => `${v}ms` },
                { label: "Column delay", key: "anim_col_delay", val: animColDelay, set: setAnimColDelay, min: 0, max: 200, step: 5, display: v => `${v}ms` },
              ].map(({ label, key, val, set, min, max, step, display }) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: C.textMuted }}>{label}</span>
                    <span style={{ fontSize: 12, color: C.purpleLight, fontWeight: 500 }}>{display(val)}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={val}
                    onChange={async e => { const v = step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value); set(v); await window.api.setSetting(key, String(v)); }}
                    style={{ width: "100%", accentColor: C.purple, cursor: "pointer" }}/>
                </div>
              ))}
              <SectionHead title="Card hover parallax" />
              {[
                { label: "Tilt intensity", key: "parallax_tilt", val: parallaxTilt, set: setParallaxTilt, min: 0, max: 20, step: 1, display: v => `${v}°` },
                { label: "Scale on hover", key: "parallax_scale", val: parallaxScale, set: setParallaxScale, min: 1.0, max: 1.15, step: 0.01, display: v => `${v.toFixed(2)}x` },
                { label: "Response speed", key: "parallax_response", val: parallaxResponse, set: setParallaxResponse, min: 0.01, max: 0.3, step: 0.01, display: v => `${v.toFixed(2)}s` },
                { label: "Return speed", key: "parallax_return", val: parallaxReturn, set: setParallaxReturn, min: 0.1, max: 1.5, step: 0.1, display: v => `${v.toFixed(1)}s` },
              ].map(({ label, key, val, set, min, max, step, display }) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: C.textMuted }}>{label}</span>
                    <span style={{ fontSize: 12, color: C.purpleLight, fontWeight: 500 }}>{display(val)}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={val}
                    onChange={async e => { const v = parseFloat(e.target.value); set(v); await window.api.setSetting(key, String(v)); }}
                    style={{ width: "100%", accentColor: C.purple, cursor: "pointer" }}/>
                </div>
              ))}
            </div>
          )}

          {/* ── Discogs (old, now hidden — kept for compatibility) ── */}
          {tab === "discogs" && (
            <div>
              <SectionHead title="Discogs personal access token" />
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
                Your Discogs token allows the app to look up records, pull tracklists, and retrieve pricing data. Keep it private.
              </p>
              <p style={{ fontSize: 12, color: C.textDim, marginBottom: 10 }}>
                Get your token at: <span style={{ color: C.purpleLight }}>discogs.com/settings/developers</span> → Generate Token
              </p>
              <input
                type="password"
                placeholder="Paste your Discogs token here"
                value={discogsToken}
                onChange={e => setDiscogsToken(e.target.value)}
                style={{ ...sinp, marginBottom: 0 }}/>
              {discogsMsg && <p style={{ margin: "10px 0 0", fontSize: 12,
                color: discogsMsg.includes("success") ? "#4ade80" : "#f87171" }}>{discogsMsg}</p>}
              <button onClick={saveDiscogsToken} style={{ ...actionBtn(), marginTop: 14 }}>Save token</button>
            </div>
          )}

          {/* ── Users ── */}
          {tab === "users" && role === "admin" && (
            <div>
              <SectionHead title="Create new user" />
              <input placeholder="Username" value={newUser.username}
                onChange={e => setNewUser(u => ({...u, username: e.target.value}))} style={sinp}/>
              <input type="password" placeholder="Password (min 6 chars)" value={newUser.password}
                onChange={e => setNewUser(u => ({...u, password: e.target.value}))} style={sinp}/>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>Role:</label>
                <select value={newUser.role} onChange={e => setNewUser(u => ({...u, role: e.target.value}))}
                  style={{ ...sinp, marginBottom: 0, flex: 1 }}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button onClick={createUser} style={actionBtn()}>Create user</button>

              <SectionHead title="Manage users" />
              {users.map(u => (
                <div key={u.id} style={{ background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{u.username}</span>
                      <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 7px", borderRadius: 4,
                        background: u.role === "admin" ? "rgba(124,58,237,0.2)" : "rgba(59,130,246,0.15)",
                        color: u.role === "admin" ? C.purpleLight : C.blueLight,
                        border: `0.5px solid ${u.role === "admin" ? C.border : "rgba(59,130,246,0.25)"}` }}>
                        {u.role}
                      </span>
                    </div>
                    {u.username !== user && (
                      <button onClick={() => deleteUser(u)}
                        style={{ fontSize: 11, padding: "3px 10px", border: "1px solid rgba(248,113,113,0.3)",
                          borderRadius: 5, background: "transparent", color: "#f87171", cursor: "pointer" }}>
                        Delete
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>
                    {[u.first_name, u.last_name].filter(Boolean).join(" ")}
                    {u.email && <span style={{ color: C.textDim, marginLeft: 8 }}>{u.email}</span>}
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
                      Last login: {u.previous_last_login ? formatDate(u.previous_last_login) : u.last_login ? "First Login" : "Never logged in"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="password" placeholder="Reset password" value={resetPw[u.id]||""}
                      onChange={e => setResetPw(p => ({...p, [u.id]: e.target.value}))}
                      style={{ ...sinp, marginBottom: 0, flex: 1, fontSize: 12, padding: "5px 8px" }}/>
                    <button onClick={() => doResetPw(u.id)}
                      style={{ ...actionBtn(), fontSize: 11, padding: "5px 14px", whiteSpace: "nowrap" }}>Reset</button>
                  </div>
                </div>
              ))}
              {userMsg && <p style={{ margin: "10px 0 0", fontSize: 12,
                color: userMsg.includes("created")||userMsg.includes("deleted")||userMsg.includes("reset")
                  ? "#4ade80" : "#f87171" }}>{userMsg}</p>}
            </div>
          )}

          {/* ── Audio ── */}
          {tab === "audio" && (
            <div>
              <SectionHead title="Master volume" />
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>🔈</span>
                <input type="range" min={0} max={1} step={0.01} value={volume}
                  onChange={e => { const v = parseFloat(e.target.value); setVolumeState(v); setVolume(v); }}
                  style={{ flex: 1, accentColor: C.purple, cursor: "pointer" }}/>
                <span style={{ fontSize: 18 }}>🔊</span>
                <span style={{ fontSize: 12, color: C.textMuted, minWidth: 36, textAlign: "right" }}>
                  {Math.round(volume * 100)}%
                </span>
              </div>

              {Object.entries(soundCfgs).map(([key, cfg]) => {
                const update = async (field, val) => {
                  const next = { ...soundCfgs[key], [field]: val };
                  setSoundCfgs(prev => ({ ...prev, [key]: next }));
                  setSoundConfig(key, { [field]: val });
                  await saveSoundConfig(key);
                };
                return (
                  <div key={key} style={{ background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${cfg.active ? C.border : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 10, padding: "14px 16px", marginBottom: 12,
                    opacity: cfg.active ? 1 : 0.5 }}>
                    {/* Header row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{cfg.label}</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button onClick={() => previewSound(cfg)}
                          style={{ fontSize: 11, padding: "3px 10px", border: `1px solid ${C.purple}`,
                            borderRadius: 5, background: "rgba(124,58,237,0.1)", color: C.purpleLight, cursor: "pointer" }}>
                          ▶ Preview
                        </button>
                        <button onClick={() => update("active", !cfg.active)}
                          style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5, cursor: "pointer",
                            border: `1px solid ${cfg.active ? "#4ade80" : C.border}`,
                            background: cfg.active ? "rgba(74,222,128,0.1)" : "transparent",
                            color: cfg.active ? "#4ade80" : C.textDim }}>
                          {cfg.active ? "Active" : "Inactive"}
                        </button>
                        <button onClick={async () => {
                          const def = SOUND_DEFAULTS[key];
                          setSoundCfgs(prev => ({ ...prev, [key]: { ...def } }));
                          setSoundConfig(key, def);
                          await saveSoundConfig(key);
                        }} style={{ fontSize: 10, padding: "3px 8px", border: `1px solid ${C.border}`,
                          borderRadius: 5, background: "transparent", color: C.textDim, cursor: "pointer" }}>
                          Reset
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                      {/* Waveform */}
                      <div>
                        <label style={{ fontSize: 10, color: C.textDim, display: "block", marginBottom: 3 }}>Waveform</label>
                        <select value={cfg.waveform} onChange={e => update("waveform", e.target.value)}
                          style={{ ...sinp, fontSize: 12, padding: "4px 8px" }}>
                          {["sine","square","sawtooth","triangle"].map(w => <option key={w}>{w}</option>)}
                        </select>
                      </div>
                      {/* Noise blend */}
                      <div>
                        <label style={{ fontSize: 10, color: C.textDim, display: "block", marginBottom: 3 }}>
                          Noise blend: {Math.round(cfg.noiseBlend * 100)}%
                        </label>
                        <input type="range" min={0} max={1} step={0.05} value={cfg.noiseBlend}
                          onChange={e => update("noiseBlend", parseFloat(e.target.value))}
                          style={{ width: "100%", accentColor: C.purple, cursor: "pointer" }}/>
                      </div>
                      {/* Freq start */}
                      <div>
                        <label style={{ fontSize: 10, color: C.textDim, display: "block", marginBottom: 3 }}>
                          Freq start: {cfg.freqStart}Hz
                        </label>
                        <input type="range" min={20} max={4000} step={10} value={cfg.freqStart}
                          onChange={e => update("freqStart", parseInt(e.target.value))}
                          style={{ width: "100%", accentColor: C.purple, cursor: "pointer" }}/>
                      </div>
                      {/* Freq end */}
                      <div>
                        <label style={{ fontSize: 10, color: C.textDim, display: "block", marginBottom: 3 }}>
                          Freq end: {cfg.freqEnd}Hz
                        </label>
                        <input type="range" min={20} max={4000} step={10} value={cfg.freqEnd}
                          onChange={e => update("freqEnd", parseInt(e.target.value))}
                          style={{ width: "100%", accentColor: C.purple, cursor: "pointer" }}/>
                      </div>
                      {/* Attack */}
                      <div>
                        <label style={{ fontSize: 10, color: C.textDim, display: "block", marginBottom: 3 }}>
                          Attack: {cfg.attack.toFixed(3)}s
                        </label>
                        <input type="range" min={0.001} max={0.5} step={0.001} value={cfg.attack}
                          onChange={e => update("attack", parseFloat(e.target.value))}
                          style={{ width: "100%", accentColor: C.purple, cursor: "pointer" }}/>
                      </div>
                      {/* Decay */}
                      <div>
                        <label style={{ fontSize: 10, color: C.textDim, display: "block", marginBottom: 3 }}>
                          Decay: {cfg.decay.toFixed(3)}s
                        </label>
                        <input type="range" min={0.001} max={0.5} step={0.001} value={cfg.decay}
                          onChange={e => update("decay", parseFloat(e.target.value))}
                          style={{ width: "100%", accentColor: C.purple, cursor: "pointer" }}/>
                      </div>
                      {/* Sustain */}
                      <div>
                        <label style={{ fontSize: 10, color: C.textDim, display: "block", marginBottom: 3 }}>
                          Sustain: {cfg.sustain.toFixed(2)}
                        </label>
                        <input type="range" min={0} max={1} step={0.01} value={cfg.sustain}
                          onChange={e => update("sustain", parseFloat(e.target.value))}
                          style={{ width: "100%", accentColor: C.purple, cursor: "pointer" }}/>
                      </div>
                      {/* Release */}
                      <div>
                        <label style={{ fontSize: 10, color: C.textDim, display: "block", marginBottom: 3 }}>
                          Release: {cfg.release.toFixed(3)}s
                        </label>
                        <input type="range" min={0.001} max={1.0} step={0.001} value={cfg.release}
                          onChange={e => update("release", parseFloat(e.target.value))}
                          style={{ width: "100%", accentColor: C.purple, cursor: "pointer" }}/>
                      </div>
                      {/* Duration */}
                      <div>
                        <label style={{ fontSize: 10, color: C.textDim, display: "block", marginBottom: 3 }}>
                          Duration: {cfg.duration.toFixed(2)}s
                        </label>
                        <input type="range" min={0.01} max={2.0} step={0.01} value={cfg.duration}
                          onChange={e => update("duration", parseFloat(e.target.value))}
                          style={{ width: "100%", accentColor: C.purple, cursor: "pointer" }}/>
                      </div>
                      {/* Volume */}
                      <div>
                        <label style={{ fontSize: 10, color: C.textDim, display: "block", marginBottom: 3 }}>
                          Volume: {Math.round(cfg.volume * 100)}%
                        </label>
                        <input type="range" min={0} max={1} step={0.01} value={cfg.volume}
                          onChange={e => update("volume", parseFloat(e.target.value))}
                          style={{ width: "100%", accentColor: C.purple, cursor: "pointer" }}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Import ── */}
          {tab === "import" && (
            <div>
              <SectionHead title="Import from Discogs collection" />
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
                Pulls your full Discogs collection including tracklists and pricing. Large collections may take a few minutes due to API rate limits.
              </p>
              <input
                placeholder="Discogs username"
                value={importUsername}
                onChange={e => setImportUsername(e.target.value)}
                style={{ ...sinp, marginBottom: 10 }}
              />

              {!importing && !importProgress && (
                <button onClick={startImport} style={actionBtn()}>Import collection</button>
              )}

              {/* Progress */}
              {importProgress && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>{importProgress.status}</div>
                  {importProgress.total > 0 && (
                    <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden", height: 8 }}>
                      <div style={{ height: "100%", borderRadius: 6,
                        background: `linear-gradient(90deg,${C.purple},${C.blueMid})`,
                        width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`,
                        transition: "width 0.3s ease" }}/>
                    </div>
                  )}
                  {importProgress.total > 0 && (
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
                      {importProgress.current} / {importProgress.total}
                    </div>
                  )}
                </div>
              )}

              {/* Conflicts */}
              {importConflicts.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: C.purpleLight, marginBottom: 8, fontWeight: 500 }}>
                    {importConflicts.length} record{importConflicts.length !== 1 ? "s" : ""} already exist in your library — update or skip each one:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
                    {importConflicts.map(c => (
                      <div key={c.incoming.title + c.incoming.artist}
                        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
                          borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{c.incoming.title}</div>
                        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>{c.incoming.artist}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button onClick={() => resolveConflict(c, "update")}
                            style={{ ...actionBtn(), fontSize: 11, padding: "4px 12px" }}>
                            Update existing
                          </button>
                          <button onClick={() => resolveConflict(c, "replace")}
                            style={{ ...actionBtn(`linear-gradient(135deg,${C.blue},${C.blueMid})`), fontSize: 11, padding: "4px 12px" }}>
                            Replace with Discogs
                          </button>
                          <button onClick={() => resolveConflict(c, "delete")}
                            style={{ fontSize: 11, padding: "4px 12px", border: "1px solid rgba(248,113,113,0.4)",
                              borderRadius: 6, background: "rgba(248,113,113,0.1)", color: "#f87171", cursor: "pointer" }}>
                            Delete existing
                          </button>
                          <button onClick={() => resolveConflict(c, "skip")}
                            style={{ fontSize: 11, padding: "4px 12px", border: `1px solid ${C.border}`,
                              borderRadius: 6, background: "transparent", color: C.textMuted, cursor: "pointer" }}>
                            Skip
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Done summary */}
              {importDone && importConflicts.length === 0 && (
                <div style={{ marginTop: 14, fontSize: 12,
                  color: importDone.error ? "#f87171" : "#4ade80" }}>
                  {importDone.error
                    ? `Import failed: ${importDone.error}`
                    : `Done — ${importDone.added} added, ${importDone.updated} updated, ${importDone.skipped} skipped.${importDone.pendingConflicts ? ` Resolve ${importDone.pendingConflicts} conflicts above.` : ""}`
                  }
                </div>
              )}

              {/* CSV import hidden until it's wired up */}
              {false && (<>
              <SectionHead title="Import from CSV" />
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
                Import records from your CSV files. Requires both the Albums and Tracks CSV files.
              </p>

              {/* Albums CSV */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: C.purpleLight, marginBottom: 5, fontWeight: 500 }}>Albums CSV</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ flex: 1, fontSize: 12, color: csvAlbumsPath ? C.text : C.textDim,
                    padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6,
                    background: "rgba(255,255,255,0.03)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {csvAlbumsPath ? csvAlbumsPath.split(/[\\/]/).pop() : "No file selected"}
                  </div>
                  <button onClick={() => pickCsvFile("Albums")} style={{ ...actionBtn(), padding: "7px 14px", fontSize: 12, whiteSpace: "nowrap" }}>
                    Browse…
                  </button>
                </div>
              </div>

              {/* Tracks CSV */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: C.purpleLight, marginBottom: 5, fontWeight: 500 }}>Tracks CSV</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ flex: 1, fontSize: 12, color: csvTracksPath ? C.text : C.textDim,
                    padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6,
                    background: "rgba(255,255,255,0.03)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {csvTracksPath ? csvTracksPath.split(/[\\/]/).pop() : "No file selected"}
                  </div>
                  <button onClick={() => pickCsvFile("Tracks")} style={{ ...actionBtn(), padding: "7px 14px", fontSize: 12, whiteSpace: "nowrap" }}>
                    Browse…
                  </button>
                </div>
              </div>

              {/* Update checkbox */}
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, cursor: "pointer" }}>
                <input type="checkbox" checked={csvUpdate} onChange={e => setCsvUpdate(e.target.checked)}
                  style={{ accentColor: C.purple, cursor: "pointer" }}/>
                <span style={{ fontSize: 12, color: C.textMuted }}>Update existing records (overwrite matching records from CSV)</span>
              </label>

              <button onClick={startCsvImport}
                disabled={csvRunning || !csvAlbumsPath || !csvTracksPath}
                style={{ ...actionBtn(csvRunning || !csvAlbumsPath || !csvTracksPath ? "rgba(255,255,255,0.1)" : undefined),
                  cursor: csvRunning || !csvAlbumsPath || !csvTracksPath ? "not-allowed" : "pointer" }}>
                {csvRunning ? "Importing…" : "Import from CSV"}
              </button>

              {/* Live log */}
              {csvLog.length > 0 && (
                <div style={{ marginTop: 10, maxHeight: 120, overflowY: "auto",
                  background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "8px 10px",
                  border: `1px solid ${C.border}` }}>
                  {csvLog.map((line, i) => (
                    <div key={i} style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>{line}</div>
                  ))}
                </div>
              )}

              {/* Done summary */}
              {csvDone && (
                <div style={{ marginTop: 10, fontSize: 12, color: csvDone.error ? "#f87171" : "#4ade80" }}>
                  {csvDone.error
                    ? `Import failed: ${csvDone.error}`
                    : `Done — ${csvDone.added} added, ${csvDone.updated} updated, ${csvDone.skipped} skipped.`}
                </div>
              )}

              </>)}
              <SectionHead title="Fetch missing artwork" />
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
                Automatically search Discogs for album artwork for all records missing images. Requires a Discogs token in Connections.
              </p>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, cursor: "pointer" }}>
                <input type="checkbox" checked={artworkOverwrite}
                  onChange={e => setArtworkOverwrite(e.target.checked)}
                  style={{ accentColor: C.purple, cursor: "pointer" }}/>
                <span style={{ fontSize: 12, color: C.textMuted }}>Overwrite existing images too</span>
              </label>
              {artworkStatus === "running" && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: C.purpleLight, marginBottom: 6 }}>
                    Fetching… {artworkProgress.updated} / {artworkProgress.total || "?"}
                  </div>
                  {artworkProgress.current && (
                    <div style={{ fontSize: 11, color: C.textDim, whiteSpace: "nowrap",
                      overflow: "hidden", textOverflow: "ellipsis" }}>{artworkProgress.current}</div>
                  )}
                  <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginTop: 8 }}>
                    {artworkProgress.total > 0 && (
                      <div style={{ height: "100%", borderRadius: 2,
                        width: `${(artworkProgress.updated / artworkProgress.total) * 100}%`,
                        background: `linear-gradient(90deg,${C.purple},${C.blueMid})`,
                        transition: "width 0.3s ease" }}/>
                    )}
                  </div>
                </div>
              )}
              {artworkStatus === "done" && artworkProgress.current && (
                <p style={{ fontSize: 12, color: "#4ade80", marginBottom: 10 }}>{artworkProgress.current}</p>
              )}
              <button
                onClick={fetchArtwork}
                disabled={artworkStatus === "running"}
                style={{ ...actionBtn(artworkStatus === "running" ? "rgba(255,255,255,0.1)" : undefined),
                  cursor: artworkStatus === "running" ? "not-allowed" : "pointer" }}>
                {artworkStatus === "running" ? "Fetching artwork…" : "Fetch missing artwork"}
              </button>
            </div>
          )}

          {/* ── ListenBrainz ── */}




          {/* ── Backup ── */}
          {tab === "backup" && (
            <div>
              <SectionHead title="Backup your library" />
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
                Save a full backup of your record collection to a JSON file.
              </p>
              <button onClick={doBackup} style={actionBtn()}>Save backup…</button>

              <SectionHead title="Restore from backup" />
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
                Restore records from a previously saved backup file. Existing records with matching IDs will be updated; new records will be added.
              </p>
              <button onClick={doRestore} style={actionBtn(`linear-gradient(135deg,${C.blue},${C.purple})`)}>
                Restore backup…
              </button>

              {backupMsg && <p style={{ margin: "14px 0 0", fontSize: 12,
                color: backupMsg.includes("saved")||backupMsg.includes("Restored") ? "#4ade80" : "#f87171" }}>
                {backupMsg}
              </p>}
            </div>
          )}
        </div>
        {/* Resize handle */}
        <div onMouseDown={onResizeStart}
          style={{ position: "absolute", bottom: 0, right: 0, width: 18, height: 18,
            cursor: "se-resize", display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
            padding: "3px", opacity: 0.35 }}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="9" y1="1" x2="1" y2="9" stroke="#7c3aed" strokeWidth="1.5"/>
            <line x1="9" y1="5" x2="5" y2="9" stroke="#7c3aed" strokeWidth="1.5"/>
          </svg>
        </div>
        </div>{/* end inner relative wrapper */}
      </div>{/* end outer fixed modal */}
    </>
  );
}