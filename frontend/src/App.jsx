import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
const emptyForms = {
  project: { name: "", description: "", status: "active", progress: 0, deadline: "" },
  subject: { name: "", description: "" },
  note: { title: "", content: "", subject: "" },
  task: { title: "", description: "", status: "todo", priority: "medium", due_date: "", project: "", subject: "" },
  session: { title: "Study session", started_at: new Date().toISOString().slice(0, 16), duration_minutes: 25, reflection: "", project: "", subject: "" },
};

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(localStorage.getItem("username") || "");
  const [authMode, setAuthMode] = useState("login");
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState({ projects: [], subjects: [], notes: [], tasks: [], sessions: [] });
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [auth, setAuth] = useState({ username: "", password: "" });
  const [activeSession, setActiveSession] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);

  useEffect(() => {
    if (token) loadData();
  // API helpers intentionally use the current token.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (token && search.trim()) {
        api(`/search/?q=${encodeURIComponent(search.trim())}`).then((result) => setSearchResults(result.results || [])).catch(() => {});
      } else setSearchResults([]);
    }, 250);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, token]);

  async function api(path, options = {}) {
    const response = await fetch(API_URL + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Token ${token}` } : {}), ...(options.headers || {}) },
    });
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.detail || body?.error || "Something went wrong.");
    return body;
  }
  async function loadData() {
    setLoading(true);
    try {
      const [projects, subjects, notes, tasks, sessions, dashboard] = await Promise.all(
        ["/projects/", "/subjects/", "/notes/", "/tasks/", "/study-sessions/", "/dashboard/stats/"].map(api),
      );
      setData({ projects, subjects, notes, tasks, sessions });
      setStats(dashboard || {});
      setActiveSession(sessions.find((session) => session.is_active) || null);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }
  async function submitAuth(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await api(authMode === "login" ? "/login/" : "/register/", { method: "POST", body: JSON.stringify(auth) });
      localStorage.setItem("token", result.token);
      localStorage.setItem("username", result.username);
      setToken(result.token);
      setUser(result.username);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }
  function logout() {
    localStorage.clear();
    setToken(null);
    setUser("");
    setData({ projects: [], subjects: [], notes: [], tasks: [], sessions: [] });
  }
  function openModal(type, item = null) {
    setModal(type);
    setEditingId(item?.id || null);
    setForm(item ? { ...emptyForms[type], ...item, subject: item.subject?.id || item.subject || "", project: item.project?.id || item.project || "" } : { ...emptyForms[type] });
  }
  function closeModal() {
    setModal(null);
    setEditingId(null);
  }
  function updateField(event) {
    setForm((old) => ({ ...old, [event.target.name]: event.target.value }));
  }
  async function saveModal(event) {
    event.preventDefault();
    setLoading(true);
    const endpoints = { project: "projects", subject: "subjects", note: "notes", task: "tasks", session: "study-sessions" };
    try {
      const payload = { ...form };
      ["progress", "duration_minutes", "subject", "project"].forEach((key) => {
        if (payload[key] === "") delete payload[key];
      });
      if (payload.progress !== undefined) payload.progress = Number(payload.progress);
      if (payload.duration_minutes !== undefined) payload.duration_minutes = Number(payload.duration_minutes);
      const result = await api(`/${endpoints[modal]}/${editingId ? `${editingId}/` : ""}`, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      const key = modal === "session" ? "sessions" : `${modal}s`;
      setData((old) => ({ ...old, [key]: editingId ? old[key].map((item) => (item.id === editingId ? result : item)) : [result, ...old[key]] }));
      closeModal();
      loadData();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }
  async function remove(type, id) {
    if (!window.confirm("Delete this item?")) return;
    const endpoint = type === "session" ? "study-sessions" : `${type}s`;
    try {
      await api(`/${endpoint}/${id}/`, { method: "DELETE" });
      setData((old) => ({ ...old, [type === "session" ? "sessions" : `${type}s`]: old[type === "session" ? "sessions" : `${type}s`].filter((item) => item.id !== id) }));
    } catch (error) {
      setNotice(error.message);
    }
  }
  async function startTimer() {
    try {
      const session = await api("/study-sessions/start/", { method: "POST", body: JSON.stringify({ title: "Live focus session" }) });
      setActiveSession(session);
      setData((old) => ({ ...old, sessions: [session, ...old.sessions.filter((item) => item.id !== session.id)] }));
    } catch (error) {
      setNotice(error.message);
    }
  }
  async function stopTimer() {
    if (!activeSession) return;
    try {
      const session = await api(`/study-sessions/${activeSession.id}/stop/`, { method: "POST" });
      setActiveSession(null);
      setData((old) => ({ ...old, sessions: old.sessions.map((item) => (item.id === session.id ? session : item)) }));
      loadData();
    } catch (error) {
      setNotice(error.message);
    }
  }
  function selectSearch(result) {
    setPage(result.type === "project" ? "projects" : result.type === "subject" ? "subjects" : result.type === "task" ? "tasks" : "notes");
    if (result.type === "note") setSelectedNoteId(result.id);
    setSearch("");
    setSearchResults([]);
  }

  if (!token) return <AuthScreen mode={authMode} setMode={setAuthMode} auth={auth} setAuth={setAuth} onSubmit={submitAuth} notice={notice} loading={loading} />;
  const nav = [
    ["dashboard", "Overview", "⌂"], ["projects", "Projects", "◈"], ["subjects", "Subjects", "◌"],
    ["notes", "Notes", "▤"], ["tasks", "Tasks", "✓"], ["sessions", "Study sessions", "◷"],
    ["assistant", "AI assistant", "✦"], ["settings", "Settings", "⚙"],
  ];
  const title = nav.find((item) => item[0] === page)?.[1] || "Overview";
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">O</div><div><strong>OpenStudy</strong><small>AI LEARNING OS</small></div></div>
      <nav><span className="nav-caption">WORKSPACE</span>{nav.map(([id, label, icon]) => <button className={page === id ? "nav-item active" : "nav-item"} key={id} onClick={() => setPage(id)}><i>{icon}</i>{label}{id === "tasks" && data.tasks.some((item) => item.status !== "done") && <b>{data.tasks.filter((item) => item.status !== "done").length}</b>}</button>)}</nav>
      <div className="sidebar-foot"><div className="user-chip"><span>{user[0]?.toUpperCase() || "U"}</span><div><strong>{user}</strong><small>Personal workspace</small></div></div><button className="signout" onClick={logout}>↪ Sign out</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="eyebrow">WORKSPACE / {title.toUpperCase()}</span><h1>{title}</h1></div><div className="top-actions"><div className="global-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search workspace..." onKeyDown={(event) => event.key === "Escape" && setSearch("")} />{searchResults.length > 0 && <div className="search-results">{searchResults.map((result) => <button key={`${result.type}-${result.id}`} onClick={() => selectSearch(result)}><small>{result.type}</small><strong>{result.title}</strong><span>{result.snippet}</span></button>)}</div>}</div>{["projects", "subjects", "notes", "tasks", "sessions"].includes(page) && <button className="primary" onClick={() => openModal(page === "sessions" ? "session" : page.slice(0, -1))}>＋ New {page === "sessions" ? "session" : page.slice(0, -1)}</button>}</div></header>
      {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}{loading && <div className="loading-line" />}
      {page === "dashboard" && <Dashboard stats={stats} data={data} setPage={setPage} openModal={openModal} activeSession={activeSession} startTimer={startTimer} stopTimer={stopTimer} />}
      {page === "projects" && <Collection title="Your projects" subtitle="Turn big ideas into steady progress." items={data.projects} type="project" onAdd={() => openModal("project")} onEdit={openModal} onDelete={remove} data={data} />}
      {page === "subjects" && <Collection title="Learning subjects" subtitle="Keep every topic and note connected." items={data.subjects} type="subject" onAdd={() => openModal("subject")} onEdit={openModal} onDelete={remove} data={data} />}
      {page === "notes" && <Notes notes={data.notes} subjects={data.subjects} onAdd={() => openModal("note")} onEdit={openModal} onDelete={remove} onAsk={(id) => { setSelectedNoteId(id); setPage("assistant"); }} />}
      {page === "tasks" && <Tasks tasks={data.tasks} projects={data.projects} subjects={data.subjects} onAdd={() => openModal("task")} onEdit={openModal} onDelete={remove} />}
      {page === "sessions" && <Sessions sessions={data.sessions} projects={data.projects} subjects={data.subjects} onAdd={() => openModal("session")} onEdit={openModal} onDelete={remove} activeSession={activeSession} startTimer={startTimer} stopTimer={stopTimer} />}
      {page === "assistant" && <Assistant api={api} setNotice={setNotice} notes={data.notes} selectedNoteId={selectedNoteId} setSelectedNoteId={setSelectedNoteId} />}
      {page === "settings" && <Settings api={api} setNotice={setNotice} onToken={(next) => { localStorage.setItem("token", next); setToken(next); }} />}
    </main>
    {modal && <Modal type={modal} form={form} update={updateField} onSubmit={saveModal} onClose={closeModal} data={data} editing={editingId} />}
  </div>;
}

function AuthScreen({ mode, setMode, auth, setAuth, onSubmit, notice, loading }) {
  return <div className="auth-page"><div className="auth-orb orb-one" /><div className="auth-orb orb-two" /><div className="auth-card"><div className="brand centered"><div className="brand-mark">O</div><div><strong>OpenStudy</strong><small>AI LEARNING OS</small></div></div><span className="auth-kicker">YOUR LEARNING, IN ONE PLACE</span><h1>{mode === "login" ? "Welcome back." : "Start learning better."}</h1><p>{mode === "login" ? "Pick up where you left off and keep your momentum." : "Build a focused workspace for the things you want to master."}</p>{notice && <div className="notice">{notice}</div>}<form onSubmit={onSubmit}><label>Username<input value={auth.username} onChange={(event) => setAuth({ ...auth, username: event.target.value })} required autoComplete="username" /></label><label>Password<input type="password" value={auth.password} onChange={(event) => setAuth({ ...auth, password: event.target.value })} required minLength="6" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label><button className="primary full" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Sign in to workspace →" : "Create workspace →"}</button></form><button className="switch-auth" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "New to OpenStudy? Create an account" : "Already have an account? Sign in"}</button></div></div>;
}

function Dashboard({ stats, data, setPage, openModal, activeSession, startTimer, stopTimer }) {
  return <div className="content"><section className="welcome"><div><span className="eyebrow">GOOD TO SEE YOU</span><h2>Make today count.</h2><p>A little progress every day adds up to something remarkable.</p></div><div className="date-pill">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div></section>
    <div className="stat-grid">{[["projects", "Projects", "Active workspaces", "◈"], ["notes", "Notes", "Ideas captured", "▤"], ["tasks", "Tasks", `${stats.completed_tasks || 0} completed`, "✓"], ["study_minutes", "Study minutes", "Time invested", "◷"]].map(([key, label, sub, icon]) => <button className="stat-card" key={key} onClick={() => setPage(key === "study_minutes" ? "sessions" : key)}><span className="stat-icon">{icon}</span><strong>{stats[key] || 0}</strong><span>{label}</span><small>{sub}</small></button>)}</div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">IN PROGRESS</span><h3>Project momentum</h3></div><button className="text-button" onClick={() => setPage("projects")}>View all →</button></div>{data.projects.length ? data.projects.slice(0, 4).map((project) => <div className="progress-row" key={project.id}><div><strong>{project.name}</strong><small>{project.deadline ? `Due ${project.deadline}` : "No deadline"}</small></div><span>{project.progress || 0}%</span><div className="progress-track"><i style={{ width: `${project.progress || 0}%` }} /></div></div>) : <Empty text="Your projects will appear here." action="Create a project" onClick={() => openModal("project")} />}</section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">FOCUS TIMER</span><h3>{activeSession ? "Session in progress" : "Ready to focus?"}</h3></div></div>{activeSession ? <LiveClock session={activeSession} onStop={stopTimer} /> : <button className="primary full" onClick={startTimer}>Start live session</button>}<div className="quick-actions"><button onClick={() => openModal("note")}>＋ <span><strong>Capture a note</strong><small>Save a thought before it disappears.</small></span> →</button><button onClick={() => openModal("task")}>✓ <span><strong>Add a task</strong><small>Make your next step obvious.</small></span> →</button></div></section></div>
    <Analytics stats={stats} setPage={setPage} />
  </div>;
}

function LiveClock({ session, onStop }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [session.started_at]);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  return <div className="live-clock"><strong>{minutes}:{seconds}</strong><small>Started {new Date(session.started_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small><button className="secondary" onClick={onStop}>Stop & save</button></div>;
}

function Analytics({ stats, setPage }) {
  const max = Math.max(...(stats.study_trend || []).map((item) => item.minutes), 1);
  return <div className="analytics-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">LAST 7 DAYS</span><h3>Study trend</h3></div></div><div className="trend-chart">{(stats.study_trend || []).map((item) => <div className="trend-bar" key={item.date}><i style={{ height: `${Math.max(5, item.minutes / max * 100)}%` }} /><small>{item.date.slice(5)}</small></div>)}</div></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">UP NEXT</span><h3>Deadlines</h3></div><button className="text-button" onClick={() => setPage("tasks")}>Tasks →</button></div>{(stats.upcoming || []).length ? stats.upcoming.slice(0, 4).map((item) => <div className="deadline-row" key={item.id}><span>◷</span><div><strong>{item.name}</strong><small>{item.deadline} · {item.progress}% complete</small></div></div>) : <p className="muted">No upcoming deadlines.</p>}</section></div>;
}

function Collection({ title, subtitle, items, type, onAdd, onEdit, onDelete, data }) {
  return <div className="content"><div className="section-intro"><div><span className="eyebrow">LIBRARY</span><h2>{title}</h2><p>{subtitle}</p></div><button className="primary" onClick={onAdd}>＋ Add new</button></div>{items.length ? <div className="cards">{items.map((item) => <article className="card" key={item.id}><div className="card-top"><span className={`type-icon ${type}`}>{type === "project" ? "◈" : "◌"}</span><div><span className="eyebrow">{type}</span><h3>{item.name}</h3></div><button className="icon-button" onClick={() => onEdit(type, item)}>•••</button></div><p>{item.description || "No description added yet."}</p>{type === "project" && <><div className="project-meta"><span>{item.progress || 0}% complete</span><span className={`status ${item.status}`}>{item.status}</span></div><div className="progress-track"><i style={{ width: `${item.progress || 0}%` }} /></div>{item.task_count > 0 && <small className="muted">{item.completed_task_count}/{item.task_count} tasks complete</small>}{item.deadline && <small className="deadline">Due {item.deadline}</small>}</>}{type === "subject" && <small className="muted">{data.notes.filter((note) => String(note.subject) === String(item.id)).length} notes connected</small>}<div className="card-actions"><button onClick={() => onEdit(type, item)}>Edit</button><button className="danger-link" onClick={() => onDelete(type, item.id)}>Delete</button></div></article>)}</div> : <Empty text={`No ${type}s yet. Create one to get started.`} action={`Create ${type}`} onClick={onAdd} />}</div>;
}

function Notes({ notes, subjects, onAdd, onEdit, onDelete, onAsk }) {
  return <div className="content"><div className="section-intro"><div><span className="eyebrow">KNOWLEDGE BASE</span><h2>Your notes</h2><p>Make your ideas searchable, useful, and yours.</p></div><button className="primary" onClick={onAdd}>＋ New note</button></div>{notes.length ? <div className="notes-grid">{notes.map((note) => <article className="note-card" key={note.id}><div className="note-accent" /><span className="eyebrow">{subjects.find((subject) => String(subject.id) === String(note.subject))?.name || "Uncategorized"}</span><h3>{note.title}</h3><p>{note.content || "No content yet."}</p><div className="card-actions"><button onClick={() => onAsk(note.id)}>Ask AI</button><button onClick={() => onEdit("note", note)}>Edit</button><button className="danger-link" onClick={() => onDelete("note", note.id)}>Delete</button></div></article>)}</div> : <Empty text="Your first note is one thought away." action="Create a note" onClick={onAdd} />}</div>;
}

function Tasks({ tasks, projects, subjects, onAdd, onEdit, onDelete }) {
  const [filters, setFilters] = useState({ status: "", priority: "", project: "", subject: "", timeframe: "", ordering: "due_date" });
  const today = new Date().toISOString().slice(0, 10);
  const visible = tasks.filter((task) => {
    if (filters.status === "complete" && task.status !== "done") return false;
    if (filters.status === "incomplete" && task.status === "done") return false;
    if (filters.status && !["complete", "incomplete"].includes(filters.status) && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.project && String(task.project) !== filters.project) return false;
    if (filters.subject && String(task.subject) !== filters.subject) return false;
    if (filters.timeframe === "upcoming" && (!task.due_date || task.due_date < today || task.status === "done")) return false;
    if (filters.timeframe === "overdue" && (!task.due_date || task.due_date >= today || task.status === "done")) return false;
    return true;
  }).sort((a, b) => {
    const direction = filters.ordering.startsWith("-") ? -1 : 1;
    const field = filters.ordering.replace("-", "");
    return String(a[field] || "").localeCompare(String(b[field] || "")) * direction;
  });
  const setFilter = (event) => setFilters((old) => ({ ...old, [event.target.name]: event.target.value }));
  return <div className="content"><div className="section-intro"><div><span className="eyebrow">NEXT ACTIONS</span><h2>Task board</h2><p>Keep your next steps small and visible.</p></div><button className="primary" onClick={onAdd}>＋ New task</button></div><div className="task-filters panel"><Select name="status" label="Status" value={filters.status} update={setFilter} options={[["complete", "Completed"], ["incomplete", "Incomplete"], ["todo", "To do"], ["in_progress", "In progress"], ["done", "Done"]]} /><Select name="priority" label="Priority" value={filters.priority} update={setFilter} options={["low", "medium", "high"]} /><Select name="project" label="Project" value={filters.project} update={setFilter} options={projects.map((item) => [item.id, item.name])} /><Select name="subject" label="Subject" value={filters.subject} update={setFilter} options={subjects.map((item) => [item.id, item.name])} /><Select name="timeframe" label="Due" value={filters.timeframe} update={setFilter} options={[["upcoming", "Upcoming"], ["overdue", "Overdue"]]} /><Select name="ordering" label="Sort" value={filters.ordering} update={setFilter} options={[["due_date", "Due date"], ["-due_date", "Due date (latest)"], ["priority", "Priority"], ["created_at", "Newest"], ["-created_at", "Oldest"]]} /></div>{visible.length ? <div className="task-list">{visible.map((task) => <article className="task-row" key={task.id}><button className={`check ${task.status}`} onClick={() => onEdit("task", { ...task, status: task.status === "done" ? "todo" : "done" })}>{task.status === "done" ? "✓" : ""}</button><div><strong className={task.status === "done" ? "strike" : ""}>{task.title}</strong><small>{task.description || "No details"} {task.due_date && ` · Due ${task.due_date}`}</small></div><span className={`status ${task.status}`}>{task.status.replace("_", " ")}</span><button className="icon-button" onClick={() => onEdit("task", task)}>•••</button><button className="danger-link" onClick={() => onDelete("task", task.id)}>Delete</button></article>)}</div> : <Empty text="No tasks match these filters." action="Clear filters" onClick={() => setFilters({ status: "", priority: "", project: "", subject: "", timeframe: "", ordering: "due_date" })} />}</div>;
}

function Sessions({ sessions, projects, subjects, onAdd, onEdit, onDelete, activeSession, startTimer, stopTimer }) {
  return <div className="content"><div className="section-intro"><div><span className="eyebrow">FOCUS LOG</span><h2>Study sessions</h2><p>Review the time you invested in yourself.</p></div><div className="top-actions">{activeSession ? <button className="secondary" onClick={stopTimer}>Stop timer</button> : <button className="primary" onClick={startTimer}>Start timer</button>}<button className="secondary" onClick={onAdd}>＋ Log session</button></div></div>{sessions.length ? <div className="session-list">{sessions.map((session) => <article className="session-row" key={session.id}><span className="session-icon">◷</span><div><strong>{session.title}</strong><small>{new Date(session.started_at).toLocaleString()} · {projects.find((item) => String(item.id) === String(session.project))?.name || "No project"} · {subjects.find((item) => String(item.id) === String(session.subject))?.name || "No subject"} · {session.is_active ? "In progress" : `${session.duration_minutes} minutes`}</small></div><button className="icon-button" onClick={() => onEdit("session", session)}>•••</button>{!session.is_active && <button className="danger-link" onClick={() => onDelete("session", session.id)}>Delete</button>}</article>)}</div> : <Empty text="Log your first focused study session." action="Log a session" onClick={onAdd} />}</div>;
}

function Assistant({ api, setNotice, notes, selectedNoteId, setSelectedNoteId }) {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState("ask");
  const [history, setHistory] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  useEffect(() => {
    api("/assistant/conversations/").then((conversations) => {
      const conversation = conversations[0];
      if (conversation) {
        setConversationId(conversation.id);
        setHistory((conversation.messages || []).filter((message) => message.role === "assistant").map((message) => ({
          action: "saved", prompt: "", answer: message.content,
        })));
      }
    }).catch((error) => setNotice(error.message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function submit(event, requestedAction = action) {
    event?.preventDefault();
    if (!prompt.trim() && requestedAction === "ask") return;
    setBusy(true);
    try {
      const result = await api("/assistant/actions/", { method: "POST", body: JSON.stringify({ prompt, action: requestedAction, note_id: selectedNoteId, conversation_id: conversationId }) });
      setAnswer(result.answer);
      setConversationId(result.conversation_id);
      setHistory((old) => [...old, { action: requestedAction, prompt, answer: result.answer }]);
      setPrompt("");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }
  return <div className="content assistant-page"><div className="assistant-hero"><span className="ai-spark">✦</span><span className="eyebrow">OPENSTUDY AI</span><h2>A thinking partner for your learning.</h2><p>Demo mode is enabled: useful note-based answers work without an API key or external provider.</p></div><label className="note-picker">Use a note with the assistant<select value={selectedNoteId || ""} onChange={(event) => setSelectedNoteId(event.target.value || null)}><option value="">No note selected</option>{notes.map((note) => <option value={note.id} key={note.id}>{note.title}</option>)}</select></label>{selectedNoteId && <p className="selected-note">Using: {notes.find((note) => String(note.id) === String(selectedNoteId))?.title}</p>}<div className="ai-actions">{[["summarize", "Summarize"], ["quiz", "Make a quiz"], ["flashcards", "Flashcards"], ["study-plan", "Study plan"]].map(([value, label]) => <button className={action === value ? "secondary selected" : "secondary"} key={value} onClick={() => { setAction(value); submit(null, value); }}>{label}</button>)}</div><form className="assistant-form" onSubmit={submit}><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={selectedNoteId ? "Ask something about this note..." : "What would you like to explore?"} required={action === "ask"} /><button className="primary" disabled={busy}>{busy ? "Thinking..." : "Ask assistant →"}</button></form>{answer && <div className="answer panel"><span className="eyebrow">ASSISTANT RESPONSE</span><p>{answer}</p></div>}{history.length > 0 && <div className="panel ai-history"><span className="eyebrow">THIS SESSION</span>{history.map((item, index) => <div key={`${item.action}-${index}`}><strong>{item.action.replace("-", " ")}</strong><p>{item.answer}</p></div>)}</div>}</div>;
}

function Settings({ api, setNotice, onToken }) {
  const [profile, setProfile] = useState({ username: "", email: "", first_name: "", last_name: "" });
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "" });
  useEffect(() => { api("/profile/").then(setProfile).catch((error) => setNotice(error.message)); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function saveProfile(event) {
    event.preventDefault();
    try { setProfile(await api("/profile/", { method: "PATCH", body: JSON.stringify(profile) })); setNotice("Profile updated."); } catch (error) { setNotice(error.message); }
  }
  async function savePassword(event) {
    event.preventDefault();
    try { const result = await api("/profile/password/", { method: "POST", body: JSON.stringify(passwords) }); onToken(result.token); setPasswords({ current_password: "", new_password: "" }); setNotice("Password updated."); } catch (error) { setNotice(error.message); }
  }
  return <div className="content settings-page"><div className="section-intro"><div><span className="eyebrow">ACCOUNT</span><h2>Settings & profile</h2><p>Keep your profile current and your account secure.</p></div></div><div className="settings-grid"><form className="panel settings-form" onSubmit={saveProfile}><h3>Profile</h3><label>Username<input value={profile.username} disabled /></label><label>Email<input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label><div className="form-grid"><label>First name<input value={profile.first_name} onChange={(event) => setProfile({ ...profile, first_name: event.target.value })} /></label><label>Last name<input value={profile.last_name} onChange={(event) => setProfile({ ...profile, last_name: event.target.value })} /></label></div><button className="primary">Save profile</button></form><form className="panel settings-form" onSubmit={savePassword}><h3>Change password</h3><label>Current password<input type="password" required value={passwords.current_password} onChange={(event) => setPasswords({ ...passwords, current_password: event.target.value })} /></label><label>New password<input type="password" required minLength="8" value={passwords.new_password} onChange={(event) => setPasswords({ ...passwords, new_password: event.target.value })} /></label><button className="primary">Update password</button></form></div></div>;
}

function Modal({ type, form, update, onSubmit, onClose, data, editing }) {
  const labels = { project: "project", subject: "subject", note: "note", task: "task", session: "study session" };
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><span className="eyebrow">{editing ? "EDIT" : "CREATE"} {labels[type].toUpperCase()}</span><h2>{editing ? "Update your" : "Add a new"} {labels[type]}</h2><form onSubmit={onSubmit}>{type === "project" && <><Field name="name" label="Name" value={form.name} update={update} required /><Field name="description" label="Description" value={form.description} update={update} textarea /><div className="form-grid"><Field name="progress" label="Progress %" type="number" value={form.progress} update={update} min="0" max="100" /><Field name="deadline" label="Deadline" type="date" value={form.deadline} update={update} /></div><Select name="status" label="Status" value={form.status} update={update} options={["active", "paused", "completed"]} /></>}{type === "subject" && <><Field name="name" label="Name" value={form.name} update={update} required /><Field name="description" label="Description" value={form.description} update={update} textarea /></>}{type === "note" && <><Field name="title" label="Title" value={form.title} update={update} required /><Select name="subject" label="Subject" value={form.subject} update={update} options={data.subjects.map((item) => [item.id, item.name])} /><Field name="content" label="Content" value={form.content} update={update} textarea /></>}{type === "task" && <><Field name="title" label="Title" value={form.title} update={update} required /><Field name="description" label="Details" value={form.description} update={update} textarea /><div className="form-grid"><Select name="status" label="Status" value={form.status} update={update} options={["todo", "in_progress", "done"]} /><Select name="priority" label="Priority" value={form.priority} update={update} options={["low", "medium", "high"]} /></div>  <div className="form-grid"><Field name="due_date" label="Due date" type="date" value={form.due_date} update={update} /><Select name="project" label="Project" value={form.project} update={update} options={data.projects.map((item) => [item.id, item.name])} /><Select name="subject" label="Subject" value={form.subject} update={update} options={data.subjects.map((item) => [item.id, item.name])} /></div></>}{type === "session"  && <><Field name="title" label="Title" value={form.title} update={update} required /><div className="form-grid"><Field name="started_at" label="Started" type="datetime-local" value={form.started_at} update={update} /><Field name="duration_minutes" label="Minutes" type="number" value={form.duration_minutes} update={update} min="1" /></div>  <Field name="reflection" label="Reflection" value={form.reflection} update={update} textarea /><div className="form-grid"><Select name="project" label="Project" value={form.project} update={update} options={data.projects.map((item) => [item.id, item.name])} /><Select name="subject" label="Subject" value={form.subject} update={update} options={data.subjects.map((item) => [item.id, item.name])} /></div></>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">{editing ? "Save changes" : "Create"}</button></div></form></div></div>;
}
function Field({ name, label, value, update, textarea, ...props }) { const Tag = textarea ? "textarea" : "input"; return <label>{label}<Tag name={name} value={value ?? ""} onChange={update} {...props} /></label>; }
function Select({ name, label, value, update, options }) { return <label>{label}<select name={name} value={value ?? ""} onChange={update}><option value="">None</option>{options.map((option) => { const [key, text] = Array.isArray(option) ? option : [option, option.replace("_", " ")]; return <option value={key} key={key}>{text}</option>; })}</select></label>; }
function Empty({ text, action, onClick }) { return <div className="empty"><span>✦</span><p>{text}</p><button className="secondary" onClick={onClick}>{action}</button></div>; }

export default App;
