// Direction B — Block Grid
// Modular widget tiles, Notion-meets-iOS-widgets aesthetic.
// Different tile shapes, sizes, and one orange "live" tile that pulses.

function BlockGrid({ dark = false, running = true, accent = "#E55B13", elapsed = "01:42:18", elapsedHM = "1h 42m", onToggle, project = "Atlas Identity", client = "Northwind", todayHours = 4.2, weekHours = 23.4, dayBars = null }) {
  const bg = dark ? "#0e0e10" : "#ece8e0";
  const text = dark ? "#f5f5f7" : "#1a1a1a";
  const muted = dark ? "rgba(245,245,247,0.55)" : "rgba(26,26,26,0.55)";
  const line = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  // tile palette — minimal: paper / dark / orange
  const paper = dark ? "#1c1c1e" : "#fafaf7";
  const stone = dark ? "#2a2a2d" : "#dfd9cc";
  const ink = dark ? "#f5f5f7" : "#1a1a1a";
  const onInk = dark ? "#0e0e10" : "#fafaf7";

  const bars = dayBars || [5.5, 6.2, 4.8, 7.0, 4.2, 0, 0]; // mon..sun

  return (
    <div style={{
      height: "100%",
      background: bg,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: text,
    }}>
      {/* Row 1: BIG live timer tile (orange) */}
      <Tile bg={running ? accent : ink} fg="#fff" pad="14px 16px" style={{ flex: "0 0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#fff",
              animation: running ? "tt-pulse 1.4s ease-in-out infinite" : "none",
            }} />
            <span style={{ fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, opacity: 0.95 }}>
              {running ? "Live" : "Paused"}
            </span>
          </div>
          <span style={{ fontSize: 10.5, letterSpacing: "0.06em", opacity: 0.85, fontWeight: 500 }}>
            {project}
          </span>
        </div>

        <div style={{
          fontSize: 56,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          fontVariantNumeric: "tabular-nums",
          marginTop: 12,
          marginBottom: 2,
        }}>
          {elapsed}
        </div>
        <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 500 }}>
          {client} · $85/hr · ${(parseFloat(elapsed.split(":")[0]) + parseFloat(elapsed.split(":")[1])/60).toFixed(2) > 0 ? Math.round(85 * (Number(elapsed.split(":")[0]) + Number(elapsed.split(":")[1])/60)) : 0}.00 earned
        </div>
      </Tile>

      {/* Row 2: 2-up — Today (big number) + Week ring */}
      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 10, flex: "0 0 auto" }}>
        <Tile bg={paper} fg={ink} pad="12px 14px">
          <Label muted={muted}>Today</Label>
          <div style={{
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            marginTop: 10,
          }}>
            {todayHours.toFixed(1)}<span style={{ fontSize: 18, fontWeight: 500, color: muted, marginLeft: 4 }}>h</span>
          </div>
          <div style={{ fontSize: 11, color: muted, marginTop: 6, letterSpacing: "0.02em" }}>
            3 entries · ${Math.round(todayHours * 85)}
          </div>
        </Tile>

        <Tile bg={ink} fg={onInk} pad="12px 14px">
          <Label muted="rgba(255,255,255,0.5)" white>Week</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <Ring pct={weekHours / 40} accent={accent} track="rgba(255,255,255,0.15)" size={56} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {weekHours.toFixed(1)}
              </div>
              <div style={{ fontSize: 10.5, opacity: 0.6, letterSpacing: "0.04em", marginTop: 2 }}>of 40h</div>
            </div>
          </div>
        </Tile>
      </div>

      {/* Row 3: full-width bar chart tile */}
      <Tile bg={paper} fg={ink} pad="12px 14px" style={{ flex: "1 1 auto", minHeight: 110, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Label muted={muted}>Week activity</Label>
          <span style={{ fontSize: 11, color: muted, fontVariantNumeric: "tabular-nums" }}>Mon — Sun</span>
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, alignItems: "end", marginTop: 12, marginBottom: 4 }}>
          {bars.map((h, i) => {
            const isToday = i === 4;
            const max = 8;
            const heightPct = Math.max(2, (h / max) * 100);
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
                <div style={{
                  width: "100%",
                  height: `${heightPct}%`,
                  background: h === 0 ? (dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)") : (isToday ? accent : ink),
                  borderRadius: 2,
                  minHeight: 4,
                }} />
                <span style={{ fontSize: 9.5, color: muted, letterSpacing: "0.06em", fontWeight: 500 }}>
                  {["M","T","W","T","F","S","S"][i]}
                </span>
              </div>
            );
          })}
        </div>
      </Tile>

      {/* Row 4: 3-up small tiles — switch / add / view */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, flex: "0 0 auto" }}>
        <ActionTile bg={stone} fg={ink} muted={muted} icon={
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h10M2 7h10M2 10h7"/></svg>
        } label="Projects" sub="6 active" />
        <ActionTile bg={stone} fg={ink} muted={muted} icon={
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 2v10M2 7h10"/></svg>
        } label="Add entry" sub="Manual" />
        <ActionTile bg={stone} fg={ink} muted={muted} icon={
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2.5" width="10" height="9" rx="1"/><path d="M2 5.5h10M5 2.5v9"/></svg>
        } label="History" sub="Reports" />
      </div>

      {/* Row 5: bottom action — start/stop button strip */}
      <button onClick={onToggle} style={{
        width: "100%",
        height: 44,
        border: "none",
        borderRadius: 12,
        background: running ? ink : accent,
        color: running ? onInk : "#fff",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.02em",
        cursor: "pointer",
        fontFamily: "inherit",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        flex: "0 0 auto",
      }}>
        {running ? (
          <>
            <span style={{ width: 10, height: 10, background: onInk, display: "inline-block" }} />
            Stop timer
          </>
        ) : (
          <>
            <span style={{
              width: 0, height: 0,
              borderLeft: "10px solid #fff",
              borderTop: "7px solid transparent",
              borderBottom: "7px solid transparent",
              marginLeft: 3,
            }} />
            Start timer
          </>
        )}
      </button>

      <style>{`
        @keyframes tt-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

function Tile({ bg, fg, pad, children, style }) {
  return (
    <div style={{
      background: bg,
      color: fg,
      borderRadius: 14,
      padding: pad,
      ...style,
    }}>{children}</div>
  );
}

function Label({ children, muted, white }) {
  return (
    <span style={{
      fontSize: 10.5,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      fontWeight: 600,
      color: muted,
    }}>{children}</span>
  );
}

function Ring({ pct, accent, track, size = 48 }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const dash = c * Math.max(0, Math.min(1, pct));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth="4" />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={accent}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
      />
    </svg>
  );
}

function ActionTile({ bg, fg, muted, icon, label, sub }) {
  return (
    <div style={{
      background: bg,
      color: fg,
      borderRadius: 12,
      padding: "11px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      cursor: "pointer",
      minHeight: 64,
    }}>
      <div style={{ opacity: 0.85 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "-0.005em" }}>{label}</div>
        <div style={{ fontSize: 10.5, color: muted, marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}

window.BlockGrid = BlockGrid;
