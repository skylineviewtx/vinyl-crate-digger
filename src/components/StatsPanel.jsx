import { useState, useMemo, useEffect } from "react";
import { C, VinylSVG } from "./shared";

const GRADE_ORDER = ["M","NM","VG+","VG","G+","G","F","P"];
const GRADE_LABELS = {
  "M":   "Mint",
  "NM":  "Near Mint",
  "VG+": "Very Good+",
  "VG":  "Very Good",
  "G+":  "Good+",
  "G":   "Good",
  "F":   "Fair",
  "P":   "Poor",
};

function normalize(str) {
  return (str||"").toLowerCase().trim()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fuzzyMatch(a, b) {
  return normalize(a) === normalize(b);
}

function Bar({ label, value, max, color, onClick }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
      title={onClick ? `Click to filter by "${label}"` : undefined}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 14, color: onClick ? C.purpleLight : C.text,
          textDecoration: onClick ? "underline dotted" : "none" }}>{label}</span>
        <span style={{ fontSize: 14, color: C.textMuted }}>{value}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4,
          background: color || `linear-gradient(90deg,${C.purple},${C.blueMid})`,
          transition: "width 0.6s ease" }}/>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background: "rgba(124,58,237,0.08)", border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "16px 20px",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s ease",
        borderColor: onClick ? C.purple : C.border,
        boxShadow: "0 6px 0 rgba(0,0,0,0.45), 0 10px 22px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12), inset 1px 0 0 rgba(255,255,255,0.06)",
        borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <p style={{ margin: "0 0 6px", fontSize: 12, color: C.textMuted,
        letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 500,
        color: accent || C.purpleLight }}>{value}</p>
      {sub && <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textDim }}>{sub}</p>}
    </div>
  );
}

function SectionHead({ title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "28px 0 14px" }}>
      <div style={{ width: 3, height: 14, borderRadius: 2,
        background: `linear-gradient(to bottom,${C.purple},${C.blueMid})` }}/>
      <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.1em",
        color: C.purpleLight, textTransform: "uppercase" }}>{title}</span>
      <div style={{ flex: 1, height: "0.5px",
        background: `linear-gradient(to right,${C.border},transparent)` }}/>
    </div>
  );
}

function DuplicatesTab({ records, onFilter, onRefresh }) {
  const [resolved, setResolved] = useState({});

  const groups = useMemo(() => {
    const seen = {};
    records.forEach(r => {
      const key = normalize(r.artist || "") + "||" + normalize(r.title || "");
      if (!seen[key]) seen[key] = [];
      seen[key].push(r);
    });
    return Object.values(seen).filter(g => g.length > 1);
  }, [records]);

  const active = groups.filter(g => !resolved[g[0].id + "_" + g[1].id]);

  if (!active.length) return (
    <div style={{ padding: "40px 0", textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
      <p style={{ margin: 0, fontSize: 14, color: C.text }}>No duplicates found.</p>
      <p style={{ margin: "6px 0 0", fontSize: 12, color: C.textMuted }}>
        Your library looks clean.
      </p>
    </div>
  );

  const handleDelete = async (id, groupKey) => {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    await window.api.deleteRecord(id);
    setResolved(r => ({ ...r, [groupKey]: true }));
    if (onRefresh) onRefresh();
  };

  const handleMerge = async (keep, remove, groupKey) => {
    if (!confirm(`Keep "${keep.title}" by ${keep.artist} and delete the other copy?`)) return;
    await window.api.deleteRecord(remove.id);
    setResolved(r => ({ ...r, [groupKey]: true }));
    if (onRefresh) onRefresh();
  };

  const handleView = (rec) => onFilter({ type: "artist", value: rec.artist });

  return (
    <div>
      <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 16px", lineHeight: 1.6 }}>
        {active.length} potential duplicate{active.length !== 1 ? "s" : ""} found based on artist and title matching.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {active.map(group => {
          const groupKey = group[0].id + "_" + group[1].id;
          return (
            <div key={groupKey} style={{ background: "rgba(248,113,113,0.06)",
              border: "1px solid rgba(248,113,113,0.25)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 13, color: "#f87171", fontWeight: 500,
                letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                Possible duplicate — {group.length} copies
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {group.map(rec => (
                  <div key={rec.id} style={{ display: "flex", alignItems: "center", gap: 12,
                    background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 6, overflow: "hidden",
                      background: C.bgDeep, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {rec.images?.find(Boolean)
                        ? <img src={rec.images.find(Boolean)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                        : <VinylSVG size={28}/>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.text,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rec.title}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 13, color: C.textMuted }}>{rec.artist}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textDim }}>
                        {[rec.format, rec.year, rec.vinyl_cond, rec.label].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => handleMerge(group[0], group[1], groupKey)}
                  style={{ fontSize: 13, padding: "6px 14px", border: `1px solid ${C.purple}`,
                    borderRadius: 6, background: "rgba(124,58,237,0.1)", color: C.purpleLight, cursor: "pointer" }}>
                  Keep first, delete second
                </button>
                <button onClick={() => handleMerge(group[1], group[0], groupKey)}
                  style={{ fontSize: 13, padding: "6px 14px", border: `1px solid ${C.purple}`,
                    borderRadius: 6, background: "rgba(124,58,237,0.1)", color: C.purpleLight, cursor: "pointer" }}>
                  Keep second, delete first
                </button>
                <button onClick={() => handleView(group[0])}
                  style={{ fontSize: 13, padding: "6px 14px", border: `1px solid ${C.border}`,
                    borderRadius: 6, background: "transparent", color: C.textMuted, cursor: "pointer" }}>
                  View in library
                </button>
                <button onClick={() => setResolved(r => ({ ...r, [groupKey]: true }))}
                  style={{ fontSize: 13, padding: "6px 14px", border: `1px solid ${C.border}`,
                    borderRadius: 6, background: "transparent", color: C.textDim, cursor: "pointer" }}>
                  Dismiss
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StatsPanel({ records, onFilter, onRefresh }) {
  const [activeTab, setActiveTab] = useState("stats");
  const [listeningStats, setListeningStats] = useState(null);

  useEffect(() => {
    if (activeTab === "history") {
      window.api.getListeningStats().then(s => setListeningStats(s));
    }
  }, [activeTab]);

  if (!records.length) return (
    <div style={{ padding: "60px 24px", textAlign: "center", color: C.textMuted, fontSize: 14 }}>
      Add some records to see your collection stats.
    </div>
  );

  const totalVal = records.reduce((a,r) => a+(parseFloat(r.est_value)||0), 0);
  const totalLow = records.reduce((a,r) => a+(parseFloat(r.low_value)||0), 0);
  const totalHigh = records.reduce((a,r) => a+(parseFloat(r.high_value)||0), 0);
  const rated = records.filter(r => r.rating > 0);
  const avgRating = rated.length ? (rated.reduce((a,r) => a+r.rating, 0) / rated.length).toFixed(1) : "—";
  const totalTracks = records.reduce((a,r) => a+(r.tracks||[]).filter(t=>t.title).length, 0);

  const genreMap = {};
  records.forEach(r => { if (r.genre) genreMap[r.genre.trim()] = (genreMap[r.genre.trim()]||0)+1; });
  const genres = Object.entries(genreMap).sort((a,b) => b[1]-a[1]);
  const maxGenre = genres[0]?.[1] || 1;

  const fmtMap = {};
  records.forEach(r => { if (r.format) fmtMap[r.format.trim()] = (fmtMap[r.format.trim()]||0)+1; });
  const formats = Object.entries(fmtMap).sort((a,b) => b[1]-a[1]);
  const maxFmt = formats[0]?.[1] || 1;

  const condMap = {};
  records.forEach(r => { if (r.vinyl_cond) condMap[r.vinyl_cond] = (condMap[r.vinyl_cond]||0)+1; });
  const conditions = GRADE_ORDER.filter(g => condMap[g]).map(g => [g, condMap[g]]);

  const topRated = [...records].filter(r => r.rating > 0).sort((a,b) => b.rating-a.rating).slice(0,5);
  const topValue = [...records].filter(r => parseFloat(r.est_value) > 0)
    .sort((a,b) => parseFloat(b.est_value) - parseFloat(a.est_value)).slice(0,5);
  const fmtMoney = n => `$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

  const tabBtn = (id, label) => (
    <button onClick={() => setActiveTab(id)}
      style={{ padding: "7px 16px", fontSize: 13, cursor: "pointer", border: "none", borderRadius: 6,
        background: activeTab === id ? `linear-gradient(135deg,${C.purple},${C.blueMid})` : "transparent",
        color: activeTab === id ? "#fff" : C.textMuted, fontWeight: activeTab === id ? 500 : 400 }}>
      {label}
    </button>
  );

  return (
    <div style={{ padding: "8px 24px 40px", overflowY: "auto" }}>
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8, marginTop: 8,
        background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 4, width: "fit-content" }}>
        {tabBtn("stats", "Statistics")}
        {tabBtn("duplicates", "Duplicates")}
        {tabBtn("history", "Listening History")}
      </div>

      {activeTab === "duplicates" && (
        <DuplicatesTab records={records} onFilter={onFilter} onRefresh={onRefresh} />
      )}

      {activeTab === "history" && (
        <div>
          {!listeningStats ? (
            <div style={{ padding: "40px", textAlign: "center", color: C.textMuted }}>Loading…</div>
          ) : listeningStats.totalPlays === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: C.textMuted, fontSize: 14 }}>
              No listening history yet. Scan a record barcode in Now Playing to start tracking.
            </div>
          ) : (<>
            <div style={{ display: "flex", gap: 16, marginBottom: 20, marginTop: 8 }}>
              <div style={{ background: "rgba(124,58,237,0.08)", border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "14px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.purpleLight }}>{listeningStats.totalPlays}</div>
                <div style={{ fontSize: 12, color: C.textDim }}>Total plays</div>
              </div>
              <div style={{ background: "rgba(124,58,237,0.08)", border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "14px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.purpleLight }}>{listeningStats.mostPlayed.length}</div>
                <div style={{ fontSize: 12, color: C.textDim }}>Records played</div>
              </div>
            </div>

            <SectionHead title="Most played" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {listeningStats.mostPlayed.map((r, i) => {
                const img = JSON.parse(r.images || "[]").find(Boolean);
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 14,
                    background: "rgba(124,58,237,0.06)", border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: "10px 14px" }}>
                    <span style={{ fontSize: 13, color: C.textDim, minWidth: 20, textAlign: "right" }}>{i+1}</span>
                    <div style={{ width: 40, height: 40, borderRadius: 7, overflow: "hidden",
                      background: C.bgDeep, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/> : <span style={{ fontSize: 18, color: C.textDim }}>♫</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.text,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{r.artist}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: C.purpleLight }}>{r.play_count}</div>
                      <div style={{ fontSize: 10, color: C.textDim }}>plays</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <SectionHead title="Recent plays" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {listeningStats.recentPlays.map((p, i) => {
                const img = JSON.parse(p.images || "[]").find(Boolean);
                const date = new Date(p.played_at.replace(" ", "T") + "Z");
                const formatted = date.toLocaleDateString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric" })
                  + " at " + date.toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" });
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12,
                    padding: "8px 14px", borderRadius: 8,
                    background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                    <div style={{ width: 34, height: 34, borderRadius: 6, overflow: "hidden",
                      background: C.bgDeep, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/> : <span style={{ fontSize: 16, color: C.textDim }}>♫</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: C.text,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{p.artist}</div>
                    </div>
                    <div style={{ fontSize: 11, color: C.textDim, flexShrink: 0, textAlign: "right" }}>
                      {formatted}
                      {p.played_by && <div style={{ fontSize: 10, color: C.textDim }}>{p.played_by}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>)}
        </div>
      )}

      {activeTab === "stats" && (<>
        <SectionHead title="Overview" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
          <StatCard label="Total records" value={records.length} sub={`${totalTracks} total tracks`}
            onClick={() => onFilter({ type: "all" })}/>
          <StatCard label="Est. collection value" value={fmtMoney(totalVal)}
            sub={totalLow||totalHigh ? `${fmtMoney(totalLow)} – ${fmtMoney(totalHigh)}` : null} accent={C.gold}/>
          <StatCard label="Avg. rating" value={avgRating} sub={`${rated.length} rated`}
            onClick={rated.length ? () => onFilter({ type: "rated" }) : null}/>
          <StatCard label="Genres" value={genres.length} sub={genres[0]?.[0] ? `Top: ${genres[0][0]}` : null}/>
        </div>

        {topValue.length > 0 && (
          <>
            <SectionHead title="Top value" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topValue.map(r => (
                <div key={r.id} onClick={() => onFilter({ type: "record", value: r })}
                  style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
                    background: "rgba(59,130,246,0.06)", border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: "12px 16px",
                    boxShadow: "0 5px 0 rgba(0,0,0,0.4), 0 8px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), inset 1px 0 0 rgba(255,255,255,0.05)",
                    borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden",
                    background: C.bgDeep, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {r.images?.find(Boolean)
                      ? <img src={r.images.find(Boolean)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                      : <span style={{ fontSize: 20, color: C.textDim }}>♫</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: C.text,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: C.textMuted,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.artist}</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, gap: 2 }}>
                    <span style={{ fontSize: 17, fontWeight: 600, color: C.purpleLight }}>
                      ${parseFloat(r.est_value).toFixed(2)}
                    </span>
                    <span style={{ fontSize: 12, color: C.textDim }}>
                      ${parseFloat(r.low_value||0).toFixed(2)} – ${parseFloat(r.high_value||0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {topRated.length > 0 && (
          <>
            <SectionHead title="Top rated" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topRated.map(r => (
                <div key={r.id} onClick={() => onFilter({ type: "record", value: r })}
                  style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
                    background: "rgba(124,58,237,0.06)", border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: "12px 16px",
                    boxShadow: "0 5px 0 rgba(0,0,0,0.4), 0 8px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), inset 1px 0 0 rgba(255,255,255,0.05)",
                    borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden",
                    background: C.bgDeep, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {r.images?.find(Boolean)
                      ? <img src={r.images.find(Boolean)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                      : <span style={{ fontSize: 20, color: C.textDim }}>♫</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: C.text,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: C.textMuted,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.artist}</p>
                  </div>
                  <span style={{ fontSize: 16, color: C.gold, flexShrink: 0 }}>{"★".repeat(r.rating)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {genres.length > 0 && (
          <>
            <SectionHead title="By genre" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
              {genres.map(([g, n]) => (
                <Bar key={g} label={g} value={n} max={maxGenre}
                  color={`linear-gradient(90deg,${C.purple},${C.blueMid})`}
                  onClick={() => onFilter({ type: "genre", value: g })}/>
              ))}
            </div>
          </>
        )}

        {formats.length > 0 && (
          <>
            <SectionHead title="By format" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
              {formats.map(([f, n]) => (
                <Bar key={f} label={f} value={n} max={maxFmt}
                  color={`linear-gradient(90deg,${C.blueMid},${C.purpleLight})`}
                  onClick={() => onFilter({ type: "format", value: f })}/>
              ))}
            </div>
          </>
        )}

        {conditions.length > 0 && (
          <>
            <SectionHead title="Vinyl condition breakdown" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10 }}>
              {conditions.map(([g, n]) => (
                <div key={g} onClick={() => onFilter({ type: "condition", value: g })}
                  style={{ background: "rgba(124,58,237,0.08)", border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: "12px 14px", textAlign: "center", cursor: "pointer" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 500, color: C.purpleLight }}>{n}</p>
                  <p style={{ margin: 0, fontSize: 14, color: C.textMuted }}>
                    {(GRADE_LABELS[g] || g).replace(/\+$/, "")}
                    {(GRADE_LABELS[g] || g).endsWith("+") && <span style={{ fontSize: 16, fontWeight: 600, color: C.purpleLight }}>+</span>}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textDim }}>
                    {Math.round((n/records.length)*100)}%
                  </p>
                </div>
              ))}
            </div>
          </>
        )}


      </>)}
    </div>
  );
}
