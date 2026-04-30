import { useState, useEffect, useRef } from "react";
import { C, VinylSVG } from "./shared";

const SCAN_SOUNDS = {
  found:    () => { try { const a = new AudioContext(); const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.setValueAtTime(0.3, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.15); o.start(); o.stop(a.currentTime + 0.15); } catch {} },
  notFound: () => { try { const a = new AudioContext(); const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 330; o.type = "sawtooth"; g.gain.setValueAtTime(0.2, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.25); o.start(); o.stop(a.currentTime + 0.25); } catch {} },
  added:    () => { try { const a = new AudioContext(); [523,659,784].forEach((f,i) => { const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = f; g.gain.setValueAtTime(0.2, a.currentTime + i*0.08); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + i*0.08 + 0.12); o.start(a.currentTime + i*0.08); o.stop(a.currentTime + i*0.08 + 0.12); }); } catch {} },
};

function ResultCard({ result, status }) {
  const cover = result?.images?.find(Boolean) || result?.image;
  return (
    <div style={{ background: "rgba(124,58,237,0.08)", border: `1px solid ${
      status === "found" ? C.purple : status === "discogs" || status === "musicbrainz" ? "#f59e0b" : C.border
    }`, borderRadius: 14, padding: "20px 24px", display: "flex", gap: 18, alignItems: "flex-start",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
      <div style={{ width: 80, height: 80, borderRadius: 10, overflow: "hidden", flexShrink: 0,
        background: C.bgDeep, border: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        {cover
          ? <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
          : <VinylSVG size={44}/>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase",
          color: status === "found" ? C.purpleLight : "#f59e0b", marginBottom: 6 }}>
          {status === "found" ? "✓ In your library" : status === "discogs" ? "Found on Discogs" : status === "musicbrainz" ? "Found on MusicBrainz" : "Not found"}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.text,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {result?.title || "Unknown Title"}
        </div>
        <div style={{ fontSize: 13, color: C.textMuted, marginTop: 3 }}>
          {result?.artist || result?.["artist-credit"]?.[0]?.artist?.name || ""}
        </div>
        {(result?.label || result?.year || result?.format) && (
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {[result?.label, result?.year, result?.format, result?.country].filter(Boolean).map((v, i) => (
              <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4,
                background: "rgba(255,255,255,0.06)", color: C.textMuted,
                border: `0.5px solid ${C.border}` }}>{v}</span>
            ))}
          </div>
        )}
        {result?.vinyl_cond && (
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4,
              background: "rgba(124,58,237,0.15)", color: C.purpleLight,
              border: `0.5px solid ${C.border}` }}>Vinyl: {result.vinyl_cond}</span>
            {result?.jacket_cond && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4,
              background: "rgba(59,130,246,0.15)", color: C.blueLight,
              border: "0.5px solid rgba(59,130,246,0.25)" }}>Jacket: {result.jacket_cond}</span>}
            {result?.rating > 0 && <span style={{ color: "#f59e0b", fontSize: 13 }}>{"★".repeat(result.rating)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScannerMode({ onAddRecord, user }) {
  const [scanning, setScanning] = useState(true);
  const [barcode, setBarcode] = useState("");
  const [status, setStatus] = useState(null); // null | "searching" | "found" | "discogs" | "musicbrainz" | "notfound" | "error"
  const [result, setResult] = useState(null);
  const [discogsResult, setDiscogsResult] = useState(null);
  const [mbResults, setMbResults] = useState([]);
  const [showMbList, setShowMbList] = useState(false);
  const [history, setHistory] = useState([]);
  const [sessionAdded, setSessionAdded] = useState(0);
  const inputRef = useRef();

  // Always keep input focused
  useEffect(() => {
    const focus = () => { if (inputRef.current) inputRef.current.focus(); };
    focus();
    const interval = setInterval(focus, 500);
    return () => clearInterval(interval);
  }, []);

  const reset = () => {
    setBarcode("");
    setStatus(null);
    setResult(null);
    setDiscogsResult(null);
    setMbResults([]);
    setShowMbList(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleScan = async (code) => {
    if (!code?.trim()) return;
    const bc = code.trim();
    setStatus("searching");
    setResult(null);
    setDiscogsResult(null);
    setMbResults([]);
    setShowMbList(false);

    // 1. Check own library first
    const local = await window.api.findByBarcode(bc);
    if (local) {
      SCAN_SOUNDS.found();
      setStatus("found");
      setResult(local);
      addToHistory({ barcode: bc, title: local.title, artist: local.artist, status: "found" });
      return;
    }

    // 2. Try Discogs by barcode
    try {
      const dRes = await window.api.discogsLookupBarcode(bc);
      if (dRes?.ok && dRes.results?.length) {
        const top = dRes.results[0];
        // Fetch full release details
        try {
          const rel = await window.api.discogsGetRelease(top.id);
          if (rel?.ok) {
            const d = rel.data;
            const filled = {
              artist:  d.artists?.map(a => a.name).join(", ") || top.title?.split(" - ")[0] || "",
              title:   d.title || top.title?.split(" - ")[1] || top.title || "",
              label:   d.labels?.[0]?.name || "",
              cat_no:  d.labels?.[0]?.catno || "",
              country: d.country || "",
              year:    d.year ? String(d.year) : "",
              format:  d.formats?.[0]?.name || "",
              barcode: bc,
              image:   top.cover_image || null,
              _discogsId: top.id,
              _raw: d,
            };
            SCAN_SOUNDS.notFound();
            setStatus("discogs");
            setResult(filled);
            setDiscogsResult(filled);
            addToHistory({ barcode: bc, title: filled.title, artist: filled.artist, status: "discogs" });
            return;
          }
        } catch {}
        // Fallback with basic info
        const filled = {
          artist: top.title?.split(" - ")[0] || "",
          title:  top.title?.split(" - ")[1] || top.title || "",
          barcode: bc,
          image: top.cover_image || null,
          _discogsId: top.id,
        };
        SCAN_SOUNDS.notFound();
        setStatus("discogs");
        setResult(filled);
        setDiscogsResult(filled);
        addToHistory({ barcode: bc, title: filled.title, artist: filled.artist, status: "discogs" });
        return;
      }
    } catch {}

    // 3. Try MusicBrainz
    try {
      const mbRes = await window.api.musicbrainzSearch(`barcode:${bc}`);
      if (mbRes?.ok && mbRes.results?.length) {
        const top = mbRes.results[0];
        SCAN_SOUNDS.notFound();
        setStatus("musicbrainz");
        setResult({ ...top, barcode: bc });
        setMbResults(mbRes.results);
        addToHistory({ barcode: bc, title: top.title, artist: top.artist, status: "musicbrainz" });
        return;
      }
    } catch {}

    // 4. Not found anywhere
    SCAN_SOUNDS.notFound();
    setStatus("notfound");
    setResult(null);
    addToHistory({ barcode: bc, title: null, artist: null, status: "notfound" });
  };

  const addToHistory = (entry) => {
    setHistory(h => [{ ...entry, time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }, ...h.slice(0, 9)]);
  };

  const handleAddToLibrary = async (prefill = null) => {
    const base = prefill || result || {};
    // Build EMPTY_RECORD-compatible object
    const newRecord = {
      artist: base.artist || "",
      title:  base.title  || "",
      label:  base.label  || "",
      cat_no: base.cat_no || "",
      country: base.country || "",
      year:   base.year   || "",
      format: base.format || "",
      barcode: base.barcode || barcode,
      images: base.image ? [base.image, null, null, null] : [null, null, null, null],
      tracks: [],
      discs: 1, num_tracks: "", record_size: "", rpm: "", channels: "",
      genre: "", style: "", vinyl_cond: "", jacket_cond: "",
      low_value: "", est_value: "", high_value: "",
      location: "", rating: 0, notes: "", runout: "",
    };
    SCAN_SOUNDS.added();
    setSessionAdded(n => n + 1);
    onAddRecord(newRecord);
  };

  const handleTryMusicBrainz = () => {
    setShowMbList(true);
  };

  const handleSelectMb = (mb) => {
    setResult({ ...mb, barcode });
    setStatus("musicbrainz");
    setShowMbList(false);
  };

  const statusColor = status === "found" ? "#4ade80" : status === "notfound" || status === "error" ? "#f87171" : "#f59e0b";

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 740, margin: "0 auto", width: "100%" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: C.text, margin: 0 }}>Record Fair Scanner</h2>
          <p style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>Scan a barcode to look up or add a record</p>
        </div>
        {sessionAdded > 0 && (
          <div style={{ textAlign: "center", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)",
            borderRadius: 10, padding: "8px 16px" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#4ade80" }}>{sessionAdded}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>Added this session</div>
          </div>
        )}
      </div>

      {/* Scan input — hidden but focused */}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          value={barcode}
          onChange={e => setBarcode(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && barcode.trim()) handleScan(barcode); }}
          placeholder="Scan barcode or type manually…"
          style={{ width: "100%", padding: "14px 18px", fontSize: 16, fontWeight: 500,
            background: "rgba(255,255,255,0.05)", border: `2px solid ${status === "searching" ? C.purple : C.border}`,
            borderRadius: 12, color: C.text, outline: "none", letterSpacing: "0.05em",
            boxShadow: "inset 0 2px 8px rgba(0,0,0,0.4)",
            transition: "border-color 0.2s" }}
          autoComplete="off" autoCorrect="off" spellCheck={false}
        />
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
          display: "flex", gap: 8 }}>
          {status === "searching" && (
            <span style={{ fontSize: 12, color: C.purpleLight, animation: "pulse 1s ease-in-out infinite" }}>Searching…</span>
          )}
          {barcode && (
            <button onClick={reset} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 16 }}>✕</button>
          )}
          <button onClick={() => handleScan(barcode)}
            style={{ padding: "6px 14px", fontSize: 12, border: "none", borderRadius: 7,
              background: `linear-gradient(135deg,${C.purple},${C.blueMid})`, color: "#fff", cursor: "pointer" }}>
            Search
          </button>
        </div>
      </div>

      {/* Status hint */}
      {status && status !== "searching" && (
        <div style={{ fontSize: 13, color: statusColor, textAlign: "center", fontWeight: 500 }}>
          {status === "found" && "✓ Already in your library"}
          {status === "discogs" && "Found on Discogs — not in your library yet"}
          {status === "musicbrainz" && "Found on MusicBrainz — not in your library yet"}
          {status === "notfound" && "Not found anywhere — you can add it manually"}
        </div>
      )}

      {/* Result card */}
      {result && status !== "searching" && (
        <ResultCard result={result} status={status} />
      )}

      {/* Action buttons */}
      {status && status !== "searching" && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {status === "found" && (
            <button onClick={reset}
              style={{ flex: 1, padding: "12px", border: `1px solid ${C.border}`, borderRadius: 10,
                background: "transparent", color: C.text, cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
              Scan next record
            </button>
          )}
          {(status === "discogs" || status === "musicbrainz") && (
            <>
              <button onClick={() => handleAddToLibrary()}
                style={{ flex: 1, padding: "12px", border: "none", borderRadius: 10,
                  background: `linear-gradient(135deg,${C.purple},${C.blueMid})`,
                  color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
                Add to library
              </button>
              {status === "discogs" && (
                <button onClick={handleTryMusicBrainz}
                  style={{ padding: "12px 18px", border: `1px solid rgba(192,86,33,0.5)`, borderRadius: 10,
                    background: "rgba(192,86,33,0.1)", color: "#c05621", cursor: "pointer", fontSize: 14 }}>
                  Wrong one? Try MusicBrainz
                </button>
              )}
              <button onClick={reset}
                style={{ padding: "12px 18px", border: `1px solid ${C.border}`, borderRadius: 10,
                  background: "transparent", color: C.textMuted, cursor: "pointer", fontSize: 14 }}>
                Skip
              </button>
            </>
          )}
          {status === "notfound" && (
            <>
              <button onClick={() => handleAddToLibrary({ barcode, title: "", artist: "" })}
                style={{ flex: 1, padding: "12px", border: "none", borderRadius: 10,
                  background: `linear-gradient(135deg,${C.purple},${C.blueMid})`,
                  color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
                Add manually
              </button>
              <button onClick={reset}
                style={{ padding: "12px 18px", border: `1px solid ${C.border}`, borderRadius: 10,
                  background: "transparent", color: C.textMuted, cursor: "pointer", fontSize: 14 }}>
                Skip
              </button>
            </>
          )}
        </div>
      )}

      {/* MusicBrainz results list */}
      {showMbList && mbResults.length > 0 && (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`,
            fontSize: 12, color: C.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            MusicBrainz Results
          </div>
          {mbResults.map((mb, i) => (
            <div key={i} onClick={() => handleSelectMb(mb)}
              style={{ padding: "12px 16px", borderBottom: i < mbResults.length - 1 ? `1px solid ${C.border}` : "none",
                cursor: "pointer", transition: "background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(124,58,237,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{mb.title}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                {mb.artist} {mb.year && `· ${mb.year}`} {mb.country && `· ${mb.country}`} {mb.format && `· ${mb.format}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session history */}
      {history.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, textTransform: "uppercase",
            letterSpacing: "0.08em", marginBottom: 10 }}>Session history</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {history.map((h, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12,
                padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)",
                border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 16 }}>
                  {h.status === "found" ? "✓" : h.status === "notfound" ? "✗" : "＋"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {h.title ? `${h.artist} — ${h.title}` : h.barcode}
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim }}>
                    {h.status === "found" ? "Already in library" : h.status === "notfound" ? "Not found" : "From " + h.status} · {h.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
