import { useEffect, useRef, useState } from "react";
import { C, LabelBadge, VinylSVG } from "./shared";
import { playHover } from "../sounds";

function extractColors(imgEl) {
  try {
    const size = 40;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgEl, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    const buckets = {};
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      if (a < 128) continue;
      const max = Math.max(r,g,b), min = Math.min(r,g,b);
      if (max < 30 || max - min < 20) continue;
      const key = `${r>>5},${g>>5},${b>>5}`;
      if (!buckets[key]) buckets[key] = { r:0, g:0, b:0, n:0 };
      buckets[key].r += r; buckets[key].g += g; buckets[key].b += b; buckets[key].n++;
    }
    const sorted = Object.values(buckets)
      .sort((a,b) => b.n - a.n)
      .map(b => ({ r: Math.round(b.r/b.n), g: Math.round(b.g/b.n), b: Math.round(b.b/b.n) }));
    const primary = sorted[0] || null;
    let secondary = null;
    for (const c of sorted.slice(1)) {
      if (Math.abs(c.r-primary.r)+Math.abs(c.g-primary.g)+Math.abs(c.b-primary.b) > 60) {
        secondary = c; break;
      }
    }
    return [primary, secondary || sorted[1] || primary];
  } catch { return [null, null]; }
}

export function RecordCard({ rec, onEdit, onDelete, onDetail, focused, onFocus, animDelay, loadKey, animDuration, parallaxTilt=10, parallaxScale=1.04, parallaxResponse=0.08, parallaxReturn=0.5 }) {
  const cover = rec.images?.find(Boolean);
  const total = (rec.tracks||[]).reduce((a,t)=>a+(parseInt(t.mins)||0)*60+(parseInt(t.secs)||0),0);
  const dur = total ? `${Math.floor(total/60)}:${String(total%60).padStart(2,"0")}` : null;
  const wrapRef = useRef();
  const cardRef = useRef();
  const imgRef = useRef();
  const [colors, setColors] = useState([null, null]);
  const [tilt, setTilt] = useState({ x: 0, y: 0, over: false });

  useEffect(() => {
    if (focused && wrapRef.current) wrapRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focused]);

  const handleImageLoad = () => {
    if (imgRef.current) setColors(extractColors(imgRef.current));
  };

  const handleMouseEnter = () => { playHover(); };

  const handleMouseMove = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    setTilt({ x: y * -parallaxTilt, y: x * parallaxTilt, over: true });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0, over: false });

  const [pr, pg, pb] = colors[0] ? [colors[0].r, colors[0].g, colors[0].b] : [124, 58, 237];
  const [sr, sg, sb] = colors[1] ? [colors[1].r, colors[1].g, colors[1].b] : [59, 130, 246];

  const borderColor = focused
    ? C.purple
    : tilt.over && colors[1]
      ? `rgba(${sr},${sg},${sb},0.9)`
      : C.border;

  const shadow = focused
    ? `0 0 0 3px rgba(124,58,237,0.35)`
    : tilt.over && colors[0]
      ? `0 16px 40px rgba(${pr},${pg},${pb},0.5), 0 4px 12px rgba(0,0,0,0.5)`
      : `0 2px 8px rgba(0,0,0,0.25)`;

  return (
    // Outer wrapper — no overflow:hidden so transform is visible
    <div
      ref={wrapRef}
      tabIndex={0}
      onFocus={onFocus}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => onEdit(rec)}
      onKeyDown={e => { if (e.key === "Enter") onEdit(rec); }}
      style={{
        perspective: "600px",
        borderRadius: 12,
        animation: `fadeSlideUp ${animDuration || 1.0}s ease both`,
        animationDelay: `${animDelay || 0}ms`,
        cursor: "pointer",
      }}>
      {/* Inner card — this is what tilts */}
      <div
        ref={cardRef}
        style={{
          background: C.bgCard,
          borderTop: `1px solid rgba(255,255,255,0.12)`,
          borderLeft: `1px solid rgba(255,255,255,0.07)`,
          borderBottom: `1px solid rgba(0,0,0,0.5)`,
          borderRight: `1px solid ${borderColor}`,
          borderRadius: 12,
          overflow: "hidden",
          transition: tilt.over
            ? `transform ${parallaxResponse}s linear, box-shadow ${parallaxResponse}s linear, border-color ${parallaxResponse}s linear`
            : `transform ${parallaxReturn}s ease, box-shadow ${parallaxReturn}s ease, border-color 0.4s ease`,
          boxShadow: tilt.over
            ? `${shadow}, 0 8px 0 rgba(0,0,0,0.5), 0 12px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.14), inset 1px 0 0 rgba(255,255,255,0.07)`
            : `${shadow}, 0 6px 0 rgba(0,0,0,0.45), 0 10px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12), inset 1px 0 0 rgba(255,255,255,0.06)`,
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${tilt.over ? parallaxScale : 1})`,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}>
        <div style={{ width: "100%", aspectRatio: "1/1", background: C.bgDeep, overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          {cover
            ? <img ref={imgRef} src={cover} alt="" onLoad={handleImageLoad}
                style={{ width: "100%", height: "100%", objectFit: "cover", filter: C.artFilter || "none" }}/>
            : <VinylSVG size={90} artist={rec.artist} title={rec.title}/>}
        </div>
        <div style={{ padding: "10px 12px", height: 196, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          {/* Top: title, artist, label — always 3 fixed rows */}
          <div>
            <p style={{ margin: 0, fontWeight: 500, fontSize: 13, color: C.text,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rec.title||"Untitled"}</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textMuted,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rec.artist||" "}</p>
            <p style={{ margin: "3px 0 0", fontSize: 10, color: C.purpleLight,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {rec.label || <span style={{ color: C.textDim }}> </span>}
            </p>
          </div>
          {/* Middle: year / genre / runtime — always 3 fixed pill rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {[rec.year||" ", rec.genre||" ", dur||"0:00"].map((val, i) => (
              <span key={i} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4,
                background: "rgba(255,255,255,0.06)", color: val===" " ? "transparent" : C.textMuted,
                border: `0.5px solid ${val===" " ? "transparent" : C.border}`,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                {val}
              </span>
            ))}
            {parseFloat(rec.est_value) > 0
              ? <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4,
                  background: "rgba(74,222,128,0.08)", color: "#4ade80",
                  border: "0.5px solid rgba(74,222,128,0.25)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                  Est: ${parseFloat(rec.est_value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              : <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, display: "block", color: C.textDim, background: "rgba(255,255,255,0.03)", border: `0.5px solid ${C.border}` }}>Value not set</span>}
          </div>
          {/* Bottom: condition badges, stars, buttons — always rendered */}
          <div>
            <div style={{ display: "flex", gap: 5, flexWrap: "nowrap", marginBottom: 6, minHeight: 18, alignItems: "center" }}>
              <span style={{ fontSize: 9, color: C.textDim, whiteSpace: "nowrap" }}>Condition</span>
              {rec.vinyl_cond
                ? <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4,
                    background: "rgba(124,58,237,0.15)", color: C.purpleLight, border: `0.5px solid ${C.border}` }}>
                    Vinyl: {rec.vinyl_cond}</span>
                : <span style={{ fontSize: 9, padding: "2px 6px", minWidth: 32 }}/>}
              {rec.jacket_cond
                ? <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4,
                    background: "rgba(59,130,246,0.15)", color: C.blueLight, border: "0.5px solid rgba(59,130,246,0.25)" }}>
                    Jacket: {rec.jacket_cond}</span>
                : <span style={{ fontSize: 9, padding: "2px 6px", minWidth: 32 }}/>}
              {rec.rating > 0 && <span style={{ fontSize: 11, color: C.gold, marginLeft: "auto" }}>{"★".repeat(rec.rating)}</span>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={e => { e.stopPropagation(); onDetail(rec); }}
                style={{ flex: 1, fontSize: 10, padding: "4px 0", border: `0.5px solid ${C.purple}`,
                  borderRadius: 5, background: "rgba(124,58,237,0.1)", color: C.purpleLight, cursor: "pointer" }}>
                View tracks
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(rec.id); }}
                style={{ fontSize: 10, padding: "4px 8px", border: `0.5px solid ${C.border}`,
                  borderRadius: 5, background: "transparent", color: C.textDim, cursor: "pointer" }}>
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecordCard;
