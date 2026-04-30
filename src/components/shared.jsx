// Brightness levels — same color identity, different luminosity
// Dark = moody/dimmed, Medium = balanced, Light = bright/vivid
const THEMES = {
  dark: {
    bg: "#0d0d1a", bgCard: "#13132b", bgDeep: "#0a0a14",
    purple: "#7c3aed", purpleLight: "#a78bfa", purpleDim: "#4c1d95",
    blue: "#1e40af", blueLight: "#93c5fd", blueMid: "#3b82f6",
    border: "rgba(124,58,237,0.25)", borderHover: "rgba(124,58,237,0.55)",
    text: "#e2e8f0", textMuted: "#94a3b8", textDim: "#475569",
    gold: "#f59e0b",
    artFilter: "brightness(0.55) saturate(0.5)",   // most dimmed
    appFilter: "none",
  },
  medium: {
    bg: "#111124", bgCard: "#191935", bgDeep: "#0d0d1e",
    purple: "#7c3aed", purpleLight: "#a78bfa", purpleDim: "#4c1d95",
    blue: "#1e40af", blueLight: "#93c5fd", blueMid: "#3b82f6",
    border: "rgba(124,58,237,0.25)", borderHover: "rgba(124,58,237,0.55)",
    text: "#e2e8f0", textMuted: "#94a3b8", textDim: "#475569",
    gold: "#f59e0b",
    artFilter: "brightness(0.78) saturate(0.75)",  // slightly dimmed
    appFilter: "brightness(1.15)",
  },
  light: {
    bg: "#16163a", bgCard: "#1e1e4a", bgDeep: "#111130",
    purple: "#7c3aed", purpleLight: "#a78bfa", purpleDim: "#4c1d95",
    blue: "#1e40af", blueLight: "#93c5fd", blueMid: "#3b82f6",
    border: "rgba(124,58,237,0.25)", borderHover: "rgba(124,58,237,0.55)",
    text: "#e2e8f0", textMuted: "#94a3b8", textDim: "#475569",
    gold: "#f59e0b",
    artFilter: "none",                              // full brightness
    appFilter: "brightness(1.35)",
  }
};

// C is the live palette — updated by setTheme()
export let C = { ...THEMES.dark };

export const THEME_NAMES = ["dark", "medium", "light"];

export function setTheme(name) {
  if (name === "custom") {
    const stored = loadCustomTheme();
    if (stored) { Object.assign(C, stored); return; }
  }
  const t = THEMES[name] || THEMES.dark;
  Object.assign(C, t);
}

export function getTheme() {
  for (const [name, t] of Object.entries(THEMES)) {
    if (t.bg === C.bg) return name;
  }
  return C._isCustom ? "custom" : "dark";
}

// ── Custom theme helpers ──────────────────────────────────────────────────────

export const CUSTOM_THEME_DEFAULTS = {
  bg:           "#0d0d1a",
  bgCard:       "#13132b",
  bgDeep:       "#0a0a14",
  purple:       "#7c3aed",
  purpleLight:  "#a78bfa",
  purpleDim:    "#4c1d95",
  blue:         "#1e40af",
  blueLight:    "#93c5fd",
  blueMid:      "#3b82f6",
  border:       "rgba(124,58,237,0.25)",
  borderHover:  "rgba(124,58,237,0.55)",
  borderWidth:  "1px",
  borderRadius: "12px",
  text:         "#e2e8f0",
  textMuted:    "#94a3b8",
  textDim:      "#475569",
  gold:         "#f59e0b",
  artFilter:    "brightness(0.55) saturate(0.5)",
  appFilter:    "none",
  btnStyle:     "gradient",  // "gradient" | "flat" | "3d"
  btnRadius:    "7px",
  btnColor:     "#7c3aed",
  btnColor2:    "#3b82f6",
  _isCustom:    true,
};

export function loadCustomTheme() {
  try {
    const raw = localStorage.getItem("vinyl_custom_theme");
    return raw ? { ...CUSTOM_THEME_DEFAULTS, ...JSON.parse(raw), _isCustom: true } : null;
  } catch { return null; }
}

export function saveCustomTheme(theme) {
  const t = { ...theme, _isCustom: true };
  localStorage.setItem("vinyl_custom_theme", JSON.stringify(t));
  Object.assign(C, t);
}

export function applyCustomThemeCSS(theme) {
  const root = document.documentElement;
  root.style.setProperty("--custom-btn-radius",  theme.btnRadius  || "7px");
  root.style.setProperty("--custom-border-radius", theme.borderRadius || "12px");
  root.style.setProperty("--custom-border-width",  theme.borderWidth  || "1px");
}

// ── Fonts ─────────────────────────────────────────────────────────────────────

export const FONTS = [
  "Abril Fatface",
  "Aladin",
  "Alegreya",
  "Almendra",
  "Amarante",
  "Anta",
  "Bona Nova",
  "Carter One",
  "EB Garamond",
  "Electrolize",
  "Exo 2",
  "Faculty Glyphic",
  "Faustina",
  "Federo",
  "Geo",
  "Gideon Roman",
  "Goldman",
  "IBM Plex Serif",
  "Iceland",
  "Iceberg",
  "Italiana",
  "Limelight",
  "Michroma",
  "Nova Square",
  "Orbitron",
  "Oswald",
  "Ovo",
  "Oxanium",
  "Play",
  "Playfair Display",
  "Playwrite NZ",
  "Pompiere",
  "Racing Sans One",
  "Raleway",
  "Rosarivo",
  "Smythe",
  "Texturina",
  "Vidaloka",
];

export const FONT_DEFAULTS = {
  headingFont: "Orbitron",
  bodyFont:    "Raleway",
  headingSize: 30,
};

// Injects a Google Fonts <link> for every font in FONTS — call once on app init
export function loadFonts() {
  if (document.getElementById("vl-gfonts")) return;
  const families = FONTS.map(f => f.replace(/ /g, "+") + ":wght@400;500;700").join("&family=");
  const link = document.createElement("link");
  link.id   = "vl-gfonts";
  link.rel  = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
  document.head.appendChild(link);
}

// Applies font settings to CSS variables on :root so all components inherit them
export function applyFontSettings({ headingFont, bodyFont, headingSize }) {
  const root = document.documentElement;
  root.style.setProperty("--font-heading",      `"${headingFont}", sans-serif`);
  root.style.setProperty("--font-body",         `"${bodyFont}", sans-serif`);
  root.style.setProperty("--font-heading-size", `${headingSize}px`);
}

// Persist to DB and apply immediately
export async function setFontSettings(settings) {
  await window.api.setSetting("font_heading",      settings.headingFont);
  await window.api.setSetting("font_body",         settings.bodyFont);
  await window.api.setSetting("font_heading_size", String(settings.headingSize));
  applyFontSettings(settings);
}

// Load from DB on app startup — falls back to defaults
export async function getFontSettings() {
  const h  = await window.api.getSetting("font_heading");
  const b  = await window.api.getSetting("font_body");
  const sz = await window.api.getSetting("font_heading_size");
  return {
    headingFont:  h  || FONT_DEFAULTS.headingFont,
    bodyFont:     b  || FONT_DEFAULTS.bodyFont,
    headingSize:  sz ? parseInt(sz) : FONT_DEFAULTS.headingSize,
  };
}

// ── Static data ───────────────────────────────────────────────────────────────

export const GRADES = ["M","NM","VG+","VG","G+","G","F","P"];
export const FORMATS = ["LP","2xLP","3xLP","EP","7\"","10\"","12\"","Box Set","Other"];
export const GENRES = [
  "Rock","Alternative","Indie","Classic Rock","Hard Rock","Progressive Rock","Psychedelic",
  "Jazz","Blues","Classical","Folk","Country","Americana",
  "R&B/Soul","Funk","Gospel",
  "Hip-Hop","Rap",
  "Pop",
  "Metal","Heavy Metal","Death Metal","Black Metal","Doom Metal",
  "Punk","Post-Punk","New Wave","Hardcore",
  "Electronic","House","Techno","Trance","Ambient","Drum & Bass","Jungle",
  "EDM","Dubstep","IDM","Industrial","EBM","Synthwave","New Age",
  "World","Reggae","Ska","Dub","Latin","Afrobeat","Disco","Soul",
  "Experimental","Noise","Avant-Garde",
  "Soundtrack","Comedy","Spoken Word",
  "Other"
];

export const STYLES = [
  "Alternative","Big Band","Dance","Drum & Bass","EDM","Euro Dance","Euro House",
  "Hip Hop","House","Italodance","Jungle","Other Electronic","Pop","Radioplay",
  "Techno","Trance"
];

export const LOCATIONS = [
  "Top Shelf","Bottom Shelf","Bin A","Bin B","Other"
];

export const RECORD_SIZES = ["7\"","10\"","12\"","16\""];
export const RPMS = ["16","33 1/3","45","78"];
export const CHANNELS = ["Mono","Stereo","Quadraphonic","Surround Sound"];

export const EMPTY_RECORD = {
  id: null, artist: "", title: "", label: "", cat_no: "", runout: "", barcode: "",
  country: "", year: "", format: "LP", discs: 1, genre: "", style: "",
  vinyl_cond: "", jacket_cond: "", low_value: "", est_value: "", high_value: "",
  location: "", rating: 0, notes: "",
  num_tracks: "", record_size: "", rpm: "", channels: "",
  tracks: [{ title: "", mins: "", secs: "" }],
  images: [null, null, null, null],
  added_on: "", updated_on: "", updated_by: ""
};

// ── SVG Components ────────────────────────────────────────────────────────────

export function VinylSVG({ size = 120, artist = "", title = "" }) {
  // 33⅓ RPM = 1 rotation per 1.8 seconds
  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - 1;
  const uid = `vsvg${size}`;

  // Label text — truncate to fit
  const truncate = (str, max) => str && str.length > max ? str.slice(0, max - 1) + "…" : str;
  const labelTitle  = truncate(title,  18) || "Vinyl Library";
  const labelArtist = truncate(artist, 16);

  // Groove radii proportional to size
  const grooves = [];
  for (let gr = Math.round(r * 0.93); gr > Math.round(r * 0.30); gr -= Math.round(size * 0.045)) {
    grooves.push(gr);
  }

  const labelR    = Math.round(r * 0.28);
  const deadwaxR  = Math.round(r * 0.30);
  const centerR   = Math.round(r * 0.065);
  const spindleR  = Math.round(r * 0.032);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${uid}base`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#1c1c1c"/>
          <stop offset="55%"  stopColor="#0a0a0a"/>
          <stop offset="100%" stopColor="#1a1a1a"/>
        </radialGradient>
        <radialGradient id={`${uid}label`} cx="50%" cy="35%" r="70%">
          <stop offset="0%"   stopColor="#2d1b69"/>
          <stop offset="60%"  stopColor="#1a0a40"/>
          <stop offset="100%" stopColor="#0d0628"/>
        </radialGradient>
        <radialGradient id={`${uid}sheen`} cx="38%" cy="32%" r="55%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id={`${uid}rb1`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#ff0080" stopOpacity="0.22"/>
          <stop offset="16%"  stopColor="#ff6600" stopOpacity="0.22"/>
          <stop offset="33%"  stopColor="#ffee00" stopOpacity="0.20"/>
          <stop offset="50%"  stopColor="#00ff88" stopOpacity="0.22"/>
          <stop offset="66%"  stopColor="#0088ff" stopOpacity="0.22"/>
          <stop offset="83%"  stopColor="#8800ff" stopOpacity="0.22"/>
          <stop offset="100%" stopColor="#ff0080" stopOpacity="0.22"/>
        </linearGradient>
        <linearGradient id={`${uid}rb2`} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#00ffff" stopOpacity="0.14"/>
          <stop offset="33%"  stopColor="#ff00ff" stopOpacity="0.14"/>
          <stop offset="66%"  stopColor="#ffaa00" stopOpacity="0.14"/>
          <stop offset="100%" stopColor="#00ffff" stopOpacity="0.14"/>
        </linearGradient>
        <clipPath id={`${uid}clip`}>
          <circle cx={cx} cy={cy} r={r}/>
        </clipPath>
        <style>{`
          @keyframes ${uid}spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes ${uid}rb1 {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes ${uid}rb2 {
            from { transform: rotate(0deg); }
            to   { transform: rotate(-360deg); }
          }
          .${uid}-disc  { transform-origin: ${cx}px ${cy}px; animation: ${uid}spin 1.8s linear infinite; }
          .${uid}-rb1   { transform-origin: ${cx}px ${cy}px; animation: ${uid}rb1 5s linear infinite; }
          .${uid}-rb2   { transform-origin: ${cx}px ${cy}px; animation: ${uid}rb2 8s linear infinite; }
        `}</style>
      </defs>

      {/* Drop shadow */}
      <circle cx={cx + size*0.015} cy={cy + size*0.015} r={r} fill="#000000" opacity="0.45"/>

      {/* Spinning disc group */}
      <g className={`${uid}-disc`}>

        {/* Base */}
        <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}base)`}/>

        {/* Grooves */}
        {grooves.map((gr, i) => (
          <circle key={gr} cx={cx} cy={cy} r={gr} fill="none"
            stroke={i % 3 === 0 ? "#2e2e2e" : i % 3 === 1 ? "#262626" : "#1e1e1e"}
            strokeWidth={i % 2 === 0 ? "0.8" : "0.4"}/>
        ))}

        {/* Rainbow iridescence layers */}
        <g clipPath={`url(#${uid}clip)`}>
          <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}rb1)`} className={`${uid}-rb1`}/>
          <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}rb2)`} className={`${uid}-rb2`}/>
        </g>

        {/* Highlight sheen */}
        <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}sheen)`}/>

        {/* Outer edge ring */}
        <circle cx={cx} cy={cy} r={r}         fill="none" stroke="#3a3a3a" strokeWidth="1.2"/>
        <circle cx={cx} cy={cy} r={r * 0.975} fill="none" stroke="#1e1e1e" strokeWidth="0.4"/>

        {/* Deadwax */}
        <circle cx={cx} cy={cy} r={deadwaxR} fill="#0f0f0f" stroke="#252525" strokeWidth="0.5"/>

        {/* Label */}
        <circle cx={cx} cy={cy} r={labelR} fill={`url(#${uid}label)`}/>
        <circle cx={cx} cy={cy} r={labelR}           fill="none" stroke="#7c3aed" strokeWidth="0.8" opacity="0.7"/>
        <circle cx={cx} cy={cy} r={labelR * 0.78}    fill="none" stroke="#4c1d95" strokeWidth="0.4" opacity="0.5"/>

        {/* Label radial lines */}
        {[0,45,90,135,180,225,270,315].map(a => {
          const rad = a * Math.PI / 180;
          const r1 = labelR * 0.80, r2 = labelR * 0.96;
          return (
            <line key={a}
              x1={cx + r1 * Math.cos(rad)} y1={cy + r1 * Math.sin(rad)}
              x2={cx + r2 * Math.cos(rad)} y2={cy + r2 * Math.sin(rad)}
              stroke="#7c3aed" strokeWidth="0.5" opacity="0.4"/>
          );
        })}

        {/* Label title text */}
        <text
          x={cx} y={cy - (labelArtist ? labelR * 0.18 : labelR * 0.06)}
          textAnchor="middle" dominantBaseline="middle"
          fontFamily="sans-serif"
          fontSize={Math.max(5, Math.round(size * 0.055))}
          fontWeight="600"
          fill="#a78bfa"
          style={{ userSelect: "none" }}
        >{labelTitle}</text>

        {/* Label artist text */}
        {labelArtist && (
          <text
            x={cx} y={cy + labelR * 0.22}
            textAnchor="middle" dominantBaseline="middle"
            fontFamily="sans-serif"
            fontSize={Math.max(4, Math.round(size * 0.042))}
            fill="#7c6ab5"
            style={{ userSelect: "none" }}
          >{labelArtist}</text>
        )}

        {/* Center hub */}
        <circle cx={cx} cy={cy} r={centerR}  fill="#0d0628" stroke="#7c3aed" strokeWidth="0.8"/>
        <circle cx={cx} cy={cy} r={centerR * 0.6} fill="#1a0d3a" stroke="#a78bfa" strokeWidth="0.5"/>

        {/* Spindle hole */}
        <circle cx={cx} cy={cy} r={spindleR} fill="#000000"/>

      </g>

      {/* Static highlight — doesn't spin, adds realism */}
      <ellipse
        cx={cx - size * 0.08} cy={cy - size * 0.1}
        rx={size * 0.18} ry={size * 0.12}
        fill="#ffffff" opacity="0.025"
        transform={`rotate(-25,${cx - size*0.08},${cy - size*0.1})`}/>
    </svg>
  );
}

export function Waveform({ width = 200, height = 28 }) {
  const bars = Array.from({ length: 40 }, (_, i) => ({
    h: 4 + Math.abs(Math.sin(i*0.7+1)*18) + Math.abs(Math.sin(i*0.3)*8)
  }));
  const barW = width / 40;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        {bars.map((b, i) => (
          <linearGradient key={i} id={`wg${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`hsl(${(i * 9) % 360},100%,65%)`}/>
            <stop offset="100%" stopColor={`hsl(${(i * 9 + 60) % 360},100%,45%)`}/>
          </linearGradient>
        ))}
        <style>{`
          @keyframes waveBar {
            0%,100% { transform: scaleY(1); }
            50%      { transform: scaleY(0.35); }
          }
        `}</style>
      </defs>
      {bars.map((b, i) => (
        <rect key={i}
          x={i * barW} y={(height - b.h) / 2}
          width={barW - 1} height={b.h}
          fill={`url(#wg${i})`} rx="1"
          style={{
            transformOrigin: `${i * barW + barW/2}px ${height/2}px`,
            animation: `waveBar ${0.6 + (i % 7) * 0.12}s ease-in-out infinite`,
            animationDelay: `${(i * 0.04) % 0.8}s`
          }}
        />
      ))}
    </svg>
  );
}

export function Stars({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} onClick={() => onChange(n === value ? 0 : n)}
          style={{ cursor: "pointer", fontSize: 22, color: n <= value ? C.gold : C.textDim, userSelect: "none" }}>★</span>
      ))}
    </div>
  );
}

export function LabelBadge({ label, catNo }) {
  if (!label && !catNo) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%",
        background: `radial-gradient(circle,${C.purpleDim},${C.bg})`,
        border: `1px solid ${C.purple}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.purpleLight }} />
      </div>
      <span style={{ fontSize: 10, color: C.purpleLight, maxWidth: 130,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {[label, catNo].filter(Boolean).join(" · ")}
      </span>
    </div>
  );
}

export function SectionHead({ title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8,
      margin: "18px 0 10px", gridColumn: "span 2" }}>
      <div style={{ width: 3, height: 14, borderRadius: 2,
        background: `linear-gradient(to bottom,${C.purple},${C.blueMid})` }} />
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
        color: C.purpleLight, textTransform: "uppercase" }}>{title}</span>
      <div style={{ flex: 1, height: "0.5px",
        background: `linear-gradient(to right,${C.border},transparent)` }} />
    </div>
  );
}

export function F({ label, children, half, full }) {
  return (
    <div style={{ gridColumn: full ? "span 2" : half ? "span 1" : "span 2",
      display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, letterSpacing: "0.04em" }}>{label}</label>
      {children}
    </div>
  );
}

export const inp = {
  fontSize: 13, padding: "7px 10px",
  border: `1px solid rgba(124,58,237,0.25)`, borderRadius: 6,
  background: "rgba(0,0,0,0.25)", color: "#e2e8f0",
  width: "100%", boxSizing: "border-box", outline: "none",
  boxShadow: "inset 0 3px 6px rgba(0,0,0,0.55), inset 0 1px 3px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,0,0,0.2)",
};
