import { useState } from "react";
import { C, VinylSVG } from "./shared";

export default function ForcePasswordChange({ user, onDone }) {
  const [form, setForm] = useState({ old: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inp = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px",
    fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8,
    background: "rgba(255,255,255,0.05)", color: C.text, outline: "none",
    marginBottom: 12,
    boxShadow: "inset 0 3px 6px rgba(0,0,0,0.55), inset 0 1px 3px rgba(0,0,0,0.4)",
  };

  const handle = async (e) => {
    e.preventDefault();
    setError("");
    if (form.next !== form.confirm) { setError("Passwords do not match."); return; }
    if (form.next.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const res = await window.api.changePassword({ username: user, oldPassword: form.old, newPassword: form.next });
    setLoading(false);
    if (res.ok) onDone();
    else setError(res.error);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex",
      alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        input:focus{border-color:${C.purple}!important}`}</style>

      <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400,
        borderRadius: "50%", background: `radial-gradient(circle,rgba(124,58,237,0.1),transparent 70%)`, pointerEvents: "none" }}/>

      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16,
        padding: "40px 36px", width: "100%", maxWidth: 380,
        boxShadow: `0 8px 0 rgba(0,0,0,0.4), 0 16px 48px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.08)` }}>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <div style={{ animation: "spin 1.8s linear infinite", marginBottom: 16 }}>
            <VinylSVG size={56} />
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: C.text }}>Change your password</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: C.textMuted, textAlign: "center", lineHeight: 1.5 }}>
            Your account requires a password change before continuing.
          </p>
        </div>

        <form onSubmit={handle}>
          <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
            CURRENT PASSWORD
          </label>
          <input type="password" value={form.old}
            onChange={e => setForm(f => ({ ...f, old: e.target.value }))} style={inp} autoFocus />

          <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
            NEW PASSWORD
          </label>
          <input type="password" value={form.next}
            onChange={e => setForm(f => ({ ...f, next: e.target.value }))} style={inp} />

          <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
            CONFIRM NEW PASSWORD
          </label>
          <input type="password" value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            style={{ ...inp, marginBottom: 0 }} />

          {error && <p style={{ margin: "10px 0 0", fontSize: 12, color: "#f87171", textAlign: "center" }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{ width: "100%", marginTop: 20, padding: "11px", fontSize: 14, fontWeight: 500,
              border: "none", borderRadius: 8, cursor: loading ? "default" : "pointer",
              background: `linear-gradient(135deg,${C.purple},${C.blueMid})`, color: "#fff",
              opacity: loading ? 0.7 : 1 }}>
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
