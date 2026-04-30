import { C } from "./shared";
import { playCheckClick } from "../sounds";

export function RecordRow({ rec, onEdit, onDelete, onDetail, selected, onToggleSelect, bulkMode }) {
  return (
    <tr style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer",
      background: selected ? "rgba(124,58,237,0.1)" : "transparent" }}
      onClick={() => bulkMode ? onToggleSelect(rec.id) : onEdit(rec)}>
      <td style={{ padding: "8px 10px", width: 36 }} onClick={e => e.stopPropagation()}>
        {bulkMode ? (
          <input type="checkbox" checked={selected} onChange={() => { playCheckClick(); onToggleSelect(rec.id); }}
            style={{ cursor: "pointer", accentColor: C.purple, width: 14, height: 14 }}/>
        ) : (
          <input type="checkbox" checked={selected} onChange={() => { playCheckClick(); onToggleSelect(rec.id); }}
            style={{ cursor: "pointer", accentColor: C.purple, width: 14, height: 14 }}/>
        )}
      </td>
      {[rec.artist, rec.title, rec.year, rec.genre, rec.format,
        rec.vinyl_cond, rec.jacket_cond, rec.location].map((v, i) => (
        <td key={i} style={{ padding: "8px 10px", fontSize: 12,
          color: i===1 ? C.text : C.textMuted,
          whiteSpace: "nowrap", overflow: "hidden", maxWidth: 140, textOverflow: "ellipsis" }}>{v}</td>
      ))}
      <td style={{ padding: "8px 10px", fontSize: 11, color: C.gold, whiteSpace: "nowrap" }}>
        {rec.rating > 0 ? "★".repeat(rec.rating) : ""}
      </td>
      <td style={{ padding: "8px 10px" }}>
        <div style={{ display: "flex", gap: 5 }}>
          {!bulkMode && (
            <>
              <button onClick={e => { e.stopPropagation(); onDetail(rec); }}
                style={{ fontSize: 10, padding: "2px 8px", border: `0.5px solid ${C.purple}`,
                  borderRadius: 5, background: "rgba(124,58,237,0.1)", color: C.purpleLight, cursor: "pointer" }}>
                Tracks
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(rec.id); }}
                style={{ fontSize: 10, padding: "2px 8px", border: `0.5px solid ${C.border}`,
                  borderRadius: 5, background: "transparent", color: C.textDim, cursor: "pointer" }}>✕</button>
            </>
          )}
          {bulkMode && (
            <span style={{ fontSize: 10, color: selected ? C.purpleLight : C.textDim }}>
              {selected ? "✓ Selected" : "Click to select"}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

export default RecordRow;
