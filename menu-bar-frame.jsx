// MenuBarFrame — a macOS menu bar dropdown panel
// Shows the system menu bar at top with the app's status item highlighted,
// then the dropdown panel hanging from it.

function MenuBarFrame({ width = 380, statusLabel = "00:42:18", accent = "#E55B13", dark = false, children, panelHeight = 560, statusIcon = "dot" }) {
  const barBg = dark ? "rgba(28,28,30,0.92)" : "rgba(245,243,239,0.86)";
  const barText = dark ? "#f5f5f7" : "#1a1a1a";
  const barBorder = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const wallpaper = dark
    ? "radial-gradient(ellipse at 30% 20%, #2a2a30 0%, #18181b 60%, #0d0d10 100%)"
    : "radial-gradient(ellipse at 70% 10%, #efece6 0%, #d8d3c8 60%, #c4bdae 100%)";

  const sysItems = ["", "File", "Edit", "View", "Window", "Help"];

  return (
    <div style={{
      width,
      // total height = bar + small gap + panel
      // we render the wallpaper background to evoke "this is on a desktop"
      background: wallpaper,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: "0",
      borderRadius: 0,
      overflow: "hidden",
      position: "relative",
    }}>
      {/* macOS menu bar */}
      <div style={{
        height: 28,
        background: barBg,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `0.5px solid ${barBorder}`,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 16,
        fontSize: 13,
        color: barText,
        position: "relative",
        zIndex: 2,
      }}>
        {/* Apple logo */}
        <svg width="13" height="14" viewBox="0 0 13 14" fill={barText}>
          <path d="M10.5 7.4c0-1.6 1.3-2.4 1.4-2.4-.8-1.1-1.9-1.3-2.4-1.3-1-.1-2 .6-2.5.6s-1.3-.6-2.2-.6c-1.1 0-2.2.7-2.8 1.7-1.2 2.1-.3 5.2.9 6.9.6.8 1.3 1.7 2.2 1.7.9 0 1.2-.6 2.2-.6s1.3.6 2.2.6c.9 0 1.5-.8 2.1-1.7.7-.9.9-1.8.9-1.9 0 0-1.8-.7-1.8-2.7zM8.7 2.6c.4-.5.7-1.3.6-2-.7 0-1.5.4-2 1-.4.4-.8 1.2-.7 1.9.8.1 1.6-.4 2.1-.9z"/>
        </svg>
        {sysItems.slice(1).map((item, i) => (
          <span key={i} style={{ fontWeight: i === 0 ? 600 : 400, opacity: i === 0 ? 1 : 0.85 }}>{item}</span>
        ))}

        <div style={{ flex: 1 }} />

        {/* right side icons */}
        <span style={{ opacity: 0.6, fontSize: 12 }}>􀛨</span>
        <span style={{ opacity: 0.6, fontSize: 12 }}>􀋚</span>

        {/* OUR APP — highlighted status item */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "3px 8px",
          borderRadius: 4,
          background: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 500,
          fontSize: 12,
          letterSpacing: "0.01em",
        }}>
          {statusIcon === "dot" && (
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: accent,
              boxShadow: `0 0 6px ${accent}`,
            }} />
          )}
          {statusIcon === "square" && (
            <span style={{ width: 7, height: 7, background: accent }} />
          )}
          <span>{statusLabel}</span>
        </div>

        <span style={{ opacity: 0.85, fontSize: 12, marginLeft: 4 }}>Sun 15:42</span>
      </div>

      {/* tiny gap below bar */}
      <div style={{ height: 6 }} />

      {/* triangle pointer connecting bar to panel — positioned over our status item */}
      <div style={{
        position: "absolute",
        top: 30,
        right: 90,
        width: 0, height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        borderBottom: `6px solid ${dark ? "#1c1c1e" : "#fafaf7"}`,
        zIndex: 3,
      }} />

      {/* the panel itself */}
      <div style={{
        margin: "0 12px 16px 12px",
        background: dark ? "#1c1c1e" : "#fafaf7",
        borderRadius: 12,
        boxShadow: dark
          ? "0 20px 60px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.08)"
          : "0 20px 60px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.06)",
        overflow: "hidden",
        height: panelHeight,
        color: dark ? "#f5f5f7" : "#1a1a1a",
        position: "relative",
      }}>
        {children}
      </div>
    </div>
  );
}

window.MenuBarFrame = MenuBarFrame;
