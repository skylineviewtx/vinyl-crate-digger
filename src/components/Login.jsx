import { useState } from "react";
import { C, VinylSVG } from "./shared";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("login"); // "login" | "reset"
  const [resetCode, setResetCode] = useState("");
  const [resetPw, setResetPw] = useState("");
  const [resetPw2, setResetPw2] = useState("");
  const [notice, setNotice] = useState("");

  const handle = async (e) => {
    e.preventDefault();
    setError(""); setNotice(""); setLoading(true);
    const res = await window.api.login({ username, password });
    setLoading(false);
    if (res.ok) onLogin(res.username, res.role, res.mustChangePassword, res.firstName);
    else setError(res.error);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    if (resetPw !== resetPw2) { setError("New passwords do not match."); return; }
    setLoading(true);
    const res = await window.api.resetWithRecoveryCode({ username, code: resetCode, newPassword: resetPw });
    setLoading(false);
    if (res.ok) {
      setView("login");
      setPassword(""); setResetCode(""); setResetPw(""); setResetPw2("");
      setNotice("Password reset. Log in with your new password.");
    } else setError(res.error);
  };

  const switchView = (v) => {
    setView(v); setError(""); setNotice("");
    setResetCode(""); setResetPw(""); setResetPw2("");
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
          <p style={{ margin: "6px 0 0", fontSize: 13, color: C.textMuted }}>
            {view === "login" ? "Sign in to your collection" : "Reset your password"}
          </p>
        </div>

        {view === "login" ? (
        <form onSubmit={handle}>
          <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>USERNAME</label>
          <input value={username} onChange={e => setUsername(e.target.value)} style={inp} autoFocus />
          <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>PASSWORD</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ ...inp, marginBottom: 0 }} />

          {notice && <p style={{ margin: "10px 0 0", fontSize: 12, color: "#4ade80", textAlign: "center" }}>{notice}</p>}
          {error && <p style={{ margin: "10px 0 0", fontSize: 12, color: "#f87171", textAlign: "center" }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{ width: "100%", marginTop: 20, padding: "11px", fontSize: 14, fontWeight: 500,
              border: "none", borderRadius: 8, cursor: loading ? "default" : "pointer",
              background: `linear-gradient(135deg,${C.purple},${C.blueMid})`, color: "#fff",
              opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p style={{ margin: "16px 0 0", textAlign: "center" }}>
            <a href="#" onClick={e => { e.preventDefault(); switchView("reset"); }}
              style={{ fontSize: 12, color: C.textMuted, textDecoration: "underline", cursor: "pointer" }}>
              Forgot password?
            </a>
          </p>
        </form>
        ) : (
        <form onSubmit={handleReset}>
          <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>USERNAME</label>
          <input value={username} onChange={e => setUsername(e.target.value)} style={inp} autoFocus />
          <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>RECOVERY CODE</label>
          <input value={resetCode} onChange={e => setResetCode(e.target.value)}
            placeholder="XXXX-XXXX-XXXX-XXXX" spellCheck={false} autoComplete="off" style={inp} />
          <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>NEW PASSWORD</label>
          <input type="password" value={resetPw} onChange={e => setResetPw(e.target.value)} style={inp} />
          <label style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>CONFIRM NEW PASSWORD</label>
          <input type="password" value={resetPw2} onChange={e => setResetPw2(e.target.value)} style={{ ...inp, marginBottom: 0 }} />

          {error && <p style={{ margin: "10px 0 0", fontSize: 12, color: "#f87171", textAlign: "center" }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{ width: "100%", marginTop: 20, padding: "11px", fontSize: 14, fontWeight: 500,
              border: "none", borderRadius: 8, cursor: loading ? "default" : "pointer",
              background: `linear-gradient(135deg,${C.purple},${C.blueMid})`, color: "#fff",
              opacity: loading ? 0.7 : 1 }}>
            {loading ? "Resetting…" : "Reset password"}
          </button>

          <p style={{ margin: "16px 0 0", textAlign: "center" }}>
            <a href="#" onClick={e => { e.preventDefault(); switchView("login"); }}
              style={{ fontSize: 12, color: C.textMuted, textDecoration: "underline", cursor: "pointer" }}>
              Back to login
            </a>
          </p>
        </form>
        )}

      </div>
    </div>
  );
}