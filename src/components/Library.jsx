import React, { useState, useEffect, useRef } from "react";
import { playAdd, playSave, playDelete, loadSoundConfigs } from "../sounds";
import { C, EMPTY_RECORD, VinylSVG, Waveform, setTheme, getTheme, THEME_NAMES, loadCustomTheme, applyCustomThemeCSS } from "./shared";
import RecordModal from "./RecordModal";
import RecordCard from "./RecordCard";
import RecordRow from "./RecordRow";
import StatsPanel from "./StatsPanel";
import Settings from "./Settings";
import NowPlaying from "./NowPlaying";
import BulkEditModal from "./BulkEditModal";
import ScannerMode from "./ScannerMode";

// Single modal manager — only one modal open at a time
const MODAL_NONE = null;
const MODAL_SETTINGS = "settings";
const MODAL_NOWPLAYING = "nowplaying";

export default function Library({ user, role, onLogout }) {
  const [records, setRecords] = useState([]);
  const [editRecord, setEditRecord] = useState(null);
  const [libraryTitle, setLibraryTitle] = useState("Vinyl Library");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [view, setView] = useState("grid");
  const [mainTab, setMainTab] = useState("library");
  const [search, setSearch] = useState("");
  const [filterGenre, setFilterGenre] = useState("");
  const [filterFormat, setFilterFormat] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterRated, setFilterRated] = useState(false);
  const [sortBy, setSortBy] = useState("added");
  const [openModal, setOpenModal] = useState(MODAL_NONE);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkMode, setBulkMode] = useState(false); // false = delete mode, true = bulk edit mode
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [focusedId, setFocusedId] = useState(null);
  const [zoom, setZoom] = useState(160); // card min-width in px
  const [animDuration, setAnimDuration] = useState(1.0);
  const [animRowDelay, setAnimRowDelay] = useState(150);
  const [animColDelay, setAnimColDelay] = useState(50);
  const [parallaxTilt, setParallaxTilt] = useState(10);
  const [parallaxScale, setParallaxScale] = useState(1.04);
  const [parallaxResponse, setParallaxResponse] = useState(0.08);
  const [parallaxReturn, setParallaxReturn] = useState(0.5);
  const [loadKey, setLoadKey] = useState(0); // increments on each load to retrigger animation
  const [theme, setThemeState] = useState("dark");
  const [headingSize, setHeadingSizeState] = useState(30);
  const gridRef = React.useRef(null);
  const searchRef = React.useRef(null);
  const focusSearch = () => setTimeout(() => searchRef.current ? searchRef.current.focus() : window.focus(), 50);


  useEffect(() => {
    load();
    loadSoundConfigs();
    window.api.getSetting("library_title").then(v => { if (v) setLibraryTitle(v); });
    window.api.getSetting("ui_theme").then(v => {
      const validThemes = [...THEME_NAMES, "custom"];
      if (v && validThemes.includes(v)) {
        setTheme(v);
        setThemeState(v);
        if (v === "custom") {
          const ct = loadCustomTheme();
          if (ct) applyCustomThemeCSS(ct);
        }
      }
    });
    // Load persisted zoom and animation settings
    window.api.getSetting("grid_zoom").then(v => { if (v) setZoom(parseInt(v)); });
    window.api.getSetting("font_heading_size").then(v => { if (v) setHeadingSizeState(parseInt(v)); });
    window.api.getSetting("anim_duration").then(v => { if (v) setAnimDuration(parseFloat(v)); });
    window.api.getSetting("anim_row_delay").then(v => { if (v) setAnimRowDelay(parseInt(v)); });
    window.api.getSetting("anim_col_delay").then(v => { if (v) setAnimColDelay(parseInt(v)); });
    window.api.getSetting("parallax_tilt").then(v => { if (v) setParallaxTilt(parseFloat(v)); });
    window.api.getSetting("parallax_scale").then(v => { if (v) setParallaxScale(parseFloat(v)); });
    window.api.getSetting("parallax_response").then(v => { if (v) setParallaxResponse(parseFloat(v)); });
    window.api.getSetting("parallax_return").then(v => { if (v) setParallaxReturn(parseFloat(v)); });
    // Native menu event listeners
    window.api.onMenu("menu:addRecord",      () => { setEditRecord({...EMPTY_RECORD}); playAdd(); });
    window.api.onMenu("menu:importDiscogs",  () => setOpenModal(MODAL_SETTINGS));
    window.api.onMenu("menu:exportCSV",      () => exportCSV());
    window.api.onMenu("menu:openSettings",   () => setOpenModal(MODAL_SETTINGS));
    window.api.onMenu("menu:openNowPlaying", () => setOpenModal(MODAL_NOWPLAYING));
    window.api.onMenu("menu:setView",        (v) => { setView(v); setSelectedIds([]); });
    window.api.onMenu("menu:setSort",        (s) => setSortBy(s));
  }, []);


  const load = async () => { setRecords(await window.api.getRecords()); setLoadKey(k => k + 1); };
  const save = async (record) => { await window.api.saveRecord(record); await load(); setEditRecord(null); focusSearch(); record.id ? playSave() : playAdd(); };
  const del = async (id) => { if (confirm("Remove this record?")) { await window.api.deleteRecord(id); await load(); playDelete(); } };
  const exportCSV = async () => { const r = await window.api.exportCSV(); if (r.ok) alert("Export saved."); };
  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === filtered.length ? [] : filtered.map(r => r.id));
  const deleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Remove ${selectedIds.length} record${selectedIds.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    for (const id of selectedIds) await window.api.deleteRecord(id);
    setSelectedIds([]);
    await load();
    playDelete();
  };
  const openDetail = (rec) => window.api.openAlbumDetail(rec.id);

  const handleStatsFilter = ({ type, value }) => {
    // Clear all filters first
    setSearch(""); setFilterGenre(""); setFilterFormat(""); setFilterCondition(""); setFilterRated(false);
    setMainTab("library");
    if (type === "genre")     setFilterGenre(value);
    else if (type === "format")    setFilterFormat(value);
    else if (type === "condition") setFilterCondition(value);
    else if (type === "rated")     setFilterRated(true);
    else if (type === "artist")    setSearch(value);
    else if (type === "record")    setSearch(value.title || "");
  };
  const handleZoom = (v) => { setZoom(v); window.api.setSetting("grid_zoom", String(v)); };
  const cycleTheme = () => {
    const next = THEME_NAMES[(THEME_NAMES.indexOf(theme) + 1) % THEME_NAMES.length];
    setTheme(next);
    setThemeState(next);
    setLoadKey(k => k + 1); // force re-render with new colors
    window.api.setSetting("ui_theme", next);
  };

  const openSettings = () => setOpenModal(MODAL_SETTINGS);
  const [nowPlayingRecord, setNowPlayingRecord] = useState(null);
  const openNowPlaying = (rec = null) => { setNowPlayingRecord(rec); setOpenModal(MODAL_NOWPLAYING); };
  const closeModal = () => {
      setOpenModal(MODAL_NONE);
      focusSearch();
    };

  const genres = [...new Set(records.map(r => r.genre?.trim()).filter(Boolean))].sort();
  const filtered = records
    .filter(r => {
      const q = search.toLowerCase();
      const isBarcode = /^[\d\s-]{6,}$/.test(search.trim());
      const genreMatch = !filterGenre || r.genre?.trim().toLowerCase() === filterGenre.trim().toLowerCase();
      const formatMatch = !filterFormat || r.format?.trim().toLowerCase() === filterFormat.trim().toLowerCase();
      const condMatch = !filterCondition || r.vinyl_cond === filterCondition;
      const ratedMatch = !filterRated || r.rating > 0;
      return (!q || r.artist?.toLowerCase().includes(q) || r.title?.toLowerCase().includes(q)
        || (isBarcode && (r.barcode || "").replace(/\D/g, "").includes(search.replace(/\D/g, ""))))
        && genreMatch && formatMatch && condMatch && ratedMatch;
    })
    .sort((a, b) =>
      sortBy === "year" ? (b.year||0) - (a.year||0) :
      sortBy === "rating" ? b.rating - a.rating :
      sortBy === "artist" ? (a.artist||"").localeCompare(b.artist||"") :
      b.id - a.id
    );
    useEffect(() => { setFocusedId(null); }, [search]);
  // Keyboard navigation — separate effect so it can depend on live state
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (editRecord || openModal) return;
      if (e.key === "Enter" && e.target.closest?.("input, textarea, select")) return;
      if (view !== "grid") return;
      const ids = filtered.map(r => r.id);
      if (!ids.length) return;
      const idx = focusedId ? ids.indexOf(focusedId) : -1;
      const grid = gridRef.current;
      const cols = grid ? Math.round(grid.offsetWidth / 174) : 4;
      if (e.key === "ArrowRight") { e.preventDefault(); setFocusedId(ids[Math.min(idx + 1, ids.length - 1)]); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); setFocusedId(ids[Math.max(idx - 1, 0)]); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setFocusedId(ids[Math.min(idx + cols, ids.length - 1)]); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedId(ids[Math.max(idx - cols, 0)]); }
      else if (e.key === "Enter" && focusedId) {
        const rec = filtered.find(r => r.id === focusedId);
        if (rec) setEditRecord(rec);
      }
      else if (e.key === "Escape") setFocusedId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filtered, focusedId, view, editRecord, openModal]);


  const totalVal = records.reduce((a, r) => a + (parseFloat(r.est_value)||0), 0);

  const navBtn = (active) => ({
    padding: "7px 20px", fontSize: 13, cursor: "pointer", border: "none", borderRadius: 6,
    background: active ? `linear-gradient(135deg,${C.purple},${C.blueMid})` : "rgba(255,255,255,0.04)",
    color: active ? "#fff" : C.textMuted, fontWeight: active ? 500 : 400,
    boxShadow: active
      ? "inset 0 3px 6px rgba(0,0,0,0.45), inset 0 1px 3px rgba(0,0,0,0.3)"
      : "0 4px 0 rgba(0,0,0,0.4), 0 6px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12), inset 1px 0 0 rgba(255,255,255,0.06)",
    transform: active ? "translateY(1px)" : "translateY(0)",
    transition: "all 0.1s ease",
  });

  const ctrlBtn = (active, danger) => ({
    padding: "6px 14px", fontSize: 12,
    border: `1px solid ${active ? C.purple : danger ? "rgba(248,113,113,0.3)" : C.border}`,
    borderRadius: 6,
    background: active ? `linear-gradient(135deg,${C.purple},${C.blueMid})` : "transparent",
    color: active ? "#fff" : danger ? "#f87171" : C.textMuted,
    cursor: "pointer"
  });

  return (
    <div style={{ height: "100vh", background: C.bg, display: "flex", flexDirection: "column", filter: C.appFilter || "none", overflow: "hidden" }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
        input::placeholder,textarea::placeholder{color:${C.textDim}}
        input:focus,select:focus,textarea:focus{border-color:${C.purple}!important;outline:none}
        select option{background:${C.bgCard};color:${C.text}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:${C.bgDeep}}
        ::-webkit-scrollbar-thumb{background:${C.purpleDim};border-radius:3px}
        tr:hover{background:rgba(124,58,237,0.05)}
      `}</style>

      <div style={{ position: "fixed", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(124,58,237,0.08),transparent 70%)", pointerEvents: "none", zIndex: 0 }}/>
      <div style={{ position: "fixed", bottom: -60, left: -60, width: 250, height: 250, borderRadius: "50%",
        background: "radial-gradient(circle,rgba(59,130,246,0.06),transparent 70%)", pointerEvents: "none", zIndex: 0 }}/>

      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10,
        background: C.bg,
        display: "flex", alignItems: "center", gap: 14,
        boxShadow: "0 6px 0 rgba(0,0,0,0.45), 0 10px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.3)" }}>
        <div style={{ animation: "spin 1.8s linear infinite", flexShrink: 0 }}><VinylSVG size={Math.round(headingSize * 1.6)}/></div>
        <div style={{ flex: 1 }}>
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={async () => {
                const val = titleDraft.trim() || "Vinyl Library";
                setLibraryTitle(val);
                setEditingTitle(false);
                await window.api.setSetting("library_title", val);
              }}
              onKeyDown={async e => {
                if (e.key === "Enter") {
                  const val = titleDraft.trim() || "Vinyl Library";
                  setLibraryTitle(val);
                  setEditingTitle(false);
                  await window.api.setSetting("library_title", val);
                } else if (e.key === "Escape") {
                  setEditingTitle(false);
                }
              }}
              style={{
                margin: 0, fontSize: "var(--font-heading-size)", fontFamily: "var(--font-heading)",
                fontWeight: 500, color: C.text, background: "rgba(255,255,255,0.07)",
                border: `1px solid ${C.purple}`, borderRadius: 6, padding: "2px 10px",
                outline: "none", width: 280,
              }}
            />
          ) : (
            <h1
              title="Click to rename"
              onClick={() => { setTitleDraft(libraryTitle); setEditingTitle(true); }}
              style={{
                margin: 0, fontSize: "var(--font-heading-size)", fontFamily: "var(--font-heading)",
                fontWeight: 500, color: C.text, cursor: "pointer",
                borderBottom: `1px dashed ${C.border}`,
                transition: "border-color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderBottomColor = C.purple}
              onMouseLeave={e => e.currentTarget.style.borderBottomColor = C.border}
            >
              {libraryTitle}
            </h1>
          )}
          <div style={{ display: "flex", gap: 14, marginTop: 2 }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>{records.length} record{records.length!==1?"s":""}</span>
            {totalVal > 0 && <span style={{ fontSize: 12, color: C.purpleLight }}>
              Est. ${totalVal.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
            </span>}
          </div>
        </div>
        <Waveform width={80} height={20}/>

        {/* Brightness selector */}
        <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.06)",
          borderRadius: 8, padding: 3 }}>
          {THEME_NAMES.map(t => (
            <button key={t} type="button" onClick={() => {
              setTheme(t); setThemeState(t);
              setLoadKey(k => k + 1);
              window.api.setSetting("ui_theme", t);
            }}
              style={{ padding: "4px 10px", fontSize: 10, border: "none", borderRadius: 5,
                cursor: "pointer", textTransform: "capitalize",
                background: theme === t ? `linear-gradient(135deg,${C.purple},${C.blueMid})` : "transparent",
                color: theme === t ? "#fff" : C.textMuted }}>
              {t === "dark" ? "🌑" : t === "medium" ? "🌓" : "🌕"} {t}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={openNowPlaying}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
            fontSize: 12, fontWeight: 500, border: `1px solid rgba(124,58,237,0.5)`,
            borderRadius: 7, cursor: "pointer", background: "rgba(124,58,237,0.12)",
            color: C.purpleLight }}>
          <span style={{ fontSize: 14, animation: "pulse 2s ease-in-out infinite" }}>▶</span>
          Now playing
        </button>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>{user}</span>
          {role === "admin" && (
            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4,
              background: "rgba(124,58,237,0.2)", color: C.purpleLight,
              border: `0.5px solid ${C.border}` }}>admin</span>
          )}
          <button type="button" onClick={openSettings}
            style={{ ...ctrlBtn(false), fontSize: 11, padding: "5px 10px" }}>Settings</button>
          <button type="button" onClick={onLogout}
            style={{ ...ctrlBtn(false, true), fontSize: 11, padding: "5px 10px" }}>Sign out</button>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ display: "flex", gap: 4, padding: "10px 24px 0",
        borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 9, background: C.bg, flexShrink: 0 }}>
        <button type="button" onClick={() => setMainTab("library")} style={navBtn(mainTab==="library")}>Library</button>
        <button type="button" onClick={() => setMainTab("stats")} style={navBtn(mainTab==="stats")}>Stats</button>
        <button type="button" onClick={() => setMainTab("scanner")} style={navBtn(mainTab==="scanner")}>🔍 Scanner</button>
      </div>

      {mainTab === "scanner" ? (
        <div style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 1, display: "flex" }}>
          <ScannerMode
            user={user}
            onAddRecord={record => {
              setEditRecord(record);
              setMainTab("library");
            }}
          />
        </div>
      ) : mainTab === "stats" ? (
        <div style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 1 }}>
          <StatsPanel records={records} onFilter={handleStatsFilter} onRefresh={load}/>
        </div>
      ) : (
        <>
          <div style={{ padding: "10px 24px", display: "flex", flexWrap: "wrap", gap: 8,
            alignItems: "center", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 8, background: C.bg, flexShrink: 0 }}>

            {(filterGenre || filterFormat || filterCondition || filterRated) && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
                background: "rgba(124,58,237,0.12)", border: `1px solid ${C.purple}`,
                borderRadius: 6, fontSize: 11, color: C.purpleLight }}>
                <span>Filtered: {filterGenre || filterFormat || filterCondition || (filterRated ? "Rated" : "")}</span>
                <span onClick={() => { setFilterGenre(""); setFilterFormat(""); setFilterCondition(""); setFilterRated(false); }}
                  style={{ cursor: "pointer", color: C.textMuted, fontSize: 13 }}>✕</span>
              </div>
            )}
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search artist or title, or scan a barcode…"
              style={{ fontSize: 13, padding: "7px 12px", border: `1px solid ${C.border}`, borderRadius: 6,
                background: "rgba(255,255,255,0.05)", color: C.text, minWidth: 180, flex: 1, outline: "none" }}/>
            <select value={filterGenre} onChange={e => setFilterGenre(e.target.value)}
              style={{ fontSize: 12, padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6,
                background: C.bgCard, color: C.text, outline: "none" }}>
              <option value="">All genres</option>
              {genres.map(g => <option key={g}>{g}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ fontSize: 12, padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6,
                background: C.bgCard, color: C.text, outline: "none" }}>
              <option value="added">Recently added</option>
              <option value="artist">Artist A–Z</option>
              <option value="year">Year</option>
              <option value="rating">Rating</option>
            </select>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <button type="button" onClick={() => { setView("grid"); setSelectedIds([]); setBulkMode(false); }} style={ctrlBtn(view==="grid")}>Grid</button>
              <button type="button" onClick={() => { setView("list"); setSelectedIds([]); setBulkMode(false); }} style={ctrlBtn(view==="list")}>List</button>
              {view === "grid" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 6 }}>
                  <span style={{ fontSize: 11, color: C.textDim }}>⊟</span>
                  <input type="range" min={120} max={260} step={10} value={zoom}
                    onChange={e => handleZoom(parseInt(e.target.value))}
                    style={{ width: 70, accentColor: C.purple, cursor: "pointer" }}/>
                  <span style={{ fontSize: 11, color: C.textDim }}>⊞</span>
                </div>
              )}
            </div>
            <button type="button" onClick={exportCSV}
              style={{ ...ctrlBtn(false), borderColor: "rgba(59,130,246,0.4)", color: C.blueLight }}>
              ↓ Export CSV
            </button>
            {/* Bulk edit mode toggle — only in list view */}
            {view === "list" && (
              <button type="button" onClick={() => { setBulkMode(m => !m); setSelectedIds([]); }}
                style={{ padding: "6px 14px", fontSize: 12, fontWeight: bulkMode ? 500 : 400,
                  border: `1px solid ${bulkMode ? C.purple : C.border}`, borderRadius: 6,
                  background: bulkMode ? `linear-gradient(135deg,${C.purple},${C.blueMid})` : "transparent",
                  color: bulkMode ? "#fff" : C.textMuted, cursor: "pointer" }}>
                ✎ Bulk edit{bulkMode ? " (on)" : ""}
              </button>
            )}
            {/* Delete selected — only in non-bulk mode */}
            {!bulkMode && selectedIds.length > 0 && (
              <button type="button" onClick={deleteSelected}
                style={{ padding: "7px 14px", fontSize: 12, fontWeight: 500, border: "1px solid rgba(248,113,113,0.4)",
                  borderRadius: 6, background: "rgba(248,113,113,0.1)", color: "#f87171", cursor: "pointer" }}>
                ✕ Delete {selectedIds.length} selected
              </button>
            )}
            {/* Edit selected — only in bulk mode */}
            {bulkMode && selectedIds.length > 0 && (
              <button type="button" onClick={() => setShowBulkEdit(true)}
                style={{ padding: "7px 14px", fontSize: 12, fontWeight: 500, border: `1px solid ${C.purple}`,
                  borderRadius: 6, background: `linear-gradient(135deg,${C.purple},${C.blueMid})`,
                  color: "#fff", cursor: "pointer" }}>
                ✎ Edit {selectedIds.length} selected
              </button>
            )}
            <button type="button" onClick={() => setEditRecord({...EMPTY_RECORD})}
              style={{ padding: "7px 16px", fontSize: 12, fontWeight: 500, border: "none", borderRadius: 6,
                background: `linear-gradient(135deg,${C.purple},${C.blueMid})`, color: "#fff", cursor: "pointer" }}>
              + Add record
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", position: "relative", zIndex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  <VinylSVG size={100}/>
                </div>
                <p style={{ margin: "0 0 6px", fontSize: 16, color: C.text }}>
                  {records.length === 0 ? "Your library is empty" : "No records match your search"}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>
                  {records.length === 0 ? "Add your first record to get started." : "Try adjusting your search or filters."}
                </p>
              </div>
            ) : view === "grid" ? (
              <div ref={gridRef} style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill,minmax(${zoom}px,1fr))`, gap: 14 }}>
                {filtered.map((r, i) => {
                  const COLS = gridRef.current ? Math.round(gridRef.current.offsetWidth / 174) : 4;
                  const rowDelay = Math.floor(i / COLS) * animRowDelay + (i % COLS) * animColDelay;
                  return (
                    <RecordCard key={r.id} rec={r} onEdit={setEditRecord} onDelete={del} onDetail={openDetail}
                      focused={focusedId === r.id} onFocus={() => setFocusedId(r.id)}
                      animDelay={rowDelay} loadKey={loadKey} animDuration={animDuration}
                      parallaxTilt={parallaxTilt} parallaxScale={parallaxScale}
                      parallaxResponse={parallaxResponse} parallaxReturn={parallaxReturn}/>
                  );
                })}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      <th style={{ padding: "8px 10px", width: 36 }}>
                        <input type="checkbox"
                          checked={filtered.length > 0 && selectedIds.length === filtered.length}
                          onChange={toggleSelectAll}
                          style={{ cursor: "pointer", accentColor: C.purple, width: 14, height: 14 }}/>
                      </th>
                      {["Artist","Title","Year","Genre","Format","Vinyl","Jacket","Location","Rating",""].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10,
                          fontWeight: 500, color: C.purple, letterSpacing: "0.08em",
                          textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <RecordRow key={r.id} rec={r} onEdit={setEditRecord} onDelete={del} onDetail={openDetail}
                        selected={selectedIds.includes(r.id)} onToggleSelect={toggleSelect} bulkMode={bulkMode}/>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Record edit modal — separate from main modal system */}
      {editRecord && (
        <RecordModal record={editRecord} user={user} onSave={save} onClose={() => { setEditRecord(null); focusSearch(); }}
          onNowPlaying={rec => { setEditRecord(null); openNowPlaying(rec); }} />
      )}

      {/* Bulk edit modal */}
      {showBulkEdit && (
        <BulkEditModal
          records={records}
          selectedIds={selectedIds}
          onSave={async () => { await load(); setSelectedIds([]); setBulkMode(false); }}
          onClose={() => { setShowBulkEdit(false); focusSearch(); }}/>
      )}

      {/* Main modal switcher — only one renders at a time */}
      {openModal === MODAL_SETTINGS && (
        <Settings user={user} role={role} onClose={closeModal} onRefresh={load}/>
      )}
      {openModal === MODAL_NOWPLAYING && (
        <NowPlaying onClose={() => { setNowPlayingRecord(null); closeModal(); }} initialRecord={nowPlayingRecord}/>
      )}
    </div>
  );
}