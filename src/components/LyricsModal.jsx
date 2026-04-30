import { useState, useEffect, useRef } from "react";
import React from "react";
import { C } from "./shared";

// ♫ Music note icon in header
function MusicNotes() {
  return (
    <span style={{ fontSize: 22, letterSpacing: 2, marginRight: 8 }}>𝅘𝅥𝅮𝅘𝅥𝅮𝅘𝅥𝅯</span>
  );
}

export default function LyricsModal({ recordId, trackIndex, trackTitle, artist, albumTitle, onClose, readOnly = true }) {
  const [lyrics, setLyrics] = useState(null);
  const [source, setSource] = useState(null);
  const [geniusUrl, setGeniusUrl] = useState(null);
  const [searchLog, setSearchLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Drag state
  const [pos, setPos] = useState({ x: 0, y: 30 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);

  // Resize state
  const [size, setSize] = useState({ w: 500, h: 600 });
  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef(null);

  useEffect(() => {
    if (!dragging) return;
    const onMove = e => {
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setPos({
        x: Math.max(-800, Math.min(dragStart.current.px + dx, 800)),
        y: Math.max(0, Math.min(dragStart.current.py + dy, window.innerHeight - 60))
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = e => {
      const dw = e.clientX - resizeStart.current.mx;
      const dh = e.clientY - resizeStart.current.my;
      setSize({
        w: Math.max(340, Math.min(resizeStart.current.pw + dw, 900)),
        h: Math.max(300, Math.min(resizeStart.current.ph + dh, window.innerHeight - 100))
      });
    };
    const onUp = () => setResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [resizing]);

  const onDragStart = e => {
    if (e.target.closest("button,input,textarea,a")) return;
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  };

  const onResizeStart = e => {
    e.stopPropagation();
    setResizing(true);
    resizeStart.current = { mx: e.clientX, my: e.clientY, pw: size.w, ph: size.h };
  };

  useEffect(() => {
    loadLyrics();
  }, [recordId, trackIndex]);

  const loadLyrics = async () => {
    setLoading(true);
    setError(null);
    setGeniusUrl(null);
    try {
      const res = await window.api.getLyrics({ recordId, trackIndex, artist, title: trackTitle });
      if (res.ok) {
        setLyrics(res.lyrics || null);
        setSource(res.source);
        setGeniusUrl(res.geniusUrl || null);
        setSearchLog(res.searchLog || []);
        setEditText(res.lyrics || "");
      } else {
        setError(res.error || "Lyrics not found");
        setSearchLog(res.searchLog || []);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const startEdit = () => {
    setEditText(lyrics || "");
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    await window.api.saveLyrics({ recordId, trackIndex, trackTitle, lyrics: editText });
    setLyrics(editText);
    setSource("manual");
    setEditing(false);
    setSaving(false);
    setSaveMsg("Saved!");
    setTimeout(() => setSaveMsg(""), 2000);
  };

  const clearLyrics = async () => {
    await window.api.deleteLyrics({ recordId, trackIndex });
    setLyrics(null);
    setSource(null);
    setEditing(false);
    setEditText("");
    loadLyrics(); // re-fetch
  };

  const sourceLabel = {
    "lyrics.ovh": "lyrics.ovh",
    "genius": "Genius",
    "manual": "Manually entered",
  }[source] || source;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 500, pointerEvents: "none" }}/>
      <div
        style={{
          position: "fixed",
          top: pos.y,
          left: `calc(50% + ${pos.x}px)`,
          transform: "translateX(-50%)",
          width: size.w,
          height: size.h,
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          boxShadow: `0 0 60px rgba(124,58,237,0.25)`,
          zIndex: 501,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          pointerEvents: "auto",
          userSelect: dragging || resizing ? "none" : "auto",
          minWidth: 340,
          minHeight: 300,
        }}
      >
        {/* Drag handle / header */}
        <div onMouseDown={onDragStart}
          style={{ cursor: dragging ? "grabbing" : "grab",
            padding: "14px 16px 12px",
            borderBottom: `1px solid ${C.border}`,
            background: `linear-gradient(180deg,rgba(124,58,237,0.12),transparent)`,
            flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: 0, flex: 1 }}>
              <MusicNotes />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {trackTitle || "Unknown Track"}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {artist && <span>{artist}</span>}
                  {albumTitle && <span style={{ color: C.textDim }}> · {albumTitle}</span>}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 10 }}>
              {!editing && lyrics && (
                <button onClick={startEdit}
                  style={{ padding: "4px 10px", fontSize: 11, border: `1px solid ${C.border}`,
                    borderRadius: 6, background: "rgba(124,58,237,0.12)", color: C.purpleLight, cursor: "pointer" }}>
                  ✏️ Edit
                </button>
              )}
              {!editing && !lyrics && !loading && (
                <button onClick={startEdit}
                  style={{ padding: "4px 10px", fontSize: 11, border: `1px solid ${C.border}`,
                    borderRadius: 6, background: "rgba(124,58,237,0.12)", color: C.purpleLight, cursor: "pointer" }}>
                  ✏️ Add lyrics
                </button>
              )}
              <button onClick={onClose}
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
                  borderRadius: 6, color: C.textMuted, width: 26, height: 26,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: 12, color: C.textMuted }}>
              <div style={{ fontSize: 32, animation: "spin 2s linear infinite" }}>𝅘𝅥𝅮</div>
              <span style={{ fontSize: 13 }}>Searching for lyrics…</span>
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {!loading && editing && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 10 }}>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                placeholder="Paste or type lyrics here…"
                style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
                  borderRadius: 8, color: C.text, fontSize: 13, lineHeight: 1.8,
                  padding: "12px 14px", resize: "none", outline: "none", fontFamily: "inherit",
                  boxShadow: "inset 0 2px 6px rgba(0,0,0,0.3)" }}
                autoFocus
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {lyrics && (
                  <button onClick={clearLyrics}
                    style={{ padding: "6px 12px", fontSize: 12, border: "1px solid rgba(248,113,113,0.3)",
                      borderRadius: 6, background: "transparent", color: "#f87171", cursor: "pointer" }}>
                    Clear & re-fetch
                  </button>
                )}
                <button onClick={() => setEditing(false)}
                  style={{ padding: "6px 14px", fontSize: 12, border: `1px solid ${C.border}`,
                    borderRadius: 6, background: "transparent", color: C.textMuted, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={saveEdit} disabled={saving}
                  style={{ padding: "6px 16px", fontSize: 12, border: "none", borderRadius: 6,
                    background: `linear-gradient(135deg,${C.purple},${C.blueMid})`,
                    color: "#fff", cursor: "pointer", fontWeight: 500 }}>
                  {saving ? "Saving…" : "Save lyrics"}
                </button>
              </div>
            </div>
          )}

          {!loading && !editing && lyrics && (
            <>
              <pre style={{ fontSize: 13, lineHeight: 1.9, color: C.text,
                whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit",
                margin: 0 }}>
                {lyrics}
              </pre>
              {source && (
                <div style={{ marginTop: 16, fontSize: 11, color: C.textDim, textAlign: "right" }}>
                  Source: {sourceLabel}
                  {source !== "manual" && (
                    <button onClick={clearLyrics}
                      style={{ marginLeft: 10, fontSize: 11, background: "none", border: "none",
                        color: C.textDim, cursor: "pointer", textDecoration: "underline" }}>
                      Clear & re-fetch
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {!loading && !editing && !lyrics && geniusUrl && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: 16, textAlign: "center" }}>
              <div style={{ fontSize: 32 }}>🎵</div>
              {searchLog.length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: "10px 16px", textAlign: "left", width: "100%" }}>
                  {searchLog.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.textDim, padding: "2px 0" }}>✗ {s}</div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>Found on Genius</div>
              <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, maxWidth: 300 }}>
                Genius doesn't provide raw lyrics via their API. You can view them on their website, then paste them here manually.
              </div>
              <a href={geniusUrl} target="_blank" rel="noreferrer"
                style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  background: `linear-gradient(135deg,#f59e0b,#d97706)`, color: "#000",
                  textDecoration: "none", cursor: "pointer" }}>
                Open on Genius ↗
              </a>
              <button onClick={startEdit}
                style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13,
                  border: `1px solid ${C.border}`, background: "transparent",
                  color: C.textMuted, cursor: "pointer" }}>
                Paste lyrics manually
              </button>
            </div>
          )}

          {!loading && !editing && !lyrics && !geniusUrl && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: 16, textAlign: "center" }}>
              <div style={{ fontSize: 32 }}>🎵</div>
              <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>Lyrics not found</div>
              {searchLog.length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: "10px 16px", textAlign: "left", width: "100%" }}>
                  {searchLog.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.textDim, padding: "2px 0" }}>✗ {s}</div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 13, color: C.textMuted }}>
                {error || "No lyrics found for this track."}
              </div>
              <button onClick={startEdit}
                style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, border: "none",
                  background: `linear-gradient(135deg,${C.purple},${C.blueMid})`,
                  color: "#fff", cursor: "pointer", fontWeight: 500 }}>
                Add lyrics manually
              </button>
            </div>
          )}

          {saveMsg && (
            <div style={{ position: "fixed", bottom: 40, left: "50%", transform: "translateX(-50%)",
              background: "#4ade80", color: "#0a0a0a", padding: "6px 16px", borderRadius: 8,
              fontSize: 13, fontWeight: 500 }}>
              {saveMsg}
            </div>
          )}
        </div>

        {/* Resize handle */}
        <div onMouseDown={onResizeStart}
          style={{ position: "absolute", bottom: 0, right: 0, width: 18, height: 18,
            cursor: "se-resize", display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
            padding: "3px", opacity: 0.4 }}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="9" y1="1" x2="1" y2="9" stroke={C.border} strokeWidth="1.5"/>
            <line x1="9" y1="5" x2="5" y2="9" stroke={C.border} strokeWidth="1.5"/>
          </svg>
        </div>
      </div>
    </>
  );
}
