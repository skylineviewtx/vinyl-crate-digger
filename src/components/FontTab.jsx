// ── FontTab.jsx — drop-in tab for Settings.jsx ────────────────────────────────
// Import at top of Settings.jsx:
//   import FontTab from "./FontTab";
// Add to tabs array in Settings.jsx:
//   { id: "fonts", label: "Fonts" }
// Add to tab content area in Settings.jsx:
//   {tab === "fonts" && <FontTab />}

import { useState, useEffect, useRef } from "react";
import { C, FONTS, FONT_DEFAULTS, getFontSettings, setFontSettings } from "./shared";

// ── Mini font picker ──────────────────────────────────────────────────────────
function FontPicker({ value, onChange }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref                 = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = FONTS.filter(f =>
    f.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger button */}
      <div
        onClick={() => { setOpen(o => !o); setSearch(""); }}
        style={{
          padding: "8px 12px",
          border: `1px solid ${open ? C.purple : C.border}`,
          borderRadius: 8,
          background: "rgba(255,255,255,0.04)",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          transition: "border-color 0.15s",
        }}
      >
        <span style={{ fontFamily: `"${value}", sans-serif`, fontSize: 16, color: C.text }}>
          {value}
        </span>
        <span style={{ color: C.textDim, fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 500,
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
          overflow: "hidden",
        }}>
          {/* Search */}
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}` }}>
            <input
              autoFocus
              placeholder="Search fonts…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${C.border}`,
                borderRadius: 6, padding: "5px 9px",
                fontSize: 12, color: C.text, outline: "none",
              }}
            />
          </div>

          {/* Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            padding: 10,
            maxHeight: 300,
            overflowY: "auto",
          }}>
            <style>{`::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:${C.purpleDim};border-radius:2px}`}</style>
            {filtered.map(font => {
              const selected = font === value;
              return (
                <div
                  key={font}
                  onClick={() => { onChange(font); setOpen(false); }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 7,
                    border: `1px solid ${selected ? C.purple : "rgba(255,255,255,0.06)"}`,
                    background: selected
                      ? `linear-gradient(135deg,rgba(124,58,237,0.25),rgba(59,130,246,0.15))`
                      : "rgba(255,255,255,0.03)",
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={e => {
                    if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  }}
                  onMouseLeave={e => {
                    if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  }}
                >
                  {/* Font name in its own face */}
                  <div style={{
                    fontFamily: `"${font}", sans-serif`,
                    fontSize: 15,
                    color: selected ? C.purpleLight : C.text,
                    marginBottom: 3,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {font}
                  </div>
                  {/* Label in system font */}
                  <div style={{ fontSize: 9, color: C.textDim, fontFamily: "sans-serif" }}>
                    Aa Bb Cc
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ gridColumn: "span 2", textAlign: "center",
                padding: "20px 0", fontSize: 12, color: C.textDim }}>
                No fonts match "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main FontTab ──────────────────────────────────────────────────────────────
export default function FontTab() {
  const [headingFont, setHeadingFont] = useState(FONT_DEFAULTS.headingFont);
  const [bodyFont,    setBodyFont]    = useState(FONT_DEFAULTS.bodyFont);
  const [headingSize, setHeadingSize] = useState(FONT_DEFAULTS.headingSize);
  const [saved, setSaved]             = useState(false);

  // Load persisted settings on mount
  useEffect(() => {
    (async () => {
      const s = await getFontSettings();
      setHeadingFont(s.headingFont);
      setBodyFont(s.bodyFont);
      setHeadingSize(s.headingSize);
    })();
  }, []);

  const save = async () => {
    await setFontSettings({ headingFont, bodyFont, headingSize });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = async () => {
    setHeadingFont(FONT_DEFAULTS.headingFont);
    setBodyFont(FONT_DEFAULTS.bodyFont);
    setHeadingSize(FONT_DEFAULTS.headingSize);
    await setFontSettings(FONT_DEFAULTS);
  };

  const SectionHead = ({ title }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "22px 0 12px" }}>
      <div style={{ width: 3, height: 14, borderRadius: 2,
        background: `linear-gradient(to bottom,${C.purple},${C.blueMid})` }} />
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
        color: C.purpleLight, textTransform: "uppercase" }}>{title}</span>
      <div style={{ flex: 1, height: "0.5px",
        background: `linear-gradient(to right,${C.border},transparent)` }} />
    </div>
  );

  return (
    <div>
      {/* ── Heading font ── */}
      <SectionHead title="Heading font" />
      <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
        Used for the main "Vinyl Library" app title in the header.
      </p>
      <FontPicker value={headingFont} onChange={setHeadingFont} />

      {/* Heading size slider */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>Heading size</span>
          <span style={{ fontSize: 12, color: C.purpleLight, fontWeight: 500 }}>{headingSize}px</span>
        </div>
        <input
          type="range" min={30} max={60} step={1} value={headingSize}
          onChange={e => setHeadingSize(parseInt(e.target.value))}
          style={{ width: "100%", accentColor: C.purple, cursor: "pointer" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 10, color: C.textDim }}>30px</span>
          <span style={{ fontSize: 10, color: C.textDim }}>60px</span>
        </div>
      </div>

      {/* Live heading preview */}
      <div style={{
        marginTop: 14,
        padding: "14px 16px",
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${C.border}`,
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8, fontFamily: "sans-serif" }}>
          PREVIEW
        </div>
        <div style={{
          fontFamily: `"${headingFont}", sans-serif`,
          fontSize: headingSize,
          color: C.text,
          lineHeight: 1.2,
        }}>
          Dark Side of the Moon
        </div>
        <div style={{
          fontFamily: `"${headingFont}", sans-serif`,
          fontSize: Math.max(12, headingSize * 0.65),
          color: C.textMuted,
          marginTop: 4,
        }}>
          Pink Floyd · 1973
        </div>
      </div>

      {/* ── Body font ── */}
      <SectionHead title="Body font" />
      <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
        Used for labels, metadata, notes, and UI text throughout the app.
      </p>
      <FontPicker value={bodyFont} onChange={setBodyFont} />

      {/* Live body preview */}
      <div style={{
        marginTop: 14,
        padding: "14px 16px",
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${C.border}`,
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8, fontFamily: "sans-serif" }}>
          PREVIEW
        </div>
        <div style={{
          fontFamily: `"${bodyFont}", sans-serif`,
          fontSize: 13,
          color: C.text,
          lineHeight: 1.6,
        }}>
          Label: Harvest Records · CAT: SHVL 804<br/>
          Vinyl: NM · Jacket: VG+<br/>
          <span style={{ color: C.textMuted }}>Estimated value: $45 – $72</span>
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: 10, marginTop: 24, alignItems: "center" }}>
        <button
          onClick={save}
          style={{
            padding: "8px 22px", fontSize: 13, fontWeight: 500,
            border: "none", borderRadius: 7, cursor: "pointer",
            background: saved
              ? "linear-gradient(135deg,#4ade80,#22d3ee)"
              : `linear-gradient(135deg,${C.purple},${C.blueMid})`,
            color: "#fff",
            transition: "background 0.3s",
          }}
        >
          {saved ? "✓ Saved" : "Apply fonts"}
        </button>
        <button
          onClick={reset}
          style={{
            padding: "8px 16px", fontSize: 12, fontWeight: 400,
            border: `1px solid ${C.border}`, borderRadius: 7,
            background: "transparent", color: C.textMuted, cursor: "pointer",
          }}
        >
          Reset to defaults
        </button>
      </div>

      <p style={{ fontSize: 11, color: C.textDim, marginTop: 10, lineHeight: 1.5 }}>
        Font changes apply immediately. A full Google Fonts load happens on first launch — no internet connection required after that.
      </p>
    </div>
  );
}
