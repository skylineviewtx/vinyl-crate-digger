import { useState, useRef } from "react";
import React from "react";
import { C, inp } from "./shared";

export default function MusicBrainzLookup({ onFill, onClose, initialQuery = "" }) {
  const [query, setQuery]     = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [filling, setFilling] = useState(null);
  const [pos, setPos]         = React.useState({ x: 0, y: 20 });
  const [dragging, setDragging] = React.useState(false);
  const dragStart = useRef(null);

  React.useEffect(() => {
    if (!dragging) return;
    const onMove = e => {
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setPos({
        x: Math.max(-500, Math.min(dragStart.current.px + dx, 500)),
        y: Math.max(0, Math.min(dragStart.current.py + dy, window.innerHeight - 60))
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  // Resize
  const [size, setSize] = React.useState({ w: 560, h: 550 });
  const [resizing, setResizing] = React.useState(false);
  const resizeStart = React.useRef(null);
  React.useEffect(() => {
    if (!resizing) return;
    const onMove = e => {
      const dw = e.clientX - resizeStart.current.mx;
      const dh = e.clientY - resizeStart.current.my;
      setSize({
        w: Math.max(400, Math.min(resizeStart.current.pw + dw, 1100)),
        h: Math.max(280, Math.min(resizeStart.current.ph + dh, window.innerHeight - 40))
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


  const onDragStart = e => {
    if (e.target.closest("button,input,select,textarea")) return;
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  };

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true); setError(""); setResults([]);
    const res = await window.api.musicbrainzSearch(q);
    if (res.ok) setResults(res.results);
    else setError(res.error || "Search failed.");
    setLoading(false);
  };

  const fill = async (release) => {
    setFilling(release.id);
    const res = await window.api.musicbrainzGetRelease(release.id);
    if (res.ok) { onFill(res.data); onClose(); }
    else setError(res.error || "Failed to fetch release details.");
    setFilling(null);
  };

  const badge = (text, color = C.purpleDim) => (
    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4,
      background: `${color}33`, color, border: `0.5px solid ${color}55`,
      whiteSpace: "nowrap" }}>{text}</span>
  );

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 300, pointerEvents: "none" }}/>
      <div style={{ position: "fixed", top: pos.y, left: `calc(50% + ${pos.x}px)`, transform: "translateX(-50%)",
        background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: "24px 28px", width: size.w, height: size.h,
        boxShadow: `0 0 60px rgba(124,58,237,0.2)`,
        display: "flex", flexDirection: "column", zIndex: 301, overflow: "hidden",
        userSelect: dragging || resizing ? "none" : "auto", pointerEvents: "auto" }}>

        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div onMouseDown={onDragStart}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
            cursor: dragging ? "grabbing" : "grab" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%",
              background: `radial-gradient(circle,#c05621,#7b341e)`,
              border: `1px solid #dd6b20`, display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>M</span>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.text, pointerEvents: "none" }}>MusicBrainz lookup</p>
              <p style={{ margin: 0, fontSize: 11, color: C.textMuted, pointerEvents: "none" }}>Search the open music encyclopedia</p>
            </div>
          </div>
          <span onClick={onClose} style={{ cursor: "pointer", fontSize: 18, color: C.textMuted }}>✕</span>
        </div>

        {/* Search bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="Artist name, album title, or barcode…"
            style={{ ...inp, flex: 1 }} autoFocus />
          <button onClick={search}
            style={{ padding: "7px 18px", fontSize: 13, fontWeight: 500, border: "none",
              borderRadius: 7, cursor: "pointer", whiteSpace: "nowrap",
              background: `linear-gradient(135deg,#c05621,#7b341e)`, color: "#fff" }}>
            {loading ? "…" : "Search"}
          </button>
        </div>

        {error && <p style={{ fontSize: 12, color: "#f87171", margin: "0 0 10px" }}>{error}</p>}

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <style>{`::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${C.purpleDim};border-radius:2px}`}</style>

          {loading && (
            <div style={{ textAlign: "center", padding: "30px 0", fontSize: 13, color: C.textMuted }}>
              Searching MusicBrainz…
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div style={{ textAlign: "center", padding: "30px 0", fontSize: 12, color: C.textDim }}>
              Search for an artist and album title to find releases
            </div>
          )}

          {results.map(r => (
            <div key={r.id}
              style={{ padding: "12px 14px", borderRadius: 10, marginBottom: 8,
                background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.text,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</p>
                <p style={{ margin: "2px 0 6px", fontSize: 12, color: C.textMuted }}>{r.artist}</p>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {r.year    && badge(r.year,    C.purpleLight)}
                  {r.country && badge(r.country, C.blueLight)}
                  {r.label   && badge(r.label,   C.textMuted)}
                  {r.format  && badge(r.format,  "#4ade80")}
                  {r.tracks  && badge(`${r.tracks} tracks`, C.textDim)}
                </div>
              </div>
              <button onClick={() => fill(r)} disabled={filling === r.id}
                style={{ padding: "6px 14px", fontSize: 12, fontWeight: 500,
                  border: "none", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  background: filling === r.id ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg,#c05621,#7b341e)`,
                  color: "#fff" }}>
                {filling === r.id ? "Loading…" : "Use this"}
              </button>
            </div>
          ))}
        </div>
        </div>{/* end inner relative wrapper */}
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
      </div>
    </>
  );
}
