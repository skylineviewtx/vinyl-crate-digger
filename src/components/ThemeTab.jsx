import { useState, useEffect } from "react";
import { C, CUSTOM_THEME_DEFAULTS, loadCustomTheme, saveCustomTheme, applyCustomThemeCSS } from "./shared";

// ── Color swatch picker ───────────────────────────────────────────────────────
function ColorField({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}>{label}</label>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="color"
          value={value.startsWith("rgba") ? "#7c3aed" : value}
          onChange={e => onChange(e.target.value)}
          style={{ width: 36, height: 28, border: `1px solid ${C.border}`,
            borderRadius: 6, cursor: "pointer", background: "none", padding: 2 }}
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ flex: 1, fontSize: 11, padding: "5px 8px",
            border: `1px solid ${C.border}`, borderRadius: 6,
            background: "rgba(255,255,255,0.05)", color: C.text, outline: "none" }}
        />
      </div>
    </div>
  );
}

// ── Slider field ─────────────────────────────────────────────────────────────
function SliderField({ label, value, unit, min, max, step, onChange, display }) {
  const num = parseInt(value) || 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: C.textMuted }}>{label}</span>
        <span style={{ fontSize: 11, color: C.purpleLight, fontWeight: 500 }}>{display ? display(num) : `${num}${unit}`}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={num}
        onChange={e => onChange(`${e.target.value}${unit}`)}
        style={{ width: "100%", accentColor: C.purple, cursor: "pointer" }}/>
    </div>
  );
}

// ── Live preview panel ────────────────────────────────────────────────────────
function Preview({ theme }) {
  const borderStr = `${theme.borderWidth} solid ${theme.border}`;
  const cardRadius = theme.borderRadius;
  const btnRadius  = theme.btnRadius;

  const btnBg = () => {
    if (theme.btnStyle === "flat")     return theme.btnColor;
    if (theme.btnStyle === "gradient") return `linear-gradient(135deg, ${theme.btnColor}, ${theme.btnColor2})`;
    if (theme.btnStyle === "3d")       return theme.btnColor;
    return theme.btnColor;
  };

  const btnShadow = () => {
    if (theme.btnStyle !== "3d") return "none";
    // Darken btnColor for shadow
    return `0 4px 0 0 color-mix(in srgb, ${theme.btnColor} 60%, black), 0 6px 12px rgba(0,0,0,0.4)`;
  };

  const btnTransform = theme.btnStyle === "3d"
    ? "translateY(-2px)"
    : "none";

  return (
    <div style={{ background: theme.bg, borderRadius: 10, padding: 16,
      border: `1px solid ${theme.border}` }}>

      {/* Mini header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
        paddingBottom: 10, borderBottom: borderStr }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.purpleDim}, ${theme.bg})`,
          border: `1px solid ${theme.purple}`, flexShrink: 0 }}/>
        <span style={{ fontSize: 13, fontWeight: 500, color: theme.text }}>Vinyl Library</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <button style={{ padding: "3px 10px", fontSize: 10, border: "none",
            borderRadius: btnRadius, cursor: "pointer", color: "#fff",
            background: btnBg(), boxShadow: btnShadow(),
            transform: "none", transition: "all 0.1s" }}>
            + Add
          </button>
        </div>
      </div>

      {/* Mini cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { title: "Kind of Blue", artist: "Miles Davis", year: "1959" },
          { title: "Dark Side",    artist: "Pink Floyd",  year: "1973" },
          { title: "Rumours",      artist: "Fleetwood Mac", year: "1977" },
        ].map((r, i) => (
          <div key={i} style={{ background: theme.bgCard, border: borderStr,
            borderRadius: cardRadius, overflow: "hidden" }}>
            <div style={{ width: "100%", aspectRatio: "1/1", background: theme.bgDeep,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "60%", aspectRatio: "1/1", borderRadius: "50%",
                background: `radial-gradient(circle, #1c1c1c, #0a0a0a)`,
                border: `1px solid ${theme.purpleDim}` }}/>
            </div>
            <div style={{ padding: "6px 8px" }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: theme.text,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
              <div style={{ fontSize: 9, color: theme.textMuted, marginTop: 1 }}>{r.artist}</div>
              <div style={{ fontSize: 8, color: theme.textDim, marginTop: 3,
                padding: "1px 4px", borderRadius: 3,
                background: "rgba(255,255,255,0.05)",
                display: "inline-block", border: `0.5px solid ${theme.border}` }}>{r.year}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Mini button row */}
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        {["Save record", "Cancel", "View tracks"].map((label, i) => (
          <button key={i} style={{
            padding: "4px 10px", fontSize: 10, border: i === 1 ? borderStr : "none",
            borderRadius: btnRadius, cursor: "pointer",
            color: i === 1 ? theme.textMuted : "#fff",
            background: i === 1 ? "transparent" : btnBg(),
            boxShadow: i !== 1 ? btnShadow() : "none",
          }}>{label}</button>
        ))}
      </div>
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SHead({ title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "20px 0 12px" }}>
      <div style={{ width: 3, height: 14, borderRadius: 2,
        background: `linear-gradient(to bottom,${C.purple},${C.blueMid})` }}/>
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
        color: C.purpleLight, textTransform: "uppercase" }}>{title}</span>
      <div style={{ flex: 1, height: "0.5px",
        background: `linear-gradient(to right,${C.border},transparent)` }}/>
    </div>
  );
}

// ── Main ThemeTab ─────────────────────────────────────────────────────────────
export default function ThemeTab({ onThemeChange }) {
  const [theme, setTheme]   = useState(() => loadCustomTheme() || { ...CUSTOM_THEME_DEFAULTS });
  const [saved, setSaved]   = useState(false);
  const [themeName, setThemeName] = useState("My Theme");

  useEffect(() => {
    const stored = loadCustomTheme();
    if (stored) { setTheme(stored); setThemeName(stored._name || "My Theme"); }
  }, []);

  const set = (key, val) => setTheme(t => ({ ...t, [key]: val }));

  const apply = () => {
    const t = { ...theme, _name: themeName };
    saveCustomTheme(t);
    applyCustomThemeCSS(t);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (onThemeChange) onThemeChange();
  };

  const reset = () => {
    const t = { ...CUSTOM_THEME_DEFAULTS, _name: themeName };
    setTheme(t);
  };

  return (
    <div>
      {/* Theme name */}
      <SHead title="Theme name" />
      <input
        value={themeName}
        onChange={e => setThemeName(e.target.value)}
        placeholder="My Theme"
        style={{ fontSize: 13, padding: "7px 10px", width: "100%", boxSizing: "border-box",
          border: `1px solid ${C.border}`, borderRadius: 7,
          background: "rgba(255,255,255,0.05)", color: C.text, outline: "none" }}
      />

      {/* Live preview */}
      <SHead title="Preview" />
      <Preview theme={theme}/>

      {/* Background colors */}
      <SHead title="Background colors" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ColorField label="Main background"  value={theme.bg}      onChange={v => set("bg", v)}/>
        <ColorField label="Card background"  value={theme.bgCard}  onChange={v => set("bgCard", v)}/>
        <ColorField label="Deep background"  value={theme.bgDeep}  onChange={v => set("bgDeep", v)}/>
      </div>

      {/* Accent colors */}
      <SHead title="Accent colors" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ColorField label="Primary accent"   value={theme.purple}      onChange={v => set("purple", v)}/>
        <ColorField label="Accent light"     value={theme.purpleLight} onChange={v => set("purpleLight", v)}/>
        <ColorField label="Accent dim"       value={theme.purpleDim}   onChange={v => set("purpleDim", v)}/>
        <ColorField label="Secondary accent" value={theme.blueMid}     onChange={v => set("blueMid", v)}/>
        <ColorField label="Secondary light"  value={theme.blueLight}   onChange={v => set("blueLight", v)}/>
        <ColorField label="Gold / stars"     value={theme.gold}        onChange={v => set("gold", v)}/>
      </div>

      {/* Text colors */}
      <SHead title="Text colors" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ColorField label="Primary text"  value={theme.text}      onChange={v => set("text", v)}/>
        <ColorField label="Muted text"    value={theme.textMuted} onChange={v => set("textMuted", v)}/>
        <ColorField label="Dim text"      value={theme.textDim}   onChange={v => set("textDim", v)}/>
      </div>

      {/* Borders */}
      <SHead title="Borders" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <ColorField label="Border color" value={theme.border} onChange={v => set("border", v)}/>
        <ColorField label="Border hover" value={theme.borderHover} onChange={v => set("borderHover", v)}/>
      </div>
      <SliderField label="Border thickness" value={theme.borderWidth} unit="px"
        min={0} max={4} step={1} onChange={v => set("borderWidth", v)}/>
      <div style={{ marginTop: 12 }}>
        <SliderField label="Card corner radius" value={theme.borderRadius} unit="px"
          min={0} max={24} step={1} onChange={v => set("borderRadius", v)}/>
      </div>

      {/* Buttons */}
      <SHead title="Buttons" />
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 6 }}>Button style</label>
        <div style={{ display: "flex", gap: 6 }}>
          {["flat", "gradient", "3d"].map(style => (
            <button key={style} onClick={() => set("btnStyle", style)}
              style={{ flex: 1, padding: "7px", fontSize: 12, fontWeight: 500,
                border: `1px solid ${theme.btnStyle === style ? C.purple : C.border}`,
                borderRadius: 7, cursor: "pointer", textTransform: "capitalize",
                background: theme.btnStyle === style
                  ? `linear-gradient(135deg,${C.purple},${C.blueMid})`
                  : "transparent",
                color: theme.btnStyle === style ? "#fff" : C.textMuted }}>
              {style === "3d" ? "3D Raised" : style.charAt(0).toUpperCase() + style.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <ColorField label="Button color"          value={theme.btnColor}  onChange={v => set("btnColor", v)}/>
        <ColorField label="Button color 2 (grad)" value={theme.btnColor2} onChange={v => set("btnColor2", v)}/>
      </div>
      <SliderField label="Button corner radius" value={theme.btnRadius} unit="px"
        min={0} max={24} step={1} onChange={v => set("btnRadius", v)}/>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginTop: 24, alignItems: "center" }}>
        <button onClick={apply}
          style={{ padding: "8px 22px", fontSize: 13, fontWeight: 500,
            border: "none", borderRadius: 7, cursor: "pointer",
            background: saved
              ? "linear-gradient(135deg,#4ade80,#22d3ee)"
              : `linear-gradient(135deg,${C.purple},${C.blueMid})`,
            color: "#fff", transition: "background 0.3s" }}>
          {saved ? "✓ Applied" : "Apply theme"}
        </button>
        <button onClick={reset}
          style={{ padding: "8px 16px", fontSize: 12,
            border: `1px solid ${C.border}`, borderRadius: 7,
            background: "transparent", color: C.textMuted, cursor: "pointer" }}>
          Reset to defaults
        </button>
      </div>

      <p style={{ fontSize: 11, color: C.textDim, marginTop: 10, lineHeight: 1.5 }}>
        Clicking "Apply theme" activates your custom theme immediately across the app.
      </p>
    </div>
  );
}
