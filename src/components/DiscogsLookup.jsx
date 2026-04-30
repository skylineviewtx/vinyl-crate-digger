import { useState, useEffect, useRef } from "react";
import React from "react";
import { C } from "./shared";

const sinp = {
  fontSize: 13, padding: "7px 10px", border: `1px solid ${C.border}`,
  borderRadius: 6, background: "rgba(255,255,255,0.05)", color: C.text,
  width: "100%", boxSizing: "border-box", outline: "none", marginBottom: 10
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

function ResultCard({ result, onSelect, selected }) {
  return (
    <div onClick={() => onSelect(result)}
      style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer",
        border: `1px solid ${selected ? C.purple : C.border}`,
        background: selected ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.02)",
        transition: "border-color 0.15s" }}>
      {result.thumb
        ? <img src={result.thumb} alt="" style={{ width: 48, height: 48, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
        : <div style={{ width: 48, height: 48, borderRadius: 5, background: "rgba(124,58,237,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>♪</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.text,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {result.title}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
          {[result.country, result.year].filter(Boolean).join(" · ")}
          {result.label && ` · ${result.label}`}
        </div>
        <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>{result.format}</div>
      </div>
    </div>
  );
}

export default function DiscogsLookup({ onFill, onClose, initialBarcode, initialQuery }) {
  const [mode, setMode]                   = useState(initialBarcode ? "barcode" : "search");
  const [pos, setPos] = React.useState({ x: 0, y: 20 });
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
  const [size, setSize] = React.useState({ w: 560, h: 600 });
  const [resizing, setResizing] = React.useState(false);
  const resizeStart = React.useRef(null);
  React.useEffect(() => {
    if (!resizing) return;
    const onMove = e => {
      const dw = e.clientX - resizeStart.current.mx;
      const dh = e.clientY - resizeStart.current.my;
      setSize({
        w: Math.max(400, Math.min(resizeStart.current.pw + dw, 1100)),
        h: Math.max(300, Math.min(resizeStart.current.ph + dh, window.innerHeight - 40))
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
  const [query, setQuery]                 = useState(initialQuery || "");
  const [barcode, setBarcode]             = useState(initialBarcode || "");
  const [results, setResults]             = useState([]);
  const [selected, setSelected]           = useState(null);
  const [detail, setDetail]               = useState(null);
  const [loading, setLoading]             = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filling, setFilling]             = useState(false);
  const [error, setError]                 = useState("");

  // Auto-search on open if initial values were passed in from the record form
  useEffect(() => {
    if (initialBarcode) doBarcodeSearch();
    else if (initialQuery) doSearch();
  }, []);

  const doSearch = async () => {
    const q = query.trim();
    if (!q) { setError("Please enter a search term."); return; }
    setError(""); setLoading(true); setResults([]); setSelected(null); setDetail(null);
    const res = await window.api.discogsSearch({ query: q });
    if (!res.ok) setError(res.error);
    else setResults(res.results);
    setLoading(false);
  };

  const doBarcodeSearch = async () => {
    // Strip non-digits that scanners sometimes emit
    const bc = barcode.trim().replace(/\D/g, "");
    if (!bc) { setError("Please enter a barcode."); return; }
    setError(""); setLoading(true); setResults([]); setSelected(null); setDetail(null);
    const res = await window.api.discogsLookupBarcode(bc);
    if (!res.ok) setError(res.error + " Try the title search instead.");
    else setResults(res.results);
    setLoading(false);
  };

  const selectResult = async (result) => {
    setSelected(result);
    setDetail(null);
    if (!result.resource_url) return;
    setLoadingDetail(true);
    const res = await window.api.discogsGetRelease({ resourceUrl: result.resource_url });
    if (res.ok) setDetail(res.data);
    setLoadingDetail(false);
  };

  const handleFill = async () => {
    if (!selected) return;
    const data = detail || {};

    // Fetch images via main process to avoid CORS — main.js discogs:fetchImageBase64
    // uses Node https which has no origin restrictions
    let images = [null, null, null, null];
    if (detail?.images?.length) {
      const token = await window.api.getSetting("discogs_token");
      const imgList = detail.images.filter(i => i.uri).slice(0, 4);
      const fetched = await Promise.all(
        imgList.map(img => window.api.discogsFetchImage(img.uri, token).catch(() => null))
      );
      fetched.forEach((b64, i) => { if (b64) images[i] = b64; });
    }

    onFill({ ...data, images, barcode: mode === "barcode" ? barcode.trim().replace(/\D/g, "") : (data.barcode || "") });
    onClose();
  };

  const modeBtn = (m) => ({
    padding: "6px 16px", fontSize: 12, cursor: "pointer", border: "none", borderRadius: 6,
    background: mode === m ? `linear-gradient(135deg,${C.purple},${C.blueMid})` : "transparent",
    color: mode === m ? "#fff" : C.textMuted, fontWeight: mode === m ? 500 : 400
  });

  return (
    <>
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 400, pointerEvents: "none" }}/>
    <div style={{ position: "fixed", top: pos.y, left: `calc(50% + ${pos.x}px)`, transform: "translateX(-50%)",
      background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: "24px 28px", width: size.w, height: size.h, display: "flex", flexDirection: "column",
      boxShadow: `0 0 60px rgba(124,58,237,0.25)`, zIndex: 401, overflow: "hidden",
      userSelect: dragging || resizing ? "none" : "auto", pointerEvents: "auto" }}>
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div onMouseDown={onDragStart}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14,
            cursor: dragging ? "grabbing" : "grab", userSelect: "none" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500, color: C.text, pointerEvents: "none" }}>Discogs Lookup</h2>
          <span onClick={onClose} style={{ cursor: "pointer", fontSize: 18, color: C.textMuted }}>✕</span>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)",
          borderRadius: 8, padding: 4, marginBottom: 14, width: "fit-content" }}>
          <button onClick={() => { setMode("search"); setError(""); setResults([]); setSelected(null); setDetail(null); setQuery(initialQuery || query); }}
            style={modeBtn("search")}>Title search</button>
          <button onClick={() => { setMode("barcode"); setError(""); setResults([]); setSelected(null); setDetail(null); }}
            style={modeBtn("barcode")}>Barcode</button>
        </div>

        {/* Inputs */}
        {mode === "search" ? (
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch()}
              placeholder="Artist, album title, or both…"
              style={{ ...sinp, marginBottom: 0, flex: 1 }} />
            <button onClick={doSearch}
              style={{ padding: "7px 18px", fontSize: 13, fontWeight: 500, border: "none",
                borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap",
                background: `linear-gradient(135deg,${C.purple},${C.blueMid})`, color: "#fff" }}>
              Search
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            <input value={barcode} onChange={e => setBarcode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doBarcodeSearch()}
              placeholder="Enter barcode (UPC / EAN)…"
              style={{ ...sinp, marginBottom: 0, flex: 1 }} />
            <button onClick={doBarcodeSearch}
              style={{ padding: "7px 18px", fontSize: 13, fontWeight: 500, border: "none",
                borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap",
                background: `linear-gradient(135deg,${C.purple},${C.blueMid})`, color: "#fff" }}>
              Lookup
            </button>
          </div>
        )}

        {error && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#f87171" }}>{error}</p>}

        {/* Results + detail */}
        <div style={{ flex: 1, overflowY: "auto", marginTop: 14, paddingRight: 4 }}>
          <style>{`::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${C.purpleDim};border-radius:2px}`}</style>

          {loading && (
            <div style={{ textAlign: "center", padding: "30px 0", color: C.textMuted, fontSize: 13 }}>
              Searching Discogs…
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 8 }}>
                {results.length} result{results.length !== 1 ? "s" : ""} — select one to preview
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {results.map(r => (
                  <ResultCard key={r.discogs_id} result={r}
                    selected={selected?.discogs_id === r.discogs_id} onSelect={selectResult} />
                ))}
              </div>
            </>
          )}

          {selected && (
            <>
              <SectionHead title="Preview" />
              {loadingDetail ? (
                <div style={{ fontSize: 12, color: C.textMuted, padding: "8px 0" }}>Loading details…</div>
              ) : detail ? (
                <div style={{ background: "rgba(124,58,237,0.06)", border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: "12px 14px", fontSize: 12 }}>
                  {[
                    ["Artist",     detail.artist],
                    ["Title",      detail.title],
                    ["Label",      detail.label],
                    ["Cat #",      detail.cat_no],
                    ["Year",       detail.year],
                    ["Country",    detail.country],
                    ["Format",     detail.format],
                    ["Genre",      detail.genre],
                    ["Tracks",     detail.tracks?.length || "—"],
                    ["Low",        detail.low_value  ? `$${detail.low_value}`  : null],
                    ["Est. Value", detail.est_value  ? `$${detail.est_value}`  : null],
                    ["High",       detail.high_value ? `$${detail.high_value}` : null],
                  ].map(([label, val]) => val ? (
                    <div key={label} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                      <span style={{ color: C.textDim, minWidth: 72 }}>{label}</span>
                      <span style={{ color: C.text }}>{val}</span>
                    </div>
                  ) : null)}
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose}
            style={{ padding: "8px 18px", border: `1px solid ${C.border}`, borderRadius: 7,
              background: "transparent", color: C.text, cursor: "pointer", fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={async () => { setFilling(true); await handleFill(); setFilling(false); }}
            disabled={!selected || filling || loadingDetail}
            style={{ padding: "8px 22px", border: "none", borderRadius: 7, fontSize: 13, fontWeight: 500,
              cursor: selected && !filling && !loadingDetail ? "pointer" : "not-allowed",
              background: selected && !filling && !loadingDetail
                ? `linear-gradient(135deg,${C.purple},${C.blueMid})` : C.border,
              color: selected && !filling && !loadingDetail ? "#fff" : C.textDim }}>
            {filling ? "Fetching images…" : "Fill in record"}
          </button>
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