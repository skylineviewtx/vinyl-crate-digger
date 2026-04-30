import { useState, useRef, useEffect } from "react";
import React from "react";
import { createPortal } from "react-dom";
import { C, GRADES, FORMATS, GENRES, STYLES, LOCATIONS, RECORD_SIZES, RPMS, CHANNELS, EMPTY_RECORD, Stars, SectionHead, F, inp } from "./shared";
import DiscogsLookup from "./DiscogsLookup";
import MusicBrainzLookup from "./MusicBrainzLookup";
import LyricsModal from "./LyricsModal";

function ImgSlot({ img, index, onSelect, onRemove, onView }) {
  const ref = useRef();
  return (
    <div onClick={() => ref.current.click()}
      style={{ position: "relative", aspectRatio: "1/1", border: `1px dashed ${C.border}`,
        borderRadius: 8, overflow: "hidden", cursor: "pointer",
        background: "rgba(124,58,237,0.05)", display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
      <input ref={ref} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={e => onSelect(e.target.files, index)} />
      {img ? (
        <>
          <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <button onClick={e => { e.stopPropagation(); onRemove(index); }}
            style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)",
              color: "#fff", border: "none", borderRadius: 4, width: 20, height: 20,
              cursor: "pointer", fontSize: 11, padding: 0 }}>✕</button>
          <button onClick={e => { e.stopPropagation(); onView(img); }}
            style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.7)",
              color: "#fff", border: "none", borderRadius: 4, width: 20, height: 20,
              cursor: "pointer", fontSize: 11, padding: 0 }}>⤢</button>
        </>
      ) : (
        <>
          <span style={{ fontSize: 18, color: C.textDim }}>+</span>
          <span style={{ fontSize: 10, color: C.textDim }}>Photo {index + 1}</span>
        </>
      )}
    </div>
  );
}

function TrackList({ tracks, onChange, onLyrics, recordId, cachedLyrics = new Set() }) {
  const add = () => onChange([...tracks, { title: "", mins: "", secs: "" }]);
  const remove = i => onChange(tracks.filter((_, j) => j !== i));
  const upd = (i, f, v) => onChange(tracks.map((t, j) => j === i ? { ...t, [f]: v } : t));
  const total = tracks.reduce((a, t) => a + (parseInt(t.mins)||0)*60 + (parseInt(t.secs)||0), 0);
  const tm = Math.floor(total/60), ts = total % 60;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: C.purpleLight }}>Track listing</span>
        {total > 0 && <span style={{ fontSize: 11, color: C.textMuted }}>Total: {tm}:{String(ts).padStart(2,"0")}</span>}
      </div>
      {tracks.map((tr, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "20px 1fr 36px 36px 46px 16px",
          gap: 5, marginBottom: 5, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: C.textDim, textAlign: "right" }}>{i+1}</span>
          <input value={tr.title} onChange={e => upd(i,"title",e.target.value)}
            placeholder="Track title" style={{ ...inp, fontSize: 12, padding: "5px 8px" }} />
          <input value={tr.mins} onChange={e => upd(i,"mins",e.target.value.replace(/\D/,""))}
            placeholder="m" maxLength={3} style={{ ...inp, fontSize: 12, padding: "5px 6px", textAlign: "center" }} />
          <input value={tr.secs} onChange={e => upd(i,"secs",e.target.value.replace(/\D/,""))}
            placeholder="ss" maxLength={2} style={{ ...inp, fontSize: 12, padding: "5px 6px", textAlign: "center" }} />
          {(recordId && tr.title)
            ? <button onClick={() => onLyrics && onLyrics(i, tr.title)}
                style={{ fontSize: 10, padding: "2px 6px",
                  border: cachedLyrics.has(i) ? `1px solid ${C.purple}` : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 4,
                  background: cachedLyrics.has(i) ? `linear-gradient(135deg,${C.purple},${C.blueMid})` : "transparent",
                  color: cachedLyrics.has(i) ? "#fff" : "rgba(255,255,255,0.18)",
                  cursor: "pointer", whiteSpace: "nowrap",
                  boxShadow: cachedLyrics.has(i) ? `0 0 8px rgba(124,58,237,0.4)` : "none" }}>
                Lyrics
              </button>
            : <span />}
          {tracks.length > 1
            ? <span onClick={() => remove(i)} style={{ cursor: "pointer", color: C.textDim, fontSize: 12, textAlign: "center" }}>✕</span>
            : <span />}
        </div>
      ))}
      <button onClick={add}
        style={{ fontSize: 11, padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: 5,
          background: "transparent", color: C.textMuted, cursor: "pointer", marginTop: 2 }}>
        + Add track
      </button>
    </div>
  );
}

export default function RecordModal({ record, user, onSave, onClose, onNowPlaying }) {
  const [form, setForm] = useState({ ...EMPTY_RECORD, ...record });
  const [showDiscogs, setShowDiscogs] = useState(false);
  const [showMusicBrainz, setShowMusicBrainz] = useState(false);
  const [valueHistory, setValueHistory] = useState([]);
  const [lyricsTrack, setLyricsTrack] = useState(null);
  const [cachedLyricsTracks, setCachedLyricsTracks] = useState(new Set());
  const [dynGenres, setDynGenres] = useState(GENRES);
  const [dynStyles, setDynStyles] = useState(STYLES);
  const [dynFormats, setDynFormats] = useState(FORMATS);
  const [dynLocations, setDynLocations] = useState(LOCATIONS);
  const [lightbox, setLightbox] = useState(null);

  // Drag
  const [pos, setPos] = React.useState({ x: 0, y: 20 });
  const [dragging, setDragging] = React.useState(false);
  const dragStart = React.useRef(null);
  React.useEffect(() => {
    if (!dragging) return;
    const onMove = e => { const dx = e.clientX - dragStart.current.mx; const dy = e.clientY - dragStart.current.my; setPos({ x: Math.max(-600, Math.min(dragStart.current.px + dx, 600)), y: Math.max(0, Math.min(dragStart.current.py + dy, window.innerHeight - 60)) }); };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  // Resize
  const [size, setSize] = React.useState({ w: 700, h: 700 });
  const [resizing, setResizing] = React.useState(false);
  const resizeStart = React.useRef(null);
  React.useEffect(() => {
    if (!resizing) return;
    const onMove = e => { const dw = e.clientX - resizeStart.current.mx; const dh = e.clientY - resizeStart.current.my; setSize({ w: Math.max(500, Math.min(resizeStart.current.pw + dw, 1200)), h: Math.max(400, Math.min(resizeStart.current.ph + dh, window.innerHeight - 40)) }); };
    const onUp = () => setResizing(false);
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [resizing]);

  const onDragStart = e => { if (e.target.closest("button,input,select,textarea,span")) return; setDragging(true); dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }; };
  const onResizeStart = e => { e.stopPropagation(); setResizing(true); resizeStart.current = { mx: e.clientX, my: e.clientY, pw: size.w, ph: size.h }; };

  React.useEffect(() => {
    if (record?.id) {
      window.api.getValueHistory(record.id).then(h => setValueHistory(h || []));
      window.api.getCachedLyricsTracks(record.id).then(idxs => setCachedLyricsTracks(new Set(idxs || [])));
    }
  }, [record?.id]);

  React.useEffect(() => {
    window.api.getSetting("list_genres").then(v => { if (v) try { setDynGenres(JSON.parse(v)); } catch {} });
    window.api.getSetting("list_styles").then(v => { if (v) try { setDynStyles(JSON.parse(v)); } catch {} });
    window.api.getSetting("list_formats").then(v => { if (v) try { setDynFormats(JSON.parse(v)); } catch {} });
    window.api.getSetting("list_locations").then(v => { if (v) try { setDynLocations(JSON.parse(v)); } catch {} });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const sel = { ...inp };

  const handleFill = (data) => {
    setForm(f => ({ ...f,
      artist: data.artist || f.artist, title: data.title || f.title,
      label: data.label || f.label, cat_no: data.cat_no || f.cat_no,
      country: data.country || f.country, year: data.year || f.year,
      format: data.format || f.format, discs: data.discs || f.discs,
      genre: data.genre || f.genre, notes: data.notes || f.notes,
      low_value: data.low_value || f.low_value, est_value: data.est_value || f.est_value,
      high_value: data.high_value || f.high_value, barcode: data.barcode || f.barcode,
      tracks: data.tracks?.length ? data.tracks : f.tracks,
      num_tracks: data.tracks?.length ? data.tracks.length : (f.num_tracks || f.tracks?.length || ""),
      images: data.images?.some(Boolean) ? data.images.map((incoming, i) => incoming || f.images[i] || null) : f.images,
    }));
  };

  const handleImages = (files, start) => {
    const imgs = [...form.images]; let slot = start;
    for (const f of Array.from(files)) {
      while (slot < 4 && imgs[slot] !== null) slot++;
      if (slot >= 4) break;
      const targetSlot = slot; imgs[slot] = "pending";
      const reader = new FileReader();
      reader.onload = e => { setForm(prev => { const updated = [...prev.images]; updated[targetSlot] = e.target.result; return { ...prev, images: updated }; }); };
      reader.readAsDataURL(f); slot++;
    }
  };

  const removeImage = i => { const imgs = [...form.images]; imgs[i] = null; set("images", imgs); };

  const save = () => {
    if (!form.artist || !form.title) return alert("Artist and Title are required.");
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);
    onSave({ ...form, added_on: form.added_on || now, updated_on: now, updated_by: user });
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, pointerEvents: "none" }}/>
      <div style={{ position: "fixed", top: pos.y, left: `calc(50% + ${pos.x}px)`, transform: "translateX(-50%)",
        background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`,
        width: size.w + "px", height: size.h + "px",
        boxShadow: `0 0 60px rgba(124,58,237,0.2)`, zIndex: 201,
        display: "flex", flexDirection: "column", overflow: "hidden",
        userSelect: dragging || resizing ? "none" : "auto", pointerEvents: "auto" }}>
        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", padding: "24px 28px", boxSizing: "border-box", overflow: "hidden" }}>

        <div onMouseDown={onDragStart}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
            cursor: dragging ? "grabbing" : "grab" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500, color: C.text, pointerEvents: "none" }}>
            {form.id ? "Edit record" : "Add record"}
          </h2>
          <span onClick={onClose} style={{ cursor: "pointer", fontSize: 18, color: C.textMuted }}>✕</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          background: "rgba(124,58,237,0.08)", border: `1px solid ${C.border}`,
          borderRadius: 10, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: `radial-gradient(circle,${C.purpleDim},${C.bg})`,
            border: `1px solid ${C.purple}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.purpleLight }}/>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: C.purpleLight }}>Auto-fill from database</p>
            <p style={{ margin: 0, fontSize: 11, color: C.textMuted }}>Search by title or scan a barcode to fill in record details automatically.</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setShowDiscogs(true)}
              style={{ padding: "7px 14px", fontSize: 12, fontWeight: 500, border: "none",
                borderRadius: 7, cursor: "pointer", whiteSpace: "nowrap",
                background: `linear-gradient(135deg,${C.purple},${C.blueMid})`, color: "#fff" }}>Discogs</button>
            <button onClick={() => setShowMusicBrainz(true)}
              style={{ padding: "7px 14px", fontSize: 12, fontWeight: 500, border: "none",
                borderRadius: 7, cursor: "pointer", whiteSpace: "nowrap",
                background: `linear-gradient(135deg,#c05621,#7b341e)`, color: "#fff" }}>MusicBrainz</button>
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <SectionHead title="Identity" />
            <F label="Artist / Band"><input value={form.artist} onChange={e => set("artist",e.target.value)} style={inp} placeholder="e.g. Miles Davis" /></F>
            <F label="Album title"><input value={form.title} onChange={e => set("title",e.target.value)} style={inp} placeholder="e.g. Kind of Blue" /></F>
            <F label="Record label" half><input value={form.label} onChange={e => set("label",e.target.value)} style={inp} /></F>
            <F label="CAT #" half><input value={form.cat_no} onChange={e => set("cat_no",e.target.value)} style={inp} /></F>
            <F label="Runout #" half><input value={form.runout} onChange={e => set("runout",e.target.value)} style={inp} /></F>
            <F label="Barcode" half><input value={form.barcode} onChange={e => set("barcode",e.target.value)} style={inp} placeholder="UPC / EAN" /></F>
            <F label="Country" half><input value={form.country} onChange={e => set("country",e.target.value)} style={inp} /></F>
            <F label="Year" half><input value={form.year} onChange={e => set("year",e.target.value)} style={inp} maxLength={4} /></F>
            <F label="Format" half><select value={form.format} onChange={e => set("format",e.target.value)} style={sel}>{dynFormats.map(f => <option key={f}>{f}</option>)}</select></F>
            <F label="Channels" half><select value={form.channels} onChange={e => set("channels",e.target.value)} style={sel}><option value="">—</option>{CHANNELS.map(c => <option key={c}>{c}</option>)}</select></F>
            <F label="# of discs" half><input type="number" min={1} value={form.discs} onChange={e => set("discs",e.target.value)} style={inp} /></F>
            <F label="# of tracks" half><input type="number" min={0} value={form.num_tracks} onChange={e => set("num_tracks",e.target.value)} style={inp} /></F>
            <F label="Record size" half><select value={form.record_size} onChange={e => set("record_size",e.target.value)} style={sel}><option value="">—</option>{RECORD_SIZES.map(s => <option key={s}>{s}</option>)}</select></F>
            <F label="RPM" half><select value={form.rpm} onChange={e => set("rpm",e.target.value)} style={sel}><option value="">—</option>{RPMS.map(r => <option key={r}>{r}</option>)}</select></F>
            <F label="Genre" half><select value={form.genre} onChange={e => set("genre",e.target.value)} style={sel}><option value="">— Select —</option>{dynGenres.map(g => <option key={g}>{g}</option>)}</select></F>
            <F label="Style" half><select value={form.style} onChange={e => set("style",e.target.value)} style={sel}><option value="">— Select —</option>{dynStyles.map(s => <option key={s}>{s}</option>)}</select></F>

            <SectionHead title="Condition & Value" />
            <F label="Vinyl condition" half><select value={form.vinyl_cond} onChange={e => set("vinyl_cond",e.target.value)} style={sel}><option value="">—</option>{GRADES.map(g => <option key={g}>{g}</option>)}</select></F>
            <F label="Jacket condition" half><select value={form.jacket_cond} onChange={e => set("jacket_cond",e.target.value)} style={sel}><option value="">—</option>{GRADES.map(g => <option key={g}>{g}</option>)}</select></F>
            <F label="Low value ($)" half><input value={form.low_value} onChange={e => set("low_value",e.target.value)} style={inp} placeholder="0.00" /></F>
            <F label="Est. value ($)" half><input value={form.est_value} onChange={e => set("est_value",e.target.value)} style={inp} placeholder="0.00" /></F>
            <F label="High value ($)" half><input value={form.high_value} onChange={e => set("high_value",e.target.value)} style={inp} placeholder="0.00" /></F>
            <F label="Location" half><select value={form.location} onChange={e => set("location",e.target.value)} style={sel}><option value="">— Select —</option>{dynLocations.map(l => <option key={l}>{l}</option>)}</select></F>

            {valueHistory.length > 1 && (() => {
              const low  = valueHistory.map(h => parseFloat(h.low_value)  || 0);
              const est  = valueHistory.map(h => parseFloat(h.est_value)  || 0);
              const high = valueHistory.map(h => parseFloat(h.high_value) || 0);
              const allVals = [...low, ...est, ...high].filter(v => v > 0);
              if (!allVals.length) return null;
              const minV = Math.min(...allVals), maxV = Math.max(...allVals), range = maxV - minV || 1;
              const W = 300, H = 64, pad = 8;
              const toPoints = (vals) => vals.map((v, i) => `${pad + (i/(vals.length-1))*(W-pad*2)},${pad+((maxV-v)/range)*(H-pad*2)}`).join(" ");
              const estChanged = est[est.length-1] !== est[0], lowChanged = low[low.length-1] !== low[0];
              const sv = estChanged ? est : lowChanged ? low : high;
              const sl = estChanged ? "Est" : lowChanged ? "Low" : "High";
              const diff = sv[sv.length-1] - sv[0];
              const pct = sv[0] > 0 ? ((diff/sv[0])*100).toFixed(1) : null;
              const dc = diff > 0 ? "#4ade80" : diff < 0 ? "#f87171" : C.textDim;
              return (
                <div style={{ gridColumn: "span 2", marginTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: C.textMuted }}>Value history ({valueHistory.length} snapshots)</span>
                      <span style={{ fontSize: 10, color: C.textDim }}><span style={{ color: "#60a5fa" }}>— Low</span>{"  "}<span style={{ color: C.purpleLight }}>— Est</span>{"  "}<span style={{ color: "#4ade80" }}>— High</span></span>
                    </div>
                    {diff !== 0 && pct !== null && <span style={{ fontSize: 12, fontWeight: 500, color: dc }}>{sl}: {diff > 0 ? "↑" : "↓"} ${Math.abs(diff).toFixed(2)} ({diff > 0 ? "+" : ""}{pct}%)</span>}
                    {diff === 0 && <span style={{ fontSize: 11, color: C.textDim }}>No change</span>}
                  </div>
                  <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", background: "rgba(0,0,0,0.2)", borderRadius: 6 }}>
                    {low.some(v=>v>0) && <polyline points={toPoints(low)} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round"/>}
                    {est.some(v=>v>0) && <polyline points={toPoints(est)} fill="none" stroke={C.purpleLight} strokeWidth="1.5" strokeLinejoin="round"/>}
                    {high.some(v=>v>0) && <polyline points={toPoints(high)} fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinejoin="round"/>}
                    <text x={pad} y={H-3} fontSize="9" fill={C.textDim}>${minV.toFixed(0)}</text>
                    <text x={W-pad} y={H-3} fontSize="9" fill={C.textDim} textAnchor="end">${maxV.toFixed(0)}</text>
                  </svg>
                </div>
              );
            })()}

            <SectionHead title="Rating" />
            <F label="Personal rating"><Stars value={form.rating} onChange={v => set("rating",v)} /></F>

            <SectionHead title="Photos" />
            <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
              {form.images.map((img, i) => <ImgSlot key={i} img={img} index={i} onSelect={handleImages} onRemove={removeImage} onView={setLightbox} />)}
            </div>

            <SectionHead title="Tracks" />
            <div style={{ gridColumn: "span 2" }}>
              <TrackList tracks={form.tracks} recordId={form.id} cachedLyrics={cachedLyricsTracks}
                onLyrics={(i, title) => setLyricsTrack({ index: i, title })}
                onChange={t => { setForm(f => ({ ...f, tracks: t, num_tracks: t.length > 0 ? t.length : (f.num_tracks || "") })); }} />
            </div>

            <SectionHead title="Notes" />
            <F label="Notes" full>
              <textarea value={form.notes} onChange={e => set("notes",e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} />
            </F>
          </div>

          {(form.added_on || form.updated_on) && (
            <p style={{ fontSize: 11, color: C.textDim, marginTop: 14, marginBottom: 0 }}>
              {form.added_on && `Added: ${form.added_on}`}
              {form.updated_on && form.updated_on !== form.added_on && ` · Updated: ${form.updated_on}`}
              {form.updated_by && ` by ${form.updated_by}`}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          {onNowPlaying && form.id && (
            <button onClick={() => { window.api.logPlay(form.id); onNowPlaying(form); }}
              style={{ padding: "8px 16px", border: `1px solid rgba(124,58,237,0.5)`, borderRadius: 7,
                background: "rgba(124,58,237,0.12)", color: C.purpleLight, cursor: "pointer", fontSize: 13,
                marginRight: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              ▶ Now Playing
            </button>
          )}
          <button onClick={onClose}
            style={{ padding: "8px 18px", border: `1px solid ${C.border}`, borderRadius: 7,
              background: "transparent", color: C.text, cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={save}
            style={{ padding: "8px 22px", border: "none", borderRadius: 7,
              background: `linear-gradient(135deg,${C.purple},${C.blueMid})`,
              color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Save record</button>
        </div>

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

      {showDiscogs && <DiscogsLookup onFill={handleFill} onClose={() => setShowDiscogs(false)}
        initialBarcode={form.barcode} initialQuery={[form.artist, form.title].filter(Boolean).join(" ")} />}
      {showMusicBrainz && <MusicBrainzLookup onFill={handleFill} onClose={() => setShowMusicBrainz(false)}
        initialQuery={[form.artist, form.title].filter(Boolean).join(" ")} />}
      {lyricsTrack && form.id && (
        <LyricsModal recordId={form.id} trackIndex={lyricsTrack.index} trackTitle={lyricsTrack.title}
          artist={form.artist} albumTitle={form.title}
          onClose={() => { setLyricsTrack(null); if (form.id) window.api.getCachedLyricsTracks(form.id).then(idxs => setCachedLyricsTracks(new Set(idxs || []))); }} />
      )}
      {lightbox && createPortal(
        <div onClick={() => setLightbox(null)}
          style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.92)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <style>{`@keyframes lbFadeIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}`}</style>
          <img src={lightbox} alt=""
            style={{ maxWidth: "92vw", maxHeight: "92vh", objectFit: "contain", borderRadius: 8,
              boxShadow: "0 0 80px rgba(0,0,0,0.8)", animation: "lbFadeIn 0.18s ease both" }}/>
          <button onClick={e => { e.stopPropagation(); setLightbox(null); }}
            style={{ position: "fixed", top: 20, right: 24, background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#fff",
              fontSize: 20, width: 40, height: 40, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>,
        document.body
      )}
    </>
  );
}
