// app-store.jsx — Supabase-backed state for the time tracker
// Same useStore() API as before, but reads/writes to Supabase tables.
// Falls back to a local "running timer" cache for offline resilience.

const SUPABASE_URL = "https://avzpextxenxbhahfeqvy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2enBleHR4ZW54YmhhaGZlcXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDMzOTksImV4cCI6MjA5Mjg3OTM5OX0.0PNYB8PsSeoBxIx0z98BoJP0SdKmthkkglvvP98Nehw";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// running timer is kept in localStorage so it survives reloads
const RUNNING_KEY = "tt_running_v1";
function loadRunning() {
  try { return JSON.parse(localStorage.getItem(RUNNING_KEY) || "null"); }
  catch { return null; }
}
function saveRunning(r) {
  if (r) localStorage.setItem(RUNNING_KEY, JSON.stringify(r));
  else localStorage.removeItem(RUNNING_KEY);
}

// ── Auth hook ──
function useAuth() {
  const [session, setSession] = React.useState(undefined); // undefined=loading, null=signed out

  React.useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return {
    session,
    user: session?.user || null,
    signInWithEmail: (email) => sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    }),
    signOut: () => sb.auth.signOut(),
  };
}

// ── Main store hook ──
function useStore(user) {
  const [projects, setProjects] = React.useState([]);
  const [entries, setEntries] = React.useState([]);
  const [timer, setTimer] = React.useState(loadRunning() || { projectId: null, startedAt: null, originalStart: null, accumulatedMs: 0, pausedAt: null, note: "" });
  const [weeklyBudget, setWeeklyBudgetState] = React.useState(() => {
    const v = parseFloat(localStorage.getItem("tt_weekly_budget"));
    return isNaN(v) ? 40 : v;
  });
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(null);

  // Load projects + entries
  const refresh = React.useCallback(async () => {
    if (!user) return;
    const [{ data: pData, error: pErr }, { data: eData, error: eErr }] = await Promise.all([
      sb.from("projects").select("*").order("created_at", { ascending: true }),
      sb.from("entries").select("*").order("start_at", { ascending: false }).limit(500),
    ]);
    if (pErr) { setError(pErr.message); return; }
    if (eErr) { setError(eErr.message); return; }
    setProjects((pData || []).map(p => ({
      id: p.id, name: p.name, client: p.client || "", rate: parseFloat(p.rate) || 0, color: p.color || "#1a1a1a",
      budgetHours: p.budget_hours != null ? parseFloat(p.budget_hours) : null,
    })));
    setEntries((eData || []).map(e => ({
      id: e.id, projectId: e.project_id,
      start: new Date(e.start_at).getTime(),
      end: e.end_at ? new Date(e.end_at).getTime() : null,
      note: e.note || "",
    })));
    setLoaded(true);
  }, [user]);

  React.useEffect(() => {
    if (!user) { setLoaded(false); return; }
    refresh();
  }, [user, refresh]);

  // Persist running timer locally
  React.useEffect(() => { saveRunning(timer); }, [timer]);

  // Seed projects on first sign-in if user has none
  React.useEffect(() => {
    if (!user || !loaded) return;
    if (projects.length > 0) return;
    (async () => {
      const seed = [
        { user_id: user.id, name: "Atlas Identity", client: "Northwind Studio", rate: 85, color: "#E55B13" },
        { user_id: user.id, name: "Helix Web", client: "Helix Labs", rate: 85, color: "#1a1a1a" },
      ];
      await sb.from("projects").insert(seed);
      refresh();
    })();
  }, [user, loaded, projects.length, refresh]);

  // Default project for the timer once projects load
  React.useEffect(() => {
    if (projects.length && !timer.projectId) {
      setTimer((t) => ({ ...t, projectId: projects[0].id }));
    }
  }, [projects, timer.projectId]);

  const actions = React.useMemo(() => ({
    startTimer: (projectId, note = "") => {
      const now = Date.now();
      setTimer({ projectId: projectId || (projects[0] && projects[0].id), startedAt: now, originalStart: now, accumulatedMs: 0, pausedAt: null, note });
    },
    pauseTimer: () => {
      setTimer((t) => {
        if (!t.startedAt || t.pausedAt) return t;
        const now = Date.now();
        return { ...t, accumulatedMs: (t.accumulatedMs || 0) + (now - t.startedAt), startedAt: null, pausedAt: now };
      });
    },
    resumeTimer: () => {
      setTimer((t) => {
        if (!t.pausedAt) return t;
        return { ...t, startedAt: Date.now(), pausedAt: null };
      });
    },
    stopTimer: async () => {
      const isRunning = !!timer.startedAt;
      const isPaused = !!timer.pausedAt;
      if ((!isRunning && !isPaused) || !user || !timer.projectId) {
        setTimer({ projectId: timer.projectId, startedAt: null, originalStart: null, accumulatedMs: 0, pausedAt: null, note: "" });
        return;
      }
      const now = Date.now();
      const totalMs = (timer.accumulatedMs || 0) + (isRunning ? (now - timer.startedAt) : 0);
      const startMs = timer.originalStart || timer.startedAt || (now - totalMs);
      const endMs = startMs + totalMs; // collapse pauses → contiguous entry
      const projectId = timer.projectId;
      const note = timer.note;
      setTimer({ projectId, startedAt: null, originalStart: null, accumulatedMs: 0, pausedAt: null, note: "" });
      if (totalMs < 1000) return; // discard < 1s sessions
      const { data, error } = await sb.from("entries").insert({
        user_id: user.id,
        project_id: projectId,
        start_at: new Date(startMs).toISOString(),
        end_at: new Date(endMs).toISOString(),
        note,
      }).select().single();
      if (error) { setError(error.message); return; }
      setEntries((es) => [{
        id: data.id, projectId: data.project_id,
        start: new Date(data.start_at).getTime(),
        end: new Date(data.end_at).getTime(),
        note: data.note || "",
      }, ...es]);
    },
    setActiveProject: (projectId) => setTimer((t) => ({ ...t, projectId })),
    setNote: (note) => setTimer((t) => ({ ...t, note })),
    deleteEntry: async (id) => {
      setEntries((es) => es.filter((e) => e.id !== id)); // optimistic
      const { error } = await sb.from("entries").delete().eq("id", id);
      if (error) { setError(error.message); refresh(); }
    },
    addProject: async (proj) => {
      const { data, error } = await sb.from("projects").insert({
        user_id: user.id,
        name: proj.name,
        client: proj.client || "",
        rate: proj.rate || 0,
        color: proj.color || "#1a1a1a",
        budget_hours: proj.budgetHours ?? null,
      }).select().single();
      if (error) { setError(error.message); return; }
      setProjects((ps) => [...ps, {
        id: data.id, name: data.name, client: data.client || "", rate: parseFloat(data.rate) || 0, color: data.color,
        budgetHours: data.budget_hours != null ? parseFloat(data.budget_hours) : null,
      }]);
    },
    updateProject: async (id, patch) => {
      setProjects((ps) => ps.map((p) => p.id === id ? { ...p, ...patch } : p)); // optimistic
      const dbPatch = {};
      if ("name"   in patch) dbPatch.name   = patch.name;
      if ("client" in patch) dbPatch.client = patch.client;
      if ("rate"   in patch) dbPatch.rate   = patch.rate;
      if ("color"  in patch) dbPatch.color  = patch.color;
      if ("budgetHours" in patch) dbPatch.budget_hours = patch.budgetHours;
      const { error } = await sb.from("projects").update(dbPatch).eq("id", id);
      if (error) { setError(error.message); refresh(); }
    },
    deleteProject: async (id) => {
      setProjects((ps) => ps.filter((p) => p.id !== id));
      setEntries((es) => es.filter((e) => e.projectId !== id));
      if (timer.projectId === id) setTimer((t) => ({ ...t, projectId: null, startedAt: null }));
      const { error } = await sb.from("projects").delete().eq("id", id);
      if (error) { setError(error.message); refresh(); }
    },
    addManualEntry: async ({ projectId, start, end, note }) => {
      const { data, error } = await sb.from("entries").insert({
        user_id: user.id, project_id: projectId,
        start_at: new Date(start).toISOString(),
        end_at: new Date(end).toISOString(),
        note: note || "",
      }).select().single();
      if (error) { setError(error.message); return; }
      setEntries((es) => [{
        id: data.id, projectId: data.project_id,
        start: new Date(data.start_at).getTime(),
        end: new Date(data.end_at).getTime(),
        note: data.note || "",
      }, ...es]);
    },
    refresh,
    clearError: () => setError(null),
    setWeeklyBudget: (h) => {
      const v = parseFloat(h) || 0;
      setWeeklyBudgetState(v);
      try { localStorage.setItem("tt_weekly_budget", String(v)); } catch {}
    },
  }), [user, projects, timer, refresh]);

  const state = { projects, entries, timer, weekStart: 1, defaultRate: 85, weeklyBudget, loaded, error };
  return [state, actions];
}

// ── helpers (unchanged) ──
function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function startOfWeek(d, weekStart = 1) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = (day - weekStart + 7) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}
function fmtHMS(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => n < 10 ? "0" + n : "" + n;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}
function fmtHM(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
function fmtTime(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function fmtDay(ms) {
  const d = new Date(ms);
  const today = startOfDay(new Date()).getTime();
  const dayMs = startOfDay(d).getTime();
  if (dayMs === today) return "Today";
  if (dayMs === today - 86400000) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}
function entryDuration(e) { return (e.end || Date.now()) - e.start; }

Object.assign(window, {
  useStore, useAuth, sb,
  fmtHMS, fmtHM, fmtTime, fmtDay,
  startOfDay, startOfWeek, entryDuration,
});
