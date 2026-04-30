import { useState, useEffect } from "react";
import { C } from "./shared";

const GREETINGS = [
  "Well, well, well… look who decided to show up.",
  "The turntable has been lonely without you.",
  "Ah, the curator returns. Your vinyl has been waiting.",
  "Drop the needle — {name} is back in the house.",
  "Someone's got great taste. Oh wait, that's you.",
  "Back again? Your records were starting to worry.",
  "The groove doesn't stop just because you're here, but it does get better.",
  "Welcome back. Your collection missed you more than it'll admit.",
  "The party started the moment you logged in.",
  "Another day, another chance to buy records you definitely don't need.",
  "You're here. The vinyl gods are pleased.",
  "Spin it to win it, {name}. Welcome back.",
  "Your collection called. It says it needs more albums.",
  "Look who crawled out from behind the crates.",
  "The doctor is in. Please see the patient — your collection.",
  "Side A is cued up. Time to flip the day over.",
  "You've got great taste in music AND apps. Welcome back.",
  "Your records are alphabetized and ready for inspection.",
  "Reporting for duty? Your vinyl library salutes you.",
  "The stylus is ready. Are you?",
  "Back in the groove, {name}. Literally.",
  "We were starting to think you'd gone digital. Glad you're back.",
  "Your collection isn't going to catalog itself, you know.",
  "The RPMs are rising. Welcome back.",
  "Ah yes, the collector returns to survey the kingdom.",
  "Put the kettle on — it's time to dig through the crates.",
  "You had us at 180 gram vinyl. Welcome back.",
  "Less streaming, more dreaming. Welcome back.",
  "Every record has a story. Ready to add another chapter?",
  "Welcome back. We saved your seat by the turntable.",
];

function formatDate(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr.replace(" ", "T") + (isoStr.includes("T") ? "" : "Z"));
  return d.toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long", month: "long", day: "numeric"
  }) + " at " + d.toLocaleTimeString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric", minute: "2-digit"
  });
}

function formatCurrency(val) {
  return val ? `$${parseFloat(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00";
}

export default function WelcomeModal({ onClose, onNoArtwork, recordsReady }) {
  const [data, setData] = useState(null);
  const [greeting, setGreeting] = useState("");
  const [customGreeting, setCustomGreeting] = useState("");
  const [forceReady, setForceReady] = useState(false);

  // 5 second safety cap — releases the button no matter what
  useEffect(() => {
    const timer = setTimeout(() => setForceReady(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const canDismiss = recordsReady || forceReady;

  useEffect(() => {
    // Load welcome data
    window.api.getWelcomeData().then(d => {
      setData(d);
      // Pick a random greeting and personalize it
      const g = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      const name = d.firstName || "friend";
      setGreeting(g.replace("{name}", name));
    });
    // Load custom greeting if admin set one
    window.api.getSetting("welcome_greeting").then(g => {
      if (g) setCustomGreeting(g);
    });
  }, []);

  const displayGreeting = customGreeting
    ? customGreeting.replace("{name}", data?.firstName || "friend")
    : greeting;

  if (!data) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
      zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`,
        borderRadius: 16, width: "100%", maxWidth: 520, padding: "60px 36px",
        boxShadow: `0 0 80px rgba(124,58,237,0.25)`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ animation: "spin 1.2s linear infinite", fontSize: 36 }}>🎵</div>
        <p style={{ margin: 0, fontSize: 14, color: C.textMuted }}>Loading your collection…</p>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
      zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={canDismiss ? onClose : undefined}>
      <style>{`@keyframes welcomeIn{from{opacity:0;transform:scale(0.95) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      <div onClick={e => e.stopPropagation()}
        style={{ background: C.bgCard, border: `1px solid ${C.border}`,
          borderRadius: 16, width: "100%", maxWidth: 520,
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: `0 0 80px rgba(124,58,237,0.25)`,
          padding: "32px 36px", boxSizing: "border-box",
          animation: "welcomeIn 0.25s ease both" }}>

        {/* Greeting */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🎵</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 600,
            color: C.text, lineHeight: 1.3 }}>
            {displayGreeting || "Welcome back!"}
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: C.textDim }}>
            Last visit: {data?.lastLogin ? formatDate(data?.lastLogin) : "First Login"}
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Records", value: data?.total?.toLocaleString() ?? "—", icon: "💿" },
            { label: "Est. Value", value: formatCurrency(data?.totalValue), icon: "💰" },
            { label: "Added Since Last Visit", value: data?.addedSince || "—", icon: "✨" },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{ background: "rgba(124,58,237,0.08)",
              border: `1px solid ${C.border}`, borderRadius: 10,
              padding: "14px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: C.purpleLight }}>{value}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Today's pick */}
        {data?.todaysPick && (
          <div style={{ background: "rgba(59,130,246,0.07)", border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "14px 16px", marginBottom: 16,
            display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden",
              flexShrink: 0, background: C.bgDeep }}>
              {data?.todaysPick.image
                ? <img src={data?.todaysPick.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎶</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: C.purpleLight, fontWeight: 500,
                textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                🎲 Today's Pick
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.text,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {data?.todaysPick.title}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {data?.todaysPick.artist}
              </div>
            </div>
          </div>
        )}

        {/* Missing artwork nudge */}
        {data?.noArtwork > 0 && (
          <div onClick={() => { onNoArtwork(); onClose(); }}
            style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.3)",
              borderRadius: 10, padding: "12px 16px", marginBottom: 16,
              display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <span style={{ fontSize: 20 }}>🖼️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "#fb923c", fontWeight: 500 }}>
                {data?.noArtwork} record{data?.noArtwork !== 1 ? "s" : ""} missing artwork
              </div>
              <div style={{ fontSize: 11, color: C.textDim }}>Click to filter and add artwork</div>
            </div>
            <span style={{ fontSize: 16, color: "#fb923c" }}>→</span>
          </div>
        )}

        {/* Dismiss button */}
        <button onClick={canDismiss ? onClose : undefined}
          disabled={!canDismiss}
          style={{ width: "100%", padding: "12px", border: "none", borderRadius: 10,
            background: canDismiss
              ? `linear-gradient(135deg,${C.purple},${C.blueMid})`
              : "rgba(255,255,255,0.08)",
            color: canDismiss ? "#fff" : C.textDim,
            fontSize: 14, fontWeight: 500,
            cursor: canDismiss ? "pointer" : "not-allowed",
            marginTop: 4, transition: "all 0.3s ease",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {canDismiss ? "Let's go!" : (
            <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span> Loading your library…</>
          )}
        </button>
      </div>
    </div>
  );
}
