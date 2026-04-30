import { useState } from "react";
import React from "react";
import { C, GRADES, FORMATS, GENRES, Stars } from "./shared";

const sinp = {
  fontSize: 13, padding: "7px 10px", border: `1px solid ${C.border}`,
  borderRadius: 6, background: "rgba(255,255,255,0.05)", color: C.text,
  width: "100%", boxSizing: "border-box", outline: "none"
};

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 500, letterSpacing: "0.04em" }}>{label}</label>
      {children}
    </div>
  );
}

export default function BulkEditModal({ records, selectedIds, onSave, onClose }) {
  const selected = records.filter(r => selectedIds.includes(r.id));

  const [country,    setCountry]    = useState("");
  const [year,       setYear]       = useState("");
  const [format,     setFormat]     = useState("");
  const [genre,      setGenre]      = useState("");
  const [vinylCond,  setVinylCond]  = useState("");
  const [jacketCond, setJacketCond] = useState("");
  const [rating,     setRating]     = useState(0);
  const [applyRating, setApplyRating] = useState(false);
  // Drag
  const [pos, setPos] = React.useState({ x: 0, y: 20 });
  const [dragging, setDragging] = React.useState(false);
  const dragStart = React.useRef(null);
  React.useEffect(() => {
    if (!dragging) return;
    const onMove = e => {
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setPos({
        x: Math.max(-600, Math.min(dragStart.current.px + dx, 600)),
        y: Math.max(0, Math.min(dragStart.current.py + dy, window.innerHeight - 60))
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);
  const onDragStart = e => {
    if (e.target.closest("button,input,select,textarea")) return;
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  };

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


  const sel = { ...sinp };

  const handleSave = async () => {
    const now = new Date().toISOString().replace("T"," ").substring(0,19);
    for (const rec of selected) {
      const updated = { ...rec };
      if (country.trim())   updated.country    = country.trim();
      if (year.trim())      updated.year       = year.trim();
      if (format)           updated.format     = format;
      if (genre)            updated.genre      = genre;
      if (vinylCond)        updated.vinyl_cond = vinylCond;
      if (jacketCond)       updated.jacket_cond = jacketCond;
      if (applyRating)      updated.rating     = rating;
      updated.updated_on = now;
      await window.api.saveRecord(updated);
    }
    onSave();
    onClose();
  };

  // Show mixed value hint for each field
  const mixed = (fn) => {
    const vals = [...new Set(selected.map(fn).filter(Boolean))];
    if (vals.length === 0) return null;
    if (vals.length === 1) return vals[0];
    return "Mixed";
  };

  return (
    <>
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 300, pointerEvents: "none" }}/>
    <div style={{ position: "fixed", top: pos.y, left: `calc(50% + ${pos.x}px)`, transform: "translateX(-50%)",
      background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: "24px 28px", width: size.w, height: size.h, display: "flex", flexDirection: "column",
      boxShadow: `0 0 60px rgba(124,58,237,0.2)`, zIndex: 301, overflow: "hidden",
      userSelect: dragging || resizing ? "none" : "auto", pointerEvents: "auto" }}>

        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div onMouseDown={onDragStart} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, cursor: dragging ? "grabbing" : "grab" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500, color: C.text, pointerEvents: "none" }}>Bulk Edit</h2>
          <span onClick={onClose} style={{ cursor: "pointer", fontSize: 18, color: C.textMuted }}>✕</span>
        </div>
        <p style={{ margin: "0 0 18px", fontSize: 12, color: C.textMuted }}>
          Editing {selected.length} record{selected.length !== 1 ? "s" : ""}. Leave a field blank to keep existing values.
        </p>

        <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
          <style>{`::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${C.purpleDim};border-radius:2px}`}</style>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            <Field label={`Country${mixed(r=>r.country) ? ` (${mixed(r=>r.country)})` : ""}`}>
              <input value={country} onChange={e => setCountry(e.target.value)}
                placeholder="Leave blank to keep" style={sinp}/>
            </Field>

            <Field label={`Year${mixed(r=>r.year) ? ` (${mixed(r=>r.year)})` : ""}`}>
              <input value={year} onChange={e => setYear(e.target.value.replace(/\D/,""))}
                placeholder="Leave blank to keep" maxLength={4} style={sinp}/>
            </Field>

            <Field label={`Format${mixed(r=>r.format) ? ` (${mixed(r=>r.format)})` : ""}`}>
              <select value={format} onChange={e => setFormat(e.target.value)} style={sel}>
                <option value="">— Keep existing —</option>
                {FORMATS.map(f => <option key={f}>{f}</option>)}
              </select>
            </Field>

            <Field label={`Genre${mixed(r=>r.genre) ? ` (${mixed(r=>r.genre)})` : ""}`}>
              <select value={genre} onChange={e => setGenre(e.target.value)} style={sel}>
                <option value="">— Keep existing —</option>
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>

            <Field label={`Vinyl condition${mixed(r=>r.vinyl_cond) ? ` (${mixed(r=>r.vinyl_cond)})` : ""}`}>
              <select value={vinylCond} onChange={e => setVinylCond(e.target.value)} style={sel}>
                <option value="">— Keep existing —</option>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>

            <Field label={`Jacket condition${mixed(r=>r.jacket_cond) ? ` (${mixed(r=>r.jacket_cond)})` : ""}`}>
              <select value={jacketCond} onChange={e => setJacketCond(e.target.value)} style={sel}>
                <option value="">— Keep existing —</option>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>

            <div style={{ gridColumn: "span 2" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 500, letterSpacing: "0.04em" }}>
                  Personal rating
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textDim, cursor: "pointer" }}>
                  <input type="checkbox" checked={applyRating} onChange={e => setApplyRating(e.target.checked)}
                    style={{ accentColor: C.purple, cursor: "pointer" }}/>
                  Apply to all
                </label>
                {mixed(r=>r.rating) && (
                  <span style={{ fontSize: 10, color: C.textDim }}>({mixed(r=>String(r.rating))} currently)</span>
                )}
              </div>
              <div style={{ opacity: applyRating ? 1 : 0.35, pointerEvents: applyRating ? "auto" : "none" }}>
                <Stars value={rating} onChange={setRating}/>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose}
            style={{ padding: "8px 18px", border: `1px solid ${C.border}`, borderRadius: 7,
              background: "transparent", color: C.text, cursor: "pointer", fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={handleSave}
            style={{ padding: "8px 22px", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 500,
              background: `linear-gradient(135deg,${C.purple},${C.blueMid})`, color: "#fff", cursor: "pointer" }}>
            Apply to {selected.length} record{selected.length !== 1 ? "s" : ""}
          </button>
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
