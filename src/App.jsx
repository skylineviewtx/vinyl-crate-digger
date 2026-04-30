import { useState, useEffect } from "react";
import Login from "./components/Login";
import Library from "./components/Library";
import AlbumDetail from "./components/AlbumDetail";
import ForcePasswordChange from "./components/ForcePasswordChange";
import WelcomeModal from "./components/WelcomeModal";
import { loadFonts, getFontSettings, applyFontSettings } from "./components/shared";

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [recordsReady, setRecordsReady] = useState(false);
  const [noArtworkFilter, setNoArtworkFilter] = useState(false);
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    setHash(window.location.hash);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    loadFonts();
    getFontSettings().then(applyFontSettings);
  }, []);

  if (hash === "#/detail" || hash === "#detail") return <AlbumDetail />;

  const handleLogin = (username, userRole, mustChange, fName) => {
    setUser(username);
    setRole(userRole);
    setFirstName(fName || "");
    setMustChangePassword(!!mustChange);
    setRecordsReady(false);
    if (!mustChange) setShowWelcome(true);
  };

  const handleLogout = async () => {
    await window.api.logout();
    setUser(null); setRole(null); setFirstName(""); setMustChangePassword(false);
    setShowWelcome(false); setNoArtworkFilter(false); setRecordsReady(false);
  };

  if (!user) return <Login onLogin={handleLogin} />;
  if (mustChangePassword) return <ForcePasswordChange user={user} onDone={() => {
    setMustChangePassword(false);
    setShowWelcome(true);
  }} />;

  return (
    <>
      <Library
        user={user}
        role={role}
        firstName={firstName}
        onLogout={handleLogout}
        noArtworkFilter={noArtworkFilter}
        onNoArtworkFilterUsed={() => setNoArtworkFilter(false)}
        onReady={() => setRecordsReady(true)}
      />
      {showWelcome && (
        <WelcomeModal
          recordsReady={recordsReady}
          onClose={() => setShowWelcome(false)}
          onNoArtwork={() => { setNoArtworkFilter(true); setShowWelcome(false); }}
        />
      )}
    </>
  );
}
