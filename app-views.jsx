// app-views.jsx — main app UI: Now (timer), Projects, History

const ACCENT = "#E55B13";

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

// ─── Block catalogue (shared by NowView + BlockPanel) ───
const BLOCK_DEFS = [
  { key: "note",         label: "Note",          desc: "What are you working on?" },
  { key: "today",        label: "Today",         desc: "Hours and earnings today" },
  { key: "week",         label: "Week",          desc: "Weekly progress ring" },
  { key: "month",        label: "Month",         desc: "Monthly retainer progress" },
  { key: "weekActivity", label: "Week activity", desc: "Daily bar chart" },
];

// ═══════════════════════════════════════════════════════════
// NOW VIEW — draggable block grid
// ═══════════════════════════════════════════════════════════
function NowView({ state, actions, theme, now, placedBlocks, onUpdateBlocks, editMode, onSwitchProject, onEditWeekBudget }) {
  const running = !!state.timer.startedAt;
  const paused  = !!state.timer.pausedAt;
  const active  = running || paused;
  const project = state.projects.find((p) => p.id === state.timer.projectId) || state.projects[0];
  const elapsed = (state.timer.accumulatedMs || 0) + (running ? now - state.timer.startedAt : 0);
  const sessionAnchor = state.timer.originalStart || state.timer.startedAt || state.timer.pausedAt;

  // Today — scoped to the active project
  const todayStart = startOfDay(new Date()).getTime();
  const todayEntries = state.entries.filter((e) => e.start >= todayStart && e.projectId === project?.id);
  const todayMs = todayEntries.reduce((sum, e) => sum + entryDuration(e), 0) + (active && sessionAnchor >= todayStart ? elapsed : 0);
  const todayHours = todayMs / 3600000;
  const todayEarnings = todayEntries.reduce((sum, e) => {
    return sum + (entryDuration(e) / 3600000) * (project?.rate || 0);
  }, 0) + (active ? (elapsed / 3600000) * (project?.rate || 0) : 0);

  // Week
  const weekStart = startOfWeek(new Date(), state.weekStart || 1).getTime();
  const weekEntries = state.entries.filter((e) => e.start >= weekStart);
  const weekMs = weekEntries.reduce((sum, e) => sum + entryDuration(e), 0) + (active && sessionAnchor >= weekStart ? elapsed : 0);
  const weekHours = weekMs / 3600000;
  const weeklyBudget = state.weeklyBudget || 40;
  const weekPct = weekHours / weeklyBudget;
  const weekColor = weekPct >= 1 ? "#d44" : weekPct >= 0.8 ? "#e8a23a" : theme.accent;

  // Month — project-specific: uses the active project's budgetHours
  const monthStart = (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d.getTime(); })();
  const projectBudget = project?.budgetHours ?? null;
  const projectMonthEntries = state.entries.filter((e) => e.start >= monthStart && e.projectId === project?.id);
  const projectMonthMs = projectMonthEntries.reduce((sum, e) => sum + entryDuration(e), 0)
    + (active && sessionAnchor >= monthStart ? elapsed : 0);
  const projectMonthHours = projectMonthMs / 3600000;
  const projectMonthPct = projectBudget ? projectMonthHours / projectBudget : 0;
  const projectMonthColor = projectMonthPct >= 1 ? "#d44" : projectMonthPct >= 0.8 ? "#e8a23a" : theme.accent;

  // Week activity bars
  const dayBars = Array(7).fill(0);
  for (const e of weekEntries) {
    const dayIdx = Math.floor((startOfDay(new Date(e.start)).getTime() - weekStart) / 86400000);
    if (dayIdx >= 0 && dayIdx < 7) dayBars[dayIdx] += entryDuration(e) / 3600000;
  }
  if (active && sessionAnchor >= weekStart) {
    const dayIdx = Math.floor((startOfDay(new Date(sessionAnchor)).getTime() - weekStart) / 86400000);
    if (dayIdx >= 0 && dayIdx < 7) dayBars[dayIdx] += elapsed / 3600000;
  }
  const todayDayIdx = Math.floor((todayStart - weekStart) / 86400000);
  const earnedNow = active ? Math.round((elapsed / 3600000) * (project?.rate || 0)) : 0;

  // Drag state
  const [draggedKey, setDraggedKey] = React.useState(null);
  const [dragOver,   setDragOver]   = React.useState(null);

  const handleDragStart = (e, key) => {
    setDraggedKey(key);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, key) => {
    e.preventDefault();
    if (draggedKey && draggedKey !== key) setDragOver(key);
  };
  const handleDrop = (e, key) => {
    e.preventDefault();
    if (!draggedKey || draggedKey === key) { setDraggedKey(null); setDragOver(null); return; }
    const next = [...placedBlocks];
    const fi = next.indexOf(draggedKey), ti = next.indexOf(key);
    if (fi < 0 || ti < 0) { setDraggedKey(null); setDragOver(null); return; }
    next.splice(fi, 1);
    next.splice(ti, 0, draggedKey);
    onUpdateBlocks(next);
    setDraggedKey(null);
    setDragOver(null);
  };

  // today + week each span 1 column; everything else full-width
  const getSpan = (key) => (key === "today" || key === "week") ? 1 : 2;

  const pencilIcon = (opacity = "rgba(255,255,255,0.5)") => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke={opacity} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2l2 2-6 6H3V8l6-6z"/>
    </svg>
  );

  const renderContent = (key) => {
    switch (key) {
      case "note":
        return (
          <Tile theme={theme} pad="0">
            <input
              value={state.timer.note}
              onChange={(e) => actions.setNote(e.target.value)}
              placeholder="What are you working on?"
              style={{
                width: "100%", background: "transparent", border: "none",
                outline: "none", fontFamily: "inherit", fontSize: 14,
                color: theme.text, padding: "14px 18px",
              }}
            />
          </Tile>
        );
      case "today":
        return (
          <Tile theme={theme}>
            <Label color={theme.muted}>Today · {project?.name || "—"}</Label>
            <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, fontVariantNumeric: "tabular-nums", marginTop: 12 }}>
              {todayHours.toFixed(1)}<span style={{ fontSize: 18, fontWeight: 500, color: theme.muted, marginLeft: 4 }}>h</span>
            </div>
            <div style={{ fontSize: 11, color: theme.muted, marginTop: 6 }}>
              {todayEntries.length + (running ? 1 : 0)} {(todayEntries.length + (running ? 1 : 0)) === 1 ? "session" : "sessions"} · ${todayEarnings.toFixed(0)}
            </div>
          </Tile>
        );
      case "week":
        return (
          <Tile theme={theme} bg={theme.ink} fg={theme.onInk} onClick={editMode ? null : onEditWeekBudget}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label color="rgba(255,255,255,0.5)">Week</Label>
              {!editMode && pencilIcon()}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <Ring pct={weekPct} accent={weekColor} track="rgba(255,255,255,0.15)" size={58} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {weekHours.toFixed(1)}
                </div>
                <div style={{ fontSize: 10.5, opacity: 0.6, letterSpacing: "0.04em", marginTop: 2 }}>of {weeklyBudget}h</div>
              </div>
            </div>
          </Tile>
        );
      case "month":
        if (projectBudget == null) return (
          <Tile theme={theme} style={{ cursor: "default" }}>
            <Label color={theme.muted}>Month</Label>
            <div style={{ fontSize: 12, color: theme.muted, marginTop: 8, lineHeight: 1.5 }}>
              No budget set for <strong style={{ color: theme.text }}>{project?.name || "this project"}</strong>.
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: theme.accent, fontWeight: 600 }}>
              Add one in Projects →
            </div>
          </Tile>
        );
        return (
          <Tile theme={theme} bg={theme.ink} fg={theme.onInk}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label color="rgba(255,255,255,0.5)">Month · {project?.name}</Label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
              <Ring pct={projectMonthPct} accent={projectMonthColor} track="rgba(255,255,255,0.15)" size={58} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {projectMonthHours.toFixed(1)}
                </div>
                <div style={{ fontSize: 10.5, opacity: 0.6, letterSpacing: "0.04em", marginTop: 2 }}>of {projectBudget}h</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, opacity: 0.5, letterSpacing: "0.04em" }}>remaining</div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 2, color: projectMonthPct >= 1 ? "#d44" : "inherit" }}>
                  {Math.max(0, projectBudget - projectMonthHours).toFixed(1)}h
                </div>
              </div>
            </div>
          </Tile>
        );
      case "weekActivity":
        return (
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
                      width: "100%", height: `${heightPct}%`,
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
        );
      default: return null;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* BIG TIMER TILE — always visible, not removable */}
      <Tile theme={theme} bg={running ? theme.accent : (paused ? theme.stone : theme.ink)} fg={paused ? theme.text : "#fff"} pad="20px 22px">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: paused ? theme.muted : "#fff",
              animation: running ? "tt-pulse 1.4s ease-in-out infinite" : "none",
              opacity: running ? 1 : 0.6,
            }} />
            <span style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600 }}>
              {running ? "Live" : paused ? "Paused" : "Idle"}
            </span>
          </div>
          <button onClick={onSwitchProject} style={{
            border: `1px solid ${paused ? theme.line : "rgba(255,255,255,0.25)"}`,
            background: "transparent", color: paused ? theme.text : "#fff",
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
        <div style={{ fontSize: 13, opacity: paused ? 0.75 : 0.9, fontWeight: 500 }}>
          {project?.client || "—"} · ${project?.rate || 0}/hr · ${earnedNow.toFixed(2)} earned
        </div>
      </Tile>

      {/* Draggable blocks grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {placedBlocks.map((key) => {
          const content = renderContent(key);
          if (!content) return null;
          return (
            <div
              key={key}
              draggable
              onDragStart={(e) => handleDragStart(e, key)}
              onDragOver={(e) => handleDragOver(e, key)}
              onDrop={(e) => handleDrop(e, key)}
              onDragEnd={() => { setDraggedKey(null); setDragOver(null); }}
              style={{
                gridColumn: `span ${getSpan(key)}`,
                position: "relative",
                opacity: draggedKey === key ? 0.4 : 1,
                transition: "opacity 0.15s",
                borderRadius: 14,
                outline: dragOver === key ? `2px dashed ${theme.accent}` : "2px solid transparent",
                outlineOffset: 2,
                cursor: editMode ? "grab" : "default",
              }}
            >
              {content}
              {editMode && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUpdateBlocks(placedBlocks.filter((k) => k !== key)); }}
                  style={{
                    position: "absolute", top: -8, right: -8, zIndex: 10,
                    width: 22, height: 22, borderRadius: "50%",
                    background: "#222", border: "2px solid #fff",
                    color: "#fff", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, lineHeight: 1, fontWeight: 700, padding: 0,
                    fontFamily: "inherit",
                  }}
                >×</button>
              )}
            </div>
          );
        })}
      </div>

      {/* START / PAUSE / RESUME / STOP */}
      {!active && (
        <button onClick={() => actions.startTimer(state.timer.projectId, state.timer.note)}
          style={primaryBtn(theme.accent, "#fff")}>
          <span style={{ width: 0, height: 0, borderLeft: "11px solid #fff", borderTop: "7px solid transparent", borderBottom: "7px solid transparent", marginLeft: 3 }} />
          Start timer
        </button>
      )}
      {active && (
        <div style={{ display: "flex", gap: 10 }}>
          {running ? (
            <button onClick={actions.pauseTimer} style={{ ...primaryBtn(theme.ink, theme.onInk), flex: 1 }}>
              <span style={{ display: "flex", gap: 3 }}>
                <span style={{ width: 4, height: 12, background: theme.onInk }} />
                <span style={{ width: 4, height: 12, background: theme.onInk }} />
              </span>
              Pause
            </button>
          ) : (
            <button onClick={actions.resumeTimer} style={{ ...primaryBtn(theme.accent, "#fff"), flex: 1 }}>
              <span style={{ width: 0, height: 0, borderLeft: "10px solid #fff", borderTop: "6px solid transparent", borderBottom: "6px solid transparent", marginLeft: 2 }} />
              Resume
            </button>
          )}
          <button onClick={actions.stopTimer} style={{ ...primaryBtn(paused ? theme.ink : "transparent", paused ? theme.onInk : theme.text), flex: 1, border: paused ? "none" : `1px solid ${theme.line}` }}>
            <span style={{ width: 11, height: 11, background: paused ? theme.onInk : theme.text, display: "inline-block" }} />
            Stop & save
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PROJECTS VIEW
// ═══════════════════════════════════════════════════════════
function ProjectsView({ state, actions, theme }) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ name: "", client: "", rate: state.defaultRate, budgetHours: "" });
  const [editingId, setEditingId] = React.useState(null);
  const [editDraft, setEditDraft] = React.useState({});

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditDraft({ name: p.name, client: p.client || "", rate: p.rate || 0, budgetHours: p.budgetHours != null ? String(p.budgetHours) : "" });
  };
  const saveEdit = (id) => {
    if (!editDraft.name.trim()) return;
    actions.updateProject(id, {
      name: editDraft.name.trim(),
      client: editDraft.client,
      rate: parseFloat(editDraft.rate) || 0,
      budgetHours: editDraft.budgetHours !== "" ? parseFloat(editDraft.budgetHours) : null,
    });
    setEditingId(null);
  };

  const totals = {};
  for (const e of state.entries) {
    totals[e.projectId] = (totals[e.projectId] || 0) + entryDuration(e);
  }
  const totalEarned = state.projects.reduce((sum, p) => sum + ((totals[p.id] || 0) / 3600000) * p.rate, 0);
  const totalMs     = Object.values(totals).reduce((a, b) => a + b, 0);

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

      {/* Earnings summary */}
      <Tile theme={theme} bg={theme.ink} fg={theme.onInk} pad="18px 20px">
        <Label color="rgba(255,255,255,0.45)">Total earned</Label>
        <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>
          ${totalEarned.toFixed(0)}
        </div>
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 6 }}>
          {fmtHM(totalMs) || "0m"} · {state.projects.length} {state.projects.length === 1 ? "project" : "projects"}
        </div>
      </Tile>

      {adding && (
        <Tile theme={theme}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field theme={theme} label="Project name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="Atlas Identity" autoFocus />
            <Field theme={theme} label="Client" value={draft.client} onChange={(v) => setDraft({ ...draft, client: v })} placeholder="Northwind Studio" />
            <Field theme={theme} label="Rate ($/hr)" type="number" value={draft.rate} onChange={(v) => setDraft({ ...draft, rate: parseFloat(v) || 0 })} />
            <Field theme={theme} label="Hour budget (optional)" type="number" value={draft.budgetHours} onChange={(v) => setDraft({ ...draft, budgetHours: v })} placeholder="e.g. 20" />
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => { setAdding(false); setDraft({ name: "", client: "", rate: state.defaultRate, budgetHours: "" }); }} style={btnGhost(theme)}>Cancel</button>
              <button onClick={() => {
                if (!draft.name.trim()) return;
                actions.addProject({ ...draft, budgetHours: draft.budgetHours !== "" ? parseFloat(draft.budgetHours) : null });
                setAdding(false);
                setDraft({ name: "", client: "", rate: state.defaultRate, budgetHours: "" });
              }} style={btnPrimary(theme)}>Add project</button>
            </div>
          </div>
        </Tile>
      )}

      {state.projects.map((p) => {
        const total = totals[p.id] || 0;
        const isActive = state.timer.projectId === p.id;
        const isEditing = editingId === p.id;

        if (isEditing) return (
          <Tile key={p.id} theme={theme}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Field theme={theme} label="Project name" value={editDraft.name} onChange={(v) => setEditDraft({ ...editDraft, name: v })} autoFocus />
              <Field theme={theme} label="Client" value={editDraft.client} onChange={(v) => setEditDraft({ ...editDraft, client: v })} />
              <Field theme={theme} label="Rate ($/hr)" type="number" value={editDraft.rate} onChange={(v) => setEditDraft({ ...editDraft, rate: v })} />
              <Field theme={theme} label="Hour budget (optional)" type="number" value={editDraft.budgetHours} onChange={(v) => setEditDraft({ ...editDraft, budgetHours: v })} placeholder="e.g. 20" />
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={() => setEditingId(null)} style={btnGhost(theme)}>Cancel</button>
                <button onClick={() => saveEdit(p.id)} style={btnPrimary(theme)}>Save</button>
              </div>
            </div>
          </Tile>
        );

        const earned = (total / 3600000) * p.rate;
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
                  {p.client} · ${p.rate}/hr · {fmtHM(total) || "0m"} · <span style={{ color: theme.text, fontWeight: 500 }}>${earned.toFixed(0)} earned</span>
                </div>
                {p.budgetHours != null && (() => {
                  const usedH = total / 3600000;
                  const pct = Math.min(1, usedH / p.budgetHours);
                  const over = usedH > p.budgetHours;
                  const barColor = over ? "#d44" : pct >= 0.8 ? "#e8a23a" : theme.accent;
                  return (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: theme.muted, marginBottom: 4 }}>
                        <span>Budget</span>
                        <span style={{ color: over ? "#d44" : theme.muted, fontVariantNumeric: "tabular-nums" }}>
                          {usedH.toFixed(1)} / {p.budgetHours}h
                        </span>
                      </div>
                      <div style={{ height: 4, background: theme.line, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${pct * 100}%`, height: "100%", background: barColor, borderRadius: 2, transition: "width 0.3s" }} />
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => {
                  if (state.timer.startedAt) actions.stopTimer();
                  setTimeout(() => actions.startTimer(p.id), 50);
                }} style={btnSmall(theme, true)}>
                  Switch
                </button>
                <button onClick={() => startEdit(p)} style={btnSmall(theme, false)} title="Edit">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 1.5l2 2-6 6H2.5v-2l6-6z"/></svg>
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
  const todayStr = new Date().toISOString().slice(0, 10);
  const [addingManual, setAddingManual] = React.useState(false);
  const [manual, setManual] = React.useState({
    projectId: state.projects[0]?.id || "",
    date: todayStr,
    start: "",
    end: "",
    note: "",
  });

  const submitManual = () => {
    if (!manual.projectId || !manual.date || !manual.start || !manual.end) return;
    const startMs = new Date(`${manual.date}T${manual.start}`).getTime();
    const endMs   = new Date(`${manual.date}T${manual.end}`).getTime();
    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return;
    actions.addManualEntry({ projectId: manual.projectId, start: startMs, end: endMs, note: manual.note });
    setAddingManual(false);
    setManual({ projectId: manual.projectId, date: todayStr, start: "", end: "", note: "" });
  };

  const [editingEntryId, setEditingEntryId] = React.useState(null);
  const [editEntry, setEditEntry] = React.useState({});

  const startEditEntry = (e) => {
    const d = new Date(e.start);
    const pad = (n) => n < 10 ? "0" + n : "" + n;
    setEditingEntryId(e.id);
    setEditEntry({
      date:      `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
      startTime: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      endTime:   (() => { const ed = new Date(e.end); return `${pad(ed.getHours())}:${pad(ed.getMinutes())}`; })(),
      note:      e.note || "",
    });
  };
  const saveEditEntry = (id) => {
    const startMs = new Date(`${editEntry.date}T${editEntry.startTime}`).getTime();
    const endMs   = new Date(`${editEntry.date}T${editEntry.endTime}`).getTime();
    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return;
    actions.updateEntry(id, { start: startMs, end: endMs, note: editEntry.note });
    setEditingEntryId(null);
  };

  const groups = {};
  for (const e of state.entries) {
    const dayKey = startOfDay(new Date(e.start)).getTime();
    (groups[dayKey] = groups[dayKey] || []).push(e);
  }
  const dayKeys = Object.keys(groups).map(Number).sort((a, b) => b - a);

  const inputStyle = (t) => ({
    background: t.stone, border: "none", outline: "none",
    padding: "9px 12px", borderRadius: 8,
    fontSize: 14, color: t.text, fontFamily: "inherit", width: "100%",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 4px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>History</h2>
          <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>
            {state.entries.length} {state.entries.length === 1 ? "entry" : "entries"} logged
          </div>
        </div>
        <button onClick={() => setAddingManual((v) => !v)} style={{
          border: `1px solid ${theme.line}`, background: addingManual ? theme.ink : "transparent",
          color: addingManual ? theme.onInk : theme.text,
          padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500,
          cursor: "pointer", fontFamily: "inherit",
        }}>+ Log time</button>
      </div>

      {addingManual && (
        <Tile theme={theme}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Log time manually</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Project */}
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, color: theme.muted }}>Project</span>
              <select
                value={manual.projectId}
                onChange={(e) => setManual({ ...manual, projectId: e.target.value })}
                style={{ ...inputStyle(theme), appearance: "none" }}
              >
                {state.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            {/* Date */}
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, color: theme.muted }}>Date</span>
              <input type="date" value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} style={inputStyle(theme)} />
            </label>
            {/* Start / End */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, color: theme.muted }}>From</span>
                <input type="time" value={manual.start} onChange={(e) => setManual({ ...manual, start: e.target.value })} style={inputStyle(theme)} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, color: theme.muted }}>To</span>
                <input type="time" value={manual.end} onChange={(e) => setManual({ ...manual, end: e.target.value })} style={inputStyle(theme)} />
              </label>
            </div>
            {/* Note */}
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, color: theme.muted }}>Note (optional)</span>
              <input type="text" value={manual.note} placeholder="What did you work on?" onChange={(e) => setManual({ ...manual, note: e.target.value })} style={inputStyle(theme)} />
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => setAddingManual(false)} style={btnGhost(theme)}>Cancel</button>
              <button onClick={submitManual} style={btnPrimary(theme)}>Save entry</button>
            </div>
          </div>
        </Tile>
      )}

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
                const isEditingThis = editingEntryId === e.id;
                const borderTop = i === 0 ? "none" : `1px solid ${theme.line}`;

                if (isEditingThis) return (
                  <div key={e.id} style={{ padding: "14px 16px", borderTop }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: p?.color || theme.muted, flex: "0 0 auto" }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{p?.name || "Unknown project"}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: theme.muted }}>Date</span>
                          <input type="date" value={editEntry.date} onChange={(ev) => setEditEntry({ ...editEntry, date: ev.target.value })} style={inputStyle(theme)} />
                        </label>
                        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: theme.muted }}>From</span>
                          <input type="time" value={editEntry.startTime} onChange={(ev) => setEditEntry({ ...editEntry, startTime: ev.target.value })} style={inputStyle(theme)} />
                        </label>
                        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: theme.muted }}>To</span>
                          <input type="time" value={editEntry.endTime} onChange={(ev) => setEditEntry({ ...editEntry, endTime: ev.target.value })} style={inputStyle(theme)} />
                        </label>
                      </div>
                      <input type="text" value={editEntry.note} placeholder="Note (optional)" onChange={(ev) => setEditEntry({ ...editEntry, note: ev.target.value })} style={inputStyle(theme)} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setEditingEntryId(null)} style={btnGhost(theme)}>Cancel</button>
                        <button onClick={() => saveEditEntry(e.id)} style={btnPrimary(theme)}>Save</button>
                      </div>
                    </div>
                  </div>
                );

                return (
                  <div key={e.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", borderTop,
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
                    <button onClick={() => startEditEntry(e)} style={{
                      width: 26, height: 26, border: "none", background: "transparent",
                      color: theme.muted, cursor: "pointer", borderRadius: 6,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }} title="Edit">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 1.5l2 2-6 6H2.5v-2l6-6z"/></svg>
                    </button>
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

function primaryBtn(bg, fg) {
  return {
    width: "100%", height: 52, border: "none", borderRadius: 14,
    background: bg, color: fg,
    fontSize: 14, fontWeight: 600, letterSpacing: "0.02em",
    cursor: "pointer", fontFamily: "inherit",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
  };
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

// ═══════════════════════════════════════════════════════════
// BUDGET EDITOR (weekly + monthly targets sheet)
// ═══════════════════════════════════════════════════════════
function BudgetEditor({ state, actions, theme, onClose }) {
  const [weekVal,  setWeekVal]  = React.useState(String(state.weeklyBudget || 40));
  const [monthVal, setMonthVal] = React.useState(state.monthlyBudget != null ? String(state.monthlyBudget) : "");
  const weekPresets  = [20, 30, 40, 50, 60];
  const monthPresets = [40, 60, 80, 100, 160];

  const save = () => {
    actions.setWeeklyBudget(parseFloat(weekVal) || 0);
    actions.setMonthlyBudget(monthVal.trim() !== "" ? parseFloat(monthVal) : null);
    onClose();
  };

  const bigInput = (value, onChange, unit) => (
    <Tile theme={theme} pad="16px 20px">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6 }}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); }}
          placeholder="—"
          style={{
            background: "transparent", border: "none", outline: "none",
            fontSize: 56, fontWeight: 700, letterSpacing: "-0.04em",
            fontVariantNumeric: "tabular-nums", color: theme.text,
            width: 130, textAlign: "right", fontFamily: "inherit",
          }}
        />
        <span style={{ fontSize: 18, color: theme.muted, fontWeight: 500 }}>{unit}</span>
      </div>
    </Tile>
  );

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
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ width: 36, height: 4, background: theme.line, borderRadius: 2, margin: "0 auto 16px" }} />

        <h3 style={{ margin: "0 4px 2px", fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>Weekly target</h3>
        <p style={{ margin: "0 4px 10px", fontSize: 12, color: theme.muted }}>Hours you aim to work per week.</p>
        {bigInput(weekVal, setWeekVal, "h / week")}
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {weekPresets.map((p) => (
            <button key={p} onClick={() => setWeekVal(String(p))} style={{
              flex: 1, minWidth: 52, height: 34,
              border: `1px solid ${theme.line}`,
              background: String(p) === weekVal ? theme.ink : "transparent",
              color: String(p) === weekVal ? theme.onInk : theme.text,
              borderRadius: 8, fontSize: 13, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}>{p}h</button>
          ))}
        </div>

        <div style={{ height: 1, background: theme.line, margin: "20px 0" }} />

        <h3 style={{ margin: "0 4px 2px", fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>Monthly target</h3>
        <p style={{ margin: "0 4px 10px", fontSize: 12, color: theme.muted }}>For retainers or monthly billing. Leave blank to hide.</p>
        {bigInput(monthVal, setMonthVal, "h / month")}
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {monthPresets.map((p) => (
            <button key={p} onClick={() => setMonthVal(String(p) === monthVal ? "" : String(p))} style={{
              flex: 1, minWidth: 52, height: 34,
              border: `1px solid ${theme.line}`,
              background: String(p) === monthVal ? theme.ink : "transparent",
              color: String(p) === monthVal ? theme.onInk : theme.text,
              borderRadius: 8, fontSize: 13, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}>{p}h</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={btnGhost(theme)}>Cancel</button>
          <button onClick={save} style={btnPrimary(theme)}>Save targets</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BLOCK PANEL — slides in from the left
// ═══════════════════════════════════════════════════════════
function BlockPanel({ placedBlocks, onUpdateBlocks, theme, onClose }) {
  const available = BLOCK_DEFS.filter((d) => !placedBlocks.includes(d.key));
  const placed    = BLOCK_DEFS.filter((d) =>  placedBlocks.includes(d.key));

  const addBlock    = (key) => { if (!placedBlocks.includes(key)) onUpdateBlocks([...placedBlocks, key]); };
  const removeBlock = (key) => onUpdateBlocks(placedBlocks.filter((k) => k !== key));

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 }}>
      {/* dim overlay */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.35)",
          animation: "tt-fade-in 200ms ease-out",
        }}
      />

      {/* panel */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0,
        width: 260, background: theme.paper, color: theme.text,
        boxShadow: "4px 0 24px rgba(0,0,0,0.2)",
        animation: "tt-slide-in-left 240ms cubic-bezier(0.2, 0.9, 0.3, 1)",
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        {/* header */}
        <div style={{ padding: "20px 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>Blocks</div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: "50%",
            background: theme.stone, border: "none",
            color: theme.text, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontFamily: "inherit",
          }}>×</button>
        </div>

        <div style={{ padding: "0 12px", flex: 1 }}>
          {/* Available blocks */}
          {available.length > 0 && (
            <>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: theme.muted, padding: "4px 4px 8px" }}>
                Add to canvas
              </div>
              {available.map((d) => (
                <div key={d.key} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", borderRadius: 10,
                  background: theme.stone, marginBottom: 6,
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{d.label}</div>
                    <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>{d.desc}</div>
                  </div>
                  <button onClick={() => addBlock(d.key)} style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0, marginLeft: 8,
                    background: theme.accent, border: "none",
                    color: "#fff", cursor: "pointer", fontSize: 18,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "inherit",
                  }}>+</button>
                </div>
              ))}
            </>
          )}
          {available.length === 0 && (
            <div style={{ fontSize: 12, color: theme.muted, padding: "4px 4px 12px", lineHeight: 1.5 }}>
              All blocks are on the canvas.
            </div>
          )}

          {/* Placed blocks */}
          {placed.length > 0 && (
            <div style={{ borderTop: `1px solid ${theme.line}`, marginTop: available.length ? 12 : 0, paddingTop: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, color: theme.muted, padding: "0 4px 8px" }}>
                On canvas
              </div>
              {placed.map((d) => (
                <div key={d.key} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", borderRadius: 10,
                  border: `1px solid ${theme.line}`, marginBottom: 6,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: theme.muted }}>{d.label}</div>
                  <button onClick={() => removeBlock(d.key)} style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0, marginLeft: 8,
                    background: theme.line, border: "none",
                    color: theme.muted, cursor: "pointer", fontSize: 14,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "inherit",
                  }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 16px 28px", flexShrink: 0 }}>
          <button onClick={onClose} style={{ ...btnPrimary(theme), width: "100%", height: 44 }}>Done</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { NowView, ProjectsView, HistoryView, ProjectPicker, BudgetEditor, BlockPanel, useTheme });
