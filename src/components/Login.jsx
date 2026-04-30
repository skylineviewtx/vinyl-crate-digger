import { useState } from "react";
import { C, VinylSVG } from "./shared";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await window.api.login({ username, password });
    setLoading(false);
    if (res.ok) onLogin(res.username, res.role, res.mustChangePassword, res.firstName);
    else setError(res.error);
  };

  const inp = {
    width: "100%", boxSizing: "border-box", padding: "10px 14px",
    fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8,
    background: "rgba(255,255,255,0.05)", color: C.text, outline: "none",
    marginBottom: 12
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex",
      alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        input:focus{border-color:${C.purple}!important}`}</style>

      <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400,
        borderRadius: "50%", background: `radial-gradient(circle,rgba(124,58,237,0.1),transparent 70%)`, pointerEvents: "none" }}/>
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 300, height: 300,
        borderRadius: "50%", background: `radial-gradient(circle,rgba(59,130,246,0.07),transparent 70%)`, pointerEvents: "none" }}/>

      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16,
        padding: "40px 36px", width: "100%", maxWidth: 360,
        boxShadow: `0 0 80px rgba(124,58,237,0.15)` }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          <div style={{ animation: "spin 8s linear infinite", marginBottom: 16 }}>
            <VinylSVG size={64} />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: C.text }}>Vinyl Crate Digger</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: C.textMuted }}>Sign in to your collection</p>
        </div>

        <form onSubmit={handle}>
          <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>USERNAME</label>
          <input value={username} onChange={e => setUsername(e.target.value)} style={inp} autoFocus />
          <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>PASSWORD</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ ...inp, marginBottom: 0 }} />

          {error && <p style={{ margin: "10px 0 0", fontSize: 12, color: "#f87171", textAlign: "center" }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{ width: "100%", marginTop: 20, padding: "11px", fontSize: 14, fontWeight: 500,
              border: "none", borderRadius: 8, cursor: loading ? "default" : "pointer",
              background: `linear-gradient(135deg,${C.purple},${C.blueMid})`, color: "#fff",
              opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

      </div>
    </div>
  );
}