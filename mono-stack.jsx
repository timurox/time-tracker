// Direction A — Mono Stack
// Bold typographic numerals, vertical stack, "less but better"
// Inspired by the calendar reference with the giant 28 + dot grid.

function MonoStack({ dark = false, running = true, accent = "#E55B13", elapsed = "01:42:18", onToggle, project = "Atlas Identity", client = "Northwind Studio", tags = ["Design", "Billable"], todayHours = 4.2, todayMin = 12, weekDots = null }) {
  const bg = dark ? "#1c1c1e" : "#fafaf7";
  const text = dark ? "#f5f5f7" : "#1a1a1a";
  const muted = dark ? "rgba(245,245,247,0.5)" : "rgba(26,26,26,0.5)";
  const subtle = dark ? "rgba(245,245,247,0.7)" : "rgba(26,26,26,0.7)";
  const line = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const dotOn = dark ? "#f5f5f7" : "#1a1a1a";
  const dotOff = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";

  // 7 days × 4 rows of dots = 28 cells representing 8h capacity per day chunked into 2h
  // Last cell of "today" is the orange one
  const todayIndex = 6; // Sun (matching reference)
  const filledByDay = weekDots || [4, 3, 4, 4, 2, 0, 2]; // hrs/2 chunks

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      padding: "24px 24px 0 24px",
      background: bg,
      color: text,
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Top row: project + tag */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: muted, fontWeight: 500 }}>
            Tracking
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: running ? accent : muted, boxShadow: running ? `0 0 8px ${accent}` : "none" }} />
          <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500, color: subtle }}>
            {running ? "Live" : "Paused"}
          </span>
        </div>
      </div>

      {/* The big timer */}
      <div style={{
        fontSize: 72,
        fontWeight: 700,
        lineHeight: 0.95,
        letterSpacing: "-0.04em",
        fontVariantNumeric: "tabular-nums",
        fontFeatureSettings: "'tnum' 1, 'lnum' 1",
        marginBottom: 4,
      }}>
        {elapsed}
      </div>

      {/* Project + client */}
      <div style={{ marginTop: 16, marginBottom: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>{project}</div>
        <div style={{ fontSize: 13, color: subtle, marginTop: 2 }}>{client} · $85/hr</div>
      </div>

      {/* tag chips */}
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        {tags.map((t, i) => (
          <span key={i} style={{
            fontSize: 10.5,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontWeight: 500,
            padding: "4px 8px",
            border: `1px solid ${line}`,
            borderRadius: 4,
            color: subtle,
          }}>{t}</span>
        ))}
      </div>

      {/* divider */}
      <div style={{ height: 1, background: line, margin: "24px 0 22px" }} />

      {/* Week dots */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: muted, fontWeight: 500 }}>
            This Week
          </span>
          <span style={{ fontSize: 12, color: subtle, fontVariantNumeric: "tabular-nums" }}>
            <span style={{ color: text, fontWeight: 600 }}>23.4</span> / 40 h
          </span>
        </div>

        {/* Day labels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0, marginBottom: 10 }}>
          {["M","T","W","T","F","S","S"].map((d, i) => (
            <div key={i} style={{ fontSize: 10, color: muted, textAlign: "center", letterSpacing: "0.08em", fontWeight: 500 }}>{d}</div>
          ))}
        </div>

        {/* 4 rows of dots */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[3,2,1,0].map((row) => (
            <div key={row} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0 }}>
              {filledByDay.map((filled, day) => {
                const isToday = day === todayIndex;
                const isFilled = filled > row;
                const isCurrent = isToday && row === filled - 1; // top-most filled today => orange
                return (
                  <div key={day} style={{ display: "flex", justifyContent: "center" }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: "50%",
                      background: isCurrent ? accent : (isFilled ? dotOn : "transparent"),
                      border: isFilled ? "none" : `1.5px solid ${dotOff}`,
                      transition: "background 200ms",
                    }} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Spacer pushes controls to bottom */}
      <div style={{ flex: 1 }} />

      {/* Bottom action bar */}
      <div style={{
        margin: "0 -24px",
        padding: "14px 18px",
        borderTop: `1px solid ${line}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <button onClick={onToggle} style={{
          flex: 1,
          height: 40,
          border: "none",
          borderRadius: 8,
          background: running ? text : accent,
          color: running ? bg : "#fff",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.02em",
          cursor: "pointer",
          fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {running ? (
            <>
              <span style={{ width: 9, height: 9, background: bg, display: "inline-block" }} />
              Stop
            </>
          ) : (
            <>
              <span style={{
                width: 0, height: 0,
                borderLeft: "9px solid #fff",
                borderTop: "6px solid transparent",
                borderBottom: "6px solid transparent",
                marginLeft: 2,
              }} />
              Start
            </>
          )}
        </button>
        <button style={iconBtnStyle(text, line, dark)} title="Switch project">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 4h10M2 7h10M2 10h7"/></svg>
        </button>
        <button style={iconBtnStyle(text, line, dark)} title="Add manual entry">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 2v10M2 7h10"/></svg>
        </button>
        <button style={iconBtnStyle(text, line, dark)} title="More">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/><circle cx="11" cy="7" r="1.2"/></svg>
        </button>
      </div>
    </div>
  );
}

function iconBtnStyle(text, line, dark) {
  return {
    width: 40, height: 40,
    border: `1px solid ${line}`,
    borderRadius: 8,
    background: "transparent",
    color: text,
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "inherit",
  };
}

window.MonoStack = MonoStack;
