import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { C, VinylSVG, Stars, LabelBadge } from "./shared";
import LyricsModal from "./LyricsModal";

export default function AlbumDetail() {
  const [rec, setRec] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [lyricsTrack, setLyricsTrack] = useState(null);
  const [cachedLyricsTracks, setCachedLyricsTracks] = useState(new Set());

  useEffect(() => {
    window.api.onAlbumData(data => {
      setRec(data);
      if (data?.id) {
        window.api.getCachedLyricsTracks(data.id).then(idxs => setCachedLyricsTracks(new Set(idxs || [])));
      }
    });
  }, []);

  if (!rec) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex",
      alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "inline-block", animation: "spin 3s linear infinite" }}>
          <VinylSVG size={80}/>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <p style={{ marginTop: 16, fontSize: 13, color: C.textMuted }}>Loading album…</p>
      </div>
    </div>
  );

  const cover = rec.images?.find(Boolean);
  const otherImages = rec.images?.filter(Boolean).slice(1) || [];
  const tracks = rec.tracks || [];
  const totalSecs = tracks.reduce((a,t) => a + (parseInt(t.mins)||0)*60 + (parseInt(t.secs)||0), 0);
  const dur = totalSecs ? `${Math.floor(totalSecs/60)}:${String(totalSecs%60).padStart(2,"0")}` : null;
  const trackCount = tracks.filter(t => t.title).length;

  return (
    <div style={{ height: "100vh", background: C.bg, color: C.text, overflowY: "auto" }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes lbFadeIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:${C.bgDeep}}
        ::-webkit-scrollbar-thumb{background:${C.purpleDim};border-radius:3px}
        body{margin:0}
      `}</style>

      {/* Hero */}
      <div style={{ background: `linear-gradient(180deg,rgba(124,58,237,0.15),transparent)`,
        padding: "32px 32px 24px", display: "flex", gap: 28, alignItems: "flex-start" }}>

        {/* Cover */}
        <div style={{ width: 180, height: 180, flexShrink: 0, borderRadius: 12, overflow: "hidden",
          background: C.bgDeep, display: "flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${C.border}`,
          boxShadow: "0 10px 0 rgba(0,0,0,0.5), 0 16px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.14), inset 1px 0 0 rgba(255,255,255,0.07)",
          borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          {cover
            ? <img src={cover} alt="" onClick={() => setLightbox(cover)}
                style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }}/>
            : <VinylSVG size={130}/>}
        </div>

        {/* Meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 600, color: C.text,
            lineHeight: 1.2 }}>{rec.title || "Untitled"}</h1>
          <p style={{ margin: "0 0 10px", fontSize: 16, color: C.textMuted }}>{rec.artist}</p>

          <LabelBadge label={rec.label} catNo={rec.cat_no}/>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {[
              rec.year,
              rec.country,
              rec.format && `${rec.discs > 1 ? `${rec.discs}×` : ""}${rec.format}`,
              rec.genre,
              trackCount > 0 && `${trackCount} tracks`,
              dur && `${dur} total`,
            ].filter(Boolean).map((v, i) => (
              <span key={i} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20,
                background: "rgba(124,58,237,0.12)", color: C.purpleLight,
                border: `0.5px solid ${C.border}` }}>{v}</span>
            ))}
          </div>

          {rec.rating > 0 && (
            <div style={{ marginTop: 14 }}>
              <Stars value={rec.rating} onChange={() => {}} />
            </div>
          )}

          {/* Condition badges */}
          {(rec.vinyl_cond || rec.jacket_cond) && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {rec.vinyl_cond && (
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5,
                  background: "rgba(124,58,237,0.15)", color: C.purpleLight,
                  border: `0.5px solid ${C.border}`,
                  boxShadow: "0 3px 0 rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.14)" }}>Vinyl: {rec.vinyl_cond}</span>
              )}
              {rec.jacket_cond && (
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 5,
                  background: "rgba(59,130,246,0.15)", color: C.blueLight,
                  border: "0.5px solid rgba(59,130,246,0.25)",
                  boxShadow: "0 3px 0 rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.14)" }}>Jacket: {rec.jacket_cond}</span>
              )}
            </div>
          )}

          {/* Value */}
          {(rec.low_value || rec.est_value || rec.high_value) && (
            <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
              {rec.low_value && <div>
                <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>LOW</div>
                <div style={{ fontSize: 13, color: C.text }}>${parseFloat(rec.low_value).toFixed(2)}</div>
              </div>}
              {rec.est_value && <div>
                <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>EST</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.purpleLight }}>${parseFloat(rec.est_value).toFixed(2)}</div>
              </div>}
              {rec.high_value && <div>
                <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>HIGH</div>
                <div style={{ fontSize: 13, color: C.text }}>${parseFloat(rec.high_value).toFixed(2)}</div>
              </div>}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "0 32px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

        {/* Tracklist */}
        {trackCount > 0 && (
          <div style={{ gridColumn: "span 2", background: C.bgCard,
            border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
                color: C.purpleLight, textTransform: "uppercase" }}>Track listing</span>
              {dur && <span style={{ fontSize: 11, color: C.textMuted }}>{dur}</span>}
            </div>
            <div style={{ padding: "8px 0" }}>
              {tracks.filter(t => t.title).map((t, i) => {
                const secs = (parseInt(t.mins)||0)*60 + (parseInt(t.secs)||0);
                const tdur = secs ? `${t.mins||0}:${String(t.secs||0).padStart(2,"0")}` : "";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12,
                    padding: "7px 18px",
                    borderBottom: i < trackCount-1 ? `1px solid rgba(124,58,237,0.06)` : "none" }}>
                    <span style={{ fontSize: 11, color: C.textDim, minWidth: 20,
                      textAlign: "right" }}>{i+1}</span>
                    <span style={{ flex: 1, fontSize: 13, color: C.text }}>{t.title}</span>
                    {tdur && <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>{tdur}</span>}
                    <button onClick={() => setLyricsTrack({ index: i, title: t.title })}
                      style={{ fontSize: 10, padding: "2px 8px",
                        border: cachedLyricsTracks.has(i) ? `1px solid ${C.purple}` : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 4,
                        background: cachedLyricsTracks.has(i) ? `linear-gradient(135deg,${C.purple},${C.blueMid})` : "transparent",
                        color: cachedLyricsTracks.has(i) ? "#fff" : "rgba(255,255,255,0.18)",
                        cursor: "pointer", whiteSpace: "nowrap",
                        boxShadow: cachedLyricsTracks.has(i) ? `0 0 8px rgba(124,58,237,0.4)` : "none" }}>
                      Lyrics
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Details */}
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px",
          boxShadow: "0 6px 0 rgba(0,0,0,0.45), 0 10px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12), inset 1px 0 0 rgba(255,255,255,0.06)",
          borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
            color: C.purpleLight, textTransform: "uppercase", marginBottom: 14 }}>Details</div>
          {[
            ["Catalog #",  rec.cat_no],
            ["Barcode",    rec.barcode],
            ["Runout",     rec.runout],
            ["Country",    rec.country],
            ["Year",       rec.year],
            ["Format",     rec.format],
            ["Discs",      rec.discs > 1 ? rec.discs : null],
            ["Location",   rec.location],
            ["Added",      rec.added_on],
            ["Updated",    rec.updated_on !== rec.added_on ? rec.updated_on : null],
            ["Updated by", rec.updated_by],
          ].filter(([,v]) => v).map(([label, val]) => (
            <div key={label} style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: C.textDim, minWidth: 80 }}>{label}</span>
              <span style={{ fontSize: 12, color: C.text }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Notes */}
        {rec.notes && (
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
              color: C.purpleLight, textTransform: "uppercase", marginBottom: 14 }}>Notes</div>
            <p style={{ margin: 0, fontSize: 13, color: C.textMuted, lineHeight: 1.7,
              whiteSpace: "pre-wrap" }}>{rec.notes}</p>
          </div>
        )}

        {/* Additional photos */}
        {otherImages.length > 0 && (
          <div style={{ gridColumn: "span 2", background: C.bgCard,
            border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
              color: C.purpleLight, textTransform: "uppercase", marginBottom: 14 }}>Photos</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {otherImages.map((img, i) => (
                <img key={i} src={img} alt="" onClick={() => setLightbox(img)}
                  style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8,
                    border: `1px solid ${C.border}`, cursor: "zoom-in",
                    transition: "transform 0.15s, box-shadow 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.5)`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    {lyricsTrack && rec?.id && (
      <LyricsModal
        recordId={rec.id}
        trackIndex={lyricsTrack.index}
        trackTitle={lyricsTrack.title}
        artist={rec.artist}
        albumTitle={rec.title}
        onClose={() => {
          setLyricsTrack(null);
          window.api.getCachedLyricsTracks(rec.id).then(idxs => setCachedLyricsTracks(new Set(idxs || [])));
        }}
      />
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
    </div>
  );
}
