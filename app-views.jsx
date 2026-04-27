// app-views.jsx — main app UI: Now (timer), Projects, History
// Reuses the Block Grid aesthetic from the prototype.

const ACCENT = "#E55B13";

// ── Theme helper ──
function useTheme(dark) {
  return React.useMemo(() => ({
    bg: dark ? "#0e0e10" : "#ece8e0",
    paper: dark ? "#1c1c1e" : "#fafaf7",
    stone: dark ? "#2a2a2d" : "#dfd9cc",
    ink: dark ? "#f5f5f7" : "#1a1a1a",
    onInk: dark ? "#0e0e10" : "#fafaf7",
    text: dark ? "#f5f5f7" : "#1a1a1a",
    muted: dark ? "rgba(245,245,247,0.55)" : "rgba(26,26,26,0.55)",
    subtle: dark ? "rgba(245,245,247,0.75)" : "rgba(26,26,26,0.75)",
    line: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    accent: ACCENT,
  }), [dark]);
}

// ── Atoms ──
function Tile({ children, style, theme, bg, fg, pad = "16px 18px", onClick }) {
  return (
    <div onClick={onClick} style={{
      background: bg || theme.paper,
      color: fg || theme.text,
      borderRadius: 14,
      padding: pad,
      cursor: onClick ? "pointer" : "default",
      ...style,
    }}>{children}</div>
  );
}

function Label({ children, color }) {
  return (
    <span style={{
      fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase",
      fontWeight: 600, color,
    }}>{children}</span>
  );
}

function Ring({ pct, accent, track, size = 56, stroke = 5 }) {
  const r = size / 2 - stroke / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.max(0, Math.min(1, pct));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={accent} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// NOW VIEW — main timer screen
// ═══════════════════════════════════════════════════════════
function NowView({ state, actions, theme, now, onSwitchProject }) {
  const running = !!state.timer.startedAt;
  const project = state.projects.find((p) => p.id === state.timer.projectId) || state.projects[0];
  const elapsed = running ? now - state.timer.startedAt : 0;

  // Today's entries
  const todayStart = startOfDay(new Date()).getTime();
  const todayEntries = state.entries.filter((e) => e.start >= todayStart);
  const todayMs = todayEntries.reduce((sum, e) => sum + entryDuration(e), 0) + (running && state.timer.startedAt >= todayStart ? elapsed : 0);
  const todayHours = todayMs / 3600000;
  const todayEarnings = todayEntries.reduce((sum, e) => {
    const p = state.projects.find((pp) => pp.id === e.projectId);
    return sum + (entryDuration(e) / 3600000) * (p?.rate || 0);
  }, 0) + (running ? (elapsed / 3600000) * (project?.rate || 0) : 0);

  // Week
  const weekStart = startOfWeek(new Date(), state.weekStart || 1).getTime();
  const weekEntries = state.entries.filter((e) => e.start >= weekStart);
  const weekMs = weekEntries.reduce((sum, e) => sum + entryDuration(e), 0) + (running && state.timer.startedAt >= weekStart ? elapsed : 0);
  const weekHours = weekMs / 3600000;

  // 7 days bars
  const dayBars = Array(7).fill(0);
  for (const e of weekEntries) {
    const dayIdx = Math.floor((startOfDay(new Date(e.start)).getTime() - weekStart) / 86400000);
    if (dayIdx >= 0 && dayIdx < 7) dayBars[dayIdx] += entryDuration(e) / 3600000;
  }
  if (running && state.timer.startedAt >= weekStart) {
    const dayIdx = Math.floor((startOfDay(new Date(state.timer.startedAt)).getTime() - weekStart) / 86400000);
    if (dayIdx >= 0 && dayIdx < 7) dayBars[dayIdx] += elapsed / 3600000;
  }
  const todayDayIdx = Math.floor((todayStart - weekStart) / 86400000);

  const earnedNow = running ? Math.round((elapsed / 3600000) * (project?.rate || 0)) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* BIG TIMER TILE */}
      <Tile theme={theme} bg={running ? theme.accent : theme.ink} fg="#fff" pad="20px 22px">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", background: "#fff",
              animation: running ? "tt-pulse 1.4s ease-in-out infinite" : "none",
              opacity: running ? 1 : 0.5,
            }} />
            <span style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600 }}>
              {running ? "Live" : "Idle"}
            </span>
          </div>
          <button onClick={onSwitchProject} style={{
            border: "1px solid rgba(255,255,255,0.25)",
            background: "transparent", color: "#fff",
            padding: "5px 10px", borderRadius: 999,
            fontSize: 11, fontWeight: 500, letterSpacing: "0.02em",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
            {project?.name || "No project"}
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3.5L4.5 6 7 3.5"/></svg>
          </button>
        </div>

        <div style={{
          fontSize: 76, fontWeight: 700, lineHeight: 0.95,
          letterSpacing: "-0.045em", fontVariantNumeric: "tabular-nums",
          marginTop: 18, marginBottom: 4,
        }}>
          {fmtHMS(elapsed)}
        </div>
        <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>
          {project?.client || "—"} · ${project?.rate || 0}/hr · ${earnedNow.toFixed(2)} earned
        </div>
      </Tile>

      {/* Note input */}
      <Tile theme={theme} pad="0">
        <input
          value={state.timer.note}
          onChange={(e) => actions.setNote(e.target.value)}
          placeholder="What are you working on?"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: "inherit",
            fontSize: 14,
            color: theme.text,
            padding: "14px 18px",
          }}
        />
      </Tile>

      {/* 2-up: today + week ring */}
      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 12 }}>
        <Tile theme={theme}>
          <Label color={theme.muted}>Today</Label>
          <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, fontVariantNumeric: "tabular-nums", marginTop: 12 }}>
            {todayHours.toFixed(1)}<span style={{ fontSize: 18, fontWeight: 500, color: theme.muted, marginLeft: 4 }}>h</span>
          </div>
          <div style={{ fontSize: 11, color: theme.muted, marginTop: 6 }}>
            {todayEntries.length + (running ? 1 : 0)} {(todayEntries.length + (running ? 1 : 0)) === 1 ? "session" : "sessions"} · ${todayEarnings.toFixed(0)}
          </div>
        </Tile>

        <Tile theme={theme} bg={theme.ink} fg={theme.onInk}>
          <Label color="rgba(255,255,255,0.5)">Week</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <Ring pct={weekHours / 40} accent={theme.accent} track="rgba(255,255,255,0.15)" size={58} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {weekHours.toFixed(1)}
              </div>
              <div style={{ fontSize: 10.5, opacity: 0.6, letterSpacing: "0.04em", marginTop: 2 }}>of 40h</div>
            </div>
          </div>
        </Tile>
      </div>

      {/* Week activity bars */}
      <Tile theme={theme} style={{ minHeight: 130 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Label color={theme.muted}>Week activity</Label>
          <span style={{ fontSize: 11, color: theme.muted }}>Mon — Sun</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, alignItems: "end", marginTop: 14, height: 70 }}>
          {dayBars.map((h, i) => {
            const isToday = i === todayDayIdx;
            const heightPct = Math.max(2, (h / 8) * 100);
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%", justifyContent: "flex-end" }}>
                <div style={{
                  width: "100%",
                  height: `${heightPct}%`,
                  background: h === 0 ? theme.line : (isToday ? theme.accent : theme.ink),
                  borderRadius: 3, minHeight: 4,
                }} />
                <span style={{ fontSize: 10, color: theme.muted, letterSpacing: "0.06em", fontWeight: 500 }}>
                  {["M","T","W","T","F","S","S"][i]}
                </span>
              </div>
            );
          })}
        </div>
      </Tile>

      {/* START/STOP */}
      <button onClick={running ? actions.stopTimer : () => actions.startTimer(state.timer.projectId, state.timer.note)}
        style={{
          width: "100%", height: 52, border: "none", borderRadius: 14,
          background: running ? theme.ink : theme.accent,
          color: running ? theme.onInk : "#fff",
          fontSize: 14, fontWeight: 600, letterSpacing: "0.02em",
          cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
        {running ? (
          <><span style={{ width: 11, height: 11, background: theme.onInk, display: "inline-block" }} />Stop timer</>
        ) : (
          <>
            <span style={{ width: 0, height: 0,
              borderLeft: "11px solid #fff",
              borderTop: "7px solid transparent",
              borderBottom: "7px solid transparent",
              marginLeft: 3 }} />
            Start timer
          </>
        )}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PROJECTS VIEW
// ═══════════════════════════════════════════════════════════
function ProjectsView({ state, actions, theme }) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ name: "", client: "", rate: state.defaultRate });

  // total time per project
  const totals = {};
  for (const e of state.entries) {
    totals[e.projectId] = (totals[e.projectId] || 0) + entryDuration(e);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 4px" }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Projects</h2>
        <button onClick={() => setAdding(true)} style={{
          border: `1px solid ${theme.line}`, background: "transparent", color: theme.text,
          padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500,
          cursor: "pointer", fontFamily: "inherit",
        }}>+ New</button>
      </div>

      {adding && (
        <Tile theme={theme}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field theme={theme} label="Project name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="Atlas Identity" autoFocus />
            <Field theme={theme} label="Client" value={draft.client} onChange={(v) => setDraft({ ...draft, client: v })} placeholder="Northwind Studio" />
            <Field theme={theme} label="Rate ($/hr)" type="number" value={draft.rate} onChange={(v) => setDraft({ ...draft, rate: parseFloat(v) || 0 })} />
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => { setAdding(false); setDraft({ name: "", client: "", rate: state.defaultRate }); }} style={btnGhost(theme)}>Cancel</button>
              <button onClick={() => {
                if (!draft.name.trim()) return;
                actions.addProject(draft);
                setAdding(false);
                setDraft({ name: "", client: "", rate: state.defaultRate });
              }} style={btnPrimary(theme)}>Add project</button>
            </div>
          </div>
        </Tile>
      )}

      {state.projects.map((p) => {
        const total = totals[p.id] || 0;
        const isActive = state.timer.projectId === p.id;
        return (
          <Tile key={p.id} theme={theme}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
                  <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>{p.name}</div>
                  {isActive && state.timer.startedAt && (
                    <span style={{ fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: theme.accent, marginLeft: 4 }}>● Live</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
                  {p.client} · ${p.rate}/hr · {fmtHM(total) || "0m"} total
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => {
                  if (state.timer.startedAt) actions.stopTimer();
                  setTimeout(() => actions.startTimer(p.id), 50);
                }} style={btnSmall(theme, true)}>
                  Switch
                </button>
                <button onClick={() => {
                  if (confirm(`Delete "${p.name}" and all its entries?`)) actions.deleteProject(p.id);
                }} style={btnSmall(theme, false)} title="Delete">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 3.5h8M5 5.5v3M7 5.5v3M3 3.5l.5 7h5l.5-7M4.5 3.5v-1h3v1"/></svg>
                </button>
              </div>
            </div>
          </Tile>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HISTORY VIEW
// ═══════════════════════════════════════════════════════════
function HistoryView({ state, actions, theme }) {
  // group entries by day
  const groups = {};
  for (const e of state.entries) {
    const dayKey = startOfDay(new Date(e.start)).getTime();
    (groups[dayKey] = groups[dayKey] || []).push(e);
  }
  const dayKeys = Object.keys(groups).map(Number).sort((a, b) => b - a);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ padding: "0 4px" }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>History</h2>
        <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>
          {state.entries.length} {state.entries.length === 1 ? "entry" : "entries"} logged
        </div>
      </div>

      {dayKeys.length === 0 && (
        <Tile theme={theme} pad="40px 20px">
          <div style={{ textAlign: "center", color: theme.muted, fontSize: 13 }}>
            No entries yet. Start the timer to log your first session.
          </div>
        </Tile>
      )}

      {dayKeys.map((dk) => {
        const entries = groups[dk];
        const dayMs = entries.reduce((sum, e) => sum + entryDuration(e), 0);
        const dayEarn = entries.reduce((sum, e) => {
          const p = state.projects.find((pp) => pp.id === e.projectId);
          return sum + (entryDuration(e) / 3600000) * (p?.rate || 0);
        }, 0);
        return (
          <div key={dk}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 4px 8px" }}>
              <Label color={theme.muted}>{fmtDay(dk)}</Label>
              <span style={{ fontSize: 11, color: theme.muted, fontVariantNumeric: "tabular-nums" }}>
                {fmtHM(dayMs)} · ${dayEarn.toFixed(0)}
              </span>
            </div>
            <Tile theme={theme} pad="0">
              {entries.map((e, i) => {
                const p = state.projects.find((pp) => pp.id === e.projectId);
                return (
                  <div key={e.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px",
                    borderTop: i === 0 ? "none" : `1px solid ${theme.line}`,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: p?.color || theme.muted, flex: "0 0 auto" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p?.name || "Unknown project"}
                      </div>
                      <div style={{ fontSize: 11, color: theme.muted, marginTop: 1 }}>
                        {fmtTime(e.start)} – {fmtTime(e.end)}{e.note ? ` · ${e.note}` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flex: "0 0 auto" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {fmtHM(entryDuration(e))}
                      </div>
                      <div style={{ fontSize: 10.5, color: theme.muted }}>
                        ${((entryDuration(e) / 3600000) * (p?.rate || 0)).toFixed(0)}
                      </div>
                    </div>
                    <button onClick={() => {
                      if (confirm("Delete this entry?")) actions.deleteEntry(e.id);
                    }} style={{
                      width: 26, height: 26, border: "none", background: "transparent",
                      color: theme.muted, cursor: "pointer", borderRadius: 6,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }} title="Delete">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 3l6 6M9 3l-6 6"/></svg>
                    </button>
                  </div>
                );
              })}
            </Tile>
          </div>
        );
      })}
    </div>
  );
}

// ── small UI helpers ──
function Field({ theme, label, value, onChange, type = "text", placeholder, autoFocus }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, color: theme.muted }}>{label}</span>
      <input
        autoFocus={autoFocus}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: theme.stone, border: "none", outline: "none",
          padding: "9px 12px", borderRadius: 8,
          fontSize: 14, color: theme.text, fontFamily: "inherit",
        }}
      />
    </label>
  );
}

function btnPrimary(theme) {
  return {
    flex: 1, height: 36, border: "none", borderRadius: 8,
    background: theme.accent, color: "#fff",
    fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  };
}
function btnGhost(theme) {
  return {
    flex: 1, height: 36, border: `1px solid ${theme.line}`, borderRadius: 8,
    background: "transparent", color: theme.text,
    fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
  };
}
function btnSmall(theme, primary) {
  return {
    height: 30, padding: primary ? "0 12px" : "0 8px",
    border: primary ? "none" : `1px solid ${theme.line}`,
    borderRadius: 8,
    background: primary ? theme.ink : "transparent",
    color: primary ? theme.onInk : theme.muted,
    fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
    display: "flex", alignItems: "center", gap: 4,
  };
}

// ═══════════════════════════════════════════════════════════
// PROJECT PICKER (modal sheet)
// ═══════════════════════════════════════════════════════════
function ProjectPicker({ state, actions, theme, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 100, animation: "tt-fade-in 200ms ease-out",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 460,
        background: theme.bg, color: theme.text,
        borderRadius: "20px 20px 0 0",
        padding: "16px 16px 24px",
        animation: "tt-slide-up 240ms cubic-bezier(0.2, 0.9, 0.3, 1)",
        boxShadow: "0 -10px 40px rgba(0,0,0,0.3)",
      }}>
        <div style={{ width: 36, height: 4, background: theme.line, borderRadius: 2, margin: "0 auto 14px" }} />
        <h3 style={{ margin: "0 4px 12px", fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Switch project</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {state.projects.map((p) => {
            const active = state.timer.projectId === p.id;
            return (
              <button key={p.id} onClick={() => {
                if (state.timer.startedAt) {
                  actions.stopTimer();
                  setTimeout(() => actions.startTimer(p.id), 50);
                } else {
                  actions.setActiveProject(p.id);
                }
                onClose();
              }} style={{
                background: active ? theme.ink : theme.paper,
                color: active ? theme.onInk : theme.text,
                border: "none", borderRadius: 12,
                padding: "14px 16px", textAlign: "left", cursor: "pointer",
                fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{p.client} · ${p.rate}/hr</div>
                </div>
                {active && <span style={{ fontSize: 16 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { NowView, ProjectsView, HistoryView, ProjectPicker, useTheme });
