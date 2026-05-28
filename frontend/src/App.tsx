import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileClock,
  Filter,
  LayoutDashboard,
  LogOut,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  UserRound,
  Pencil,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import {
  ApiError,
  archiveClient,
  createAdminNote,
  createBarrier,
  createClient,
  createFollowUp,
  createNotification,
  getAnalyticsConsultants,
  getAnalyticsFunnel,
  getAnalyticsOverview,
  getAnalyticsRevenue,
  getAdminNotes,
  getBarrierAnalytics,
  getBarriers,
  getClient,
  getClients,
  getConsultantDashboard,
  getFollowUps,
  getOverdueFollowUps,
  getNotifications,
  getStagnantClients,
  getStageLogs,
  getUsers,
  login,
  markNotificationRead,
  me,
  resetUserPassword,
  restoreClient,
  updateAdminNote,
  updateBarrier,
  updateClient,
  updateClientStage,
  updateFollowUp,
  updateUser,
  createUser,
} from "./api";
import type {
  AdminNoteItem,
  AnalyticsFunnel,
  AnalyticsOverview,
  AnalyticsRevenue,
  BarrierAnalytics,
  ClientDetail,
  ClientListPreset,
  ClientListItem,
  ClientPayload,
  ClientStatus,
  ConsultantAnalytics,
  ConsultantDashboard,
  ContactMethod,
  DecisionBarrier,
  FollowUpItem,
  ManagedUser,
  NotificationItem,
  Stage,
  StageLogItem,
  User,
  UserStatus,
} from "./types";

const stages: Stage[] = ["S1", "S2", "S3", "S4", "S5", "S6"];
const stageLabels: Record<Stage, string> = {
  S1: "資料蒐集",
  S2: "建立節奏",
  S3: "咨詢確認",
  S4: "需求整合",
  S5: "障礙釐清",
  S6: "治療啟動",
};
const contactMethods: ContactMethod[] = ["line", "phone", "onsite", "email"];
const consultationStatuses = ["尚未回覆", "有興趣", "暫緩", "失聯"] as const;

function formatDate(value: string | null) {
  if (!value) return "未設定";
  return new Intl.DateTimeFormat("zh-Hant", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toDateTimeInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function money(value: number | null) {
  if (value === null) return "未估算";
  return new Intl.NumberFormat("zh-Hant", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);
}

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

function calculateAgeFromBirthDate(value: string | null | undefined) {
  if (!value) return null;
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return Math.max(age, 0);
}

function zodiacFromBirthDate(value: string | null | undefined) {
  if (!value) return null;
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "牡羊座";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "金牛座";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return "雙子座";
  if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return "巨蟹座";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "獅子座";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "處女座";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return "天秤座";
  if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return "天蠍座";
  if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return "射手座";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "摩羯座";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "水瓶座";
  return "雙魚座";
}

function funnelRangeFromDays(days: number) {
  const safeDays = Math.max(1, Math.floor(days || 30));
  const end = new Date();
  const start = new Date(end.getTime() - safeDays * 24 * 60 * 60 * 1000);
  return {
    start: toDateTimeInputValue(start.toISOString()),
    end: toDateTimeInputValue(end.toISOString()),
  };
}

function defaultFunnelRange() {
  return funnelRangeFromDays(30);
}

function isValidFunnelRange(range: { start: string; end: string }) {
  return !(range.start && range.end && range.start > range.end);
}

type AppView = "dashboard" | "clients" | "notifications" | "analytics" | "users";

type AppLocationState = {
  view: AppView;
  selectedClientId: number | null;
  selectedConsultantId: number | null;
  clientListPreset: ClientListPreset;
};

function parseAppLocation(): AppLocationState {
  const url = new URL(window.location.href);
  const consultantId = url.searchParams.get("consultant_id");
  const stage = url.searchParams.get("stage");
  const status = url.searchParams.get("status");
  const overdue = url.searchParams.get("overdue");

  if (url.pathname.startsWith("/clients/")) {
    const clientId = Number(url.pathname.split("/")[2]);
    return {
      view: "clients",
      selectedClientId: Number.isFinite(clientId) ? clientId : null,
      selectedConsultantId: consultantId ? Number(consultantId) : null,
      clientListPreset: { key: 0 },
    };
  }

  if (url.pathname === "/clients") {
    return {
      view: "clients",
      selectedClientId: null,
      selectedConsultantId: consultantId ? Number(consultantId) : null,
      clientListPreset: {
        key: 0,
        stage: stage ? (stage as Stage) : undefined,
        status: status ? (status as ClientStatus) : undefined,
        overdue: overdue === "true" ? true : undefined,
      },
    };
  }

  if (url.pathname === "/notifications") {
    return {
      view: "notifications",
      selectedClientId: null,
      selectedConsultantId: consultantId ? Number(consultantId) : null,
      clientListPreset: { key: 0 },
    };
  }

  if (url.pathname === "/analytics") {
    return {
      view: "analytics",
      selectedClientId: null,
      selectedConsultantId: consultantId ? Number(consultantId) : null,
      clientListPreset: { key: 0 },
    };
  }

  if (url.pathname === "/users") {
    return {
      view: "users",
      selectedClientId: null,
      selectedConsultantId: null,
      clientListPreset: { key: 0 },
    };
  }

  return {
    view: "dashboard",
    selectedClientId: null,
    selectedConsultantId: consultantId ? Number(consultantId) : null,
    clientListPreset: { key: 0 },
  };
}

function buildAppUrl(state: AppLocationState) {
  const search = new URLSearchParams();
  if (state.selectedConsultantId) {
    search.set("consultant_id", String(state.selectedConsultantId));
  }

  let pathname = "/dashboard";
  if (state.view === "clients" && state.selectedClientId) {
    pathname = `/clients/${state.selectedClientId}`;
  } else if (state.view === "clients") {
    pathname = "/clients";
    if (state.clientListPreset.stage) search.set("stage", state.clientListPreset.stage);
    if (state.clientListPreset.status) search.set("status", state.clientListPreset.status);
    if (state.clientListPreset.overdue) search.set("overdue", "true");
  } else if (state.view === "notifications") {
    pathname = "/notifications";
  } else if (state.view === "analytics") {
    pathname = "/analytics";
  } else if (state.view === "users") {
    pathname = "/users";
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function App() {
  const initialLocation = parseAppLocation();
  const [token, setToken] = useState(() => localStorage.getItem("clinic_token"));
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>(initialLocation.view);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(initialLocation.selectedClientId);
  const [adminConsultants, setAdminConsultants] = useState<ConsultantAnalytics[]>([]);
  const [selectedConsultantId, setSelectedConsultantId] = useState<number | null>(initialLocation.selectedConsultantId);
  const [clientListPreset, setClientListPreset] = useState<ClientListPreset>(initialLocation.clientListPreset);
  const [authLoading, setAuthLoading] = useState(Boolean(token));
  const hasInitializedHistory = useRef(false);

  useEffect(() => {
    if (!token) {
      setAuthLoading(false);
      return;
    }
    me(token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("clinic_token");
        setToken(null);
      })
      .finally(() => setAuthLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || user?.role !== "admin") {
      setAdminConsultants([]);
      setSelectedConsultantId(null);
      return;
    }
    getAnalyticsConsultants(token)
      .then((response) => setAdminConsultants(response.data))
      .catch(() => setAdminConsultants([]));
  }, [token, user?.role]);

  useEffect(() => {
    function handlePopState() {
      const next = parseAppLocation();
      setView(next.view);
      setSelectedClientId(next.selectedClientId);
      setSelectedConsultantId(next.selectedConsultantId);
      setClientListPreset({ ...next.clientListPreset, key: Date.now() });
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!token || authLoading) return;
    const nextUrl = buildAppUrl({
      view,
      selectedClientId,
      selectedConsultantId,
      clientListPreset,
    });
    if (!hasInitializedHistory.current) {
      window.history.replaceState(null, "", nextUrl);
      hasInitializedHistory.current = true;
      return;
    }
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== nextUrl) {
      window.history.pushState(null, "", nextUrl);
    }
  }, [token, authLoading, view, selectedClientId, selectedConsultantId, clientListPreset]);

  function handleAuthenticated(nextToken: string, nextUser: User) {
    localStorage.setItem("clinic_token", nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem("clinic_token");
    setToken(null);
    setUser(null);
    setSelectedClientId(null);
    setSelectedConsultantId(null);
    setAdminConsultants([]);
    setClientListPreset({ key: 0 });
    hasInitializedHistory.current = false;
    window.history.replaceState(null, "", "/");
  }

  function openClientList(preset: Omit<ClientListPreset, "key"> = {}) {
    setClientListPreset({ ...preset, key: Date.now() });
    setSelectedClientId(null);
    setView("clients");
  }

  if (authLoading) {
    return <ShellLoading />;
  }

  if (!token || !user) {
    return <LoginScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-ink/10 bg-porcelain px-5 py-6 lg:block">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-[0.22em] text-moss">Clinic OS</div>
          <div className="mt-2 font-display text-3xl text-ink">Consult Flow</div>
        </div>
        <nav className="space-y-2">
          <NavButton active={view === "dashboard"} icon={<LayoutDashboard size={18} />} onClick={() => { setSelectedClientId(null); setView("dashboard"); }}>
            工作台
          </NavButton>
          {user.role === "admin" && (
            <NavButton active={view === "analytics"} icon={<Activity size={18} />} onClick={() => { setSelectedClientId(null); setView("analytics"); }}>
              Analytics
            </NavButton>
          )}
          {user.role === "admin" && (
            <NavButton active={view === "users"} icon={<ShieldCheck size={18} />} onClick={() => { setSelectedClientId(null); setView("users"); }}>
              使用者管理
            </NavButton>
          )}
          <NavButton active={view === "clients"} icon={<UserRound size={18} />} onClick={() => { setSelectedClientId(null); setView("clients"); }}>
            客戶列表
          </NavButton>
          <NavButton active={view === "notifications"} icon={<Bell size={18} />} onClick={() => { setSelectedClientId(null); setView("notifications"); }}>
            通知中心
          </NavButton>
        </nav>
        {user.role === "admin" && (
          <AdminSidebarConsultants
            consultants={adminConsultants}
            selectedConsultantId={selectedConsultantId}
            onSelect={(id) => {
              setSelectedConsultantId(id);
              setSelectedClientId(null);
              setView("dashboard");
            }}
          />
        )}
        <div className="absolute bottom-6 left-5 right-5 rounded-lg border border-ink/10 bg-paper p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-clinic text-sm font-semibold text-white">
              {user.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="text-xs text-ink/55">{user.role}</div>
            </div>
          </div>
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-ink/10 py-2 text-sm hover:bg-ink hover:text-paper" onClick={logout}>
            <LogOut size={16} />
            登出
          </button>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/90 px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-moss">{user.role === "admin" ? "S1-S6 Management Console" : "S1-S6 Consultant Workspace"}</div>
              <h1 className="font-display text-2xl lg:text-4xl">
                {view === "dashboard"
                  ? user.role === "admin" ? "主控者總覽" : "今日咨詢工作台"
                  : view === "analytics"
                  ? "Analytics"
                  : view === "users"
                    ? "使用者管理"
                  : view === "notifications"
                    ? "通知中心"
                    : selectedClientId ? "客戶詳情" : "客戶管理"}
              </h1>
            </div>
            <button className="rounded-md border border-ink/10 px-3 py-2 text-sm lg:hidden" onClick={logout}>
              登出
            </button>
          </div>
        </header>

        <div className="px-5 py-6 lg:px-8">
          {view === "dashboard" && (
            user.role === "admin" ? (
              <AdminDashboard
                token={token}
                consultants={adminConsultants}
                selectedConsultantId={selectedConsultantId}
                onOpenClientList={openClientList}
                onOpenClient={(id) => {
                  setSelectedClientId(id);
                  setView("clients");
                }}
              />
            ) : (
              <Dashboard token={token} onOpenClient={(id) => { setSelectedClientId(id); setView("clients"); }} />
            )
          )}
          {view === "clients" && (
            selectedClientId ? (
              <ClientDetailView
                token={token}
                clientId={selectedClientId}
                userRole={user.role}
                consultants={adminConsultants}
                onBack={() => setSelectedClientId(null)}
              />
            ) : (
              <ClientListView
                token={token}
                userRole={user.role}
                consultants={adminConsultants}
                consultantId={user.role === "admin" ? selectedConsultantId : null}
                preset={clientListPreset}
                onOpenClient={setSelectedClientId}
              />
            )
          )}
          {view === "notifications" && (
            <NotificationCenter
              token={token}
              currentUser={user}
              onOpenClient={(id) => {
                setSelectedClientId(id);
                setView("clients");
              }}
            />
          )}
          {view === "analytics" && user.role === "admin" && (
            <AnalyticsPage token={token} consultants={adminConsultants} selectedConsultantId={selectedConsultantId} />
          )}
          {view === "users" && user.role === "admin" && (
            <UserManagementPage token={token} currentUser={user} />
          )}
        </div>
      </main>
    </div>
  );
}

function ShellLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper text-ink">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-ink/15 border-t-clinic" />
    </div>
  );
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: (token: string, user: User) => void }) {
  const [email, setEmail] = useState("consultant@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await login(email, password);
      onAuthenticated(response.token, response.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "登入失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex min-h-[42vh] flex-col justify-between border-b border-ink/10 bg-ink p-8 text-paper lg:min-h-screen lg:border-b-0 lg:border-r">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-paper/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-paper/70">
            <ShieldCheck size={14} />
            Clinic OS
          </div>
          <h1 className="mt-12 max-w-2xl font-display text-5xl leading-[0.98] lg:text-7xl">
            把每一次咨詢推進，都留下可管理的軌跡。
          </h1>
        </div>
        <div className="grid gap-3 text-sm text-paper/70 lg:grid-cols-3">
          <div>S1-S6 流程控管</div>
          <div>追蹤節奏提醒</div>
          <div>決策障礙回溯</div>
        </div>
      </section>
      <section className="grid place-items-center p-6">
        <form className="w-full max-w-md rounded-lg border border-ink/10 bg-porcelain p-6 shadow-panel" onSubmit={submit}>
          <div className="mb-7">
            <div className="text-sm text-moss">登入工作台</div>
            <h2 className="mt-1 font-display text-3xl">Consultant Portal</h2>
          </div>
          <label className="form-label">
            Email
            <input className="field" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="form-label">
            Password
            <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <div className="mb-4 rounded-md border border-oxide/20 bg-oxide/10 px-3 py-2 text-sm text-oxide">{error}</div>}
          <button className="button-primary w-full" disabled={loading}>
            {loading ? "登入中..." : "登入"}
          </button>
          <div className="mt-4 text-xs text-ink/50">Demo: consultant@example.com / password123</div>
        </form>
      </section>
    </div>
  );
}

function NavButton({ active, icon, children, onClick }: { active: boolean; icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button
      className={classNames(
        "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition",
        active ? "bg-ink text-paper" : "text-ink/70 hover:bg-ink/5 hover:text-ink",
      )}
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );
}

function AdminSidebarConsultants({
  consultants,
  selectedConsultantId,
  onSelect,
}: {
  consultants: ConsultantAnalytics[];
  selectedConsultantId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const totalClients = consultants.reduce((sum, item) => sum + item.total_clients, 0);
  const totalOverdue = consultants.reduce((sum, item) => sum + item.overdue_followups, 0);

  return (
    <section className="mt-6 max-h-[calc(100vh-390px)] overflow-y-auto border-t border-ink/10 pt-5">
      <div className="mb-3 px-1 text-xs uppercase tracking-[0.16em] text-moss">咨詢師列表</div>
      <div className="space-y-2">
        <button
          className={classNames(
            "w-full rounded-md border px-3 py-2.5 text-left text-sm transition",
            selectedConsultantId === null ? "border-ink bg-ink text-paper" : "border-ink/10 bg-paper hover:border-clinic/40",
          )}
          onClick={() => onSelect(null)}
        >
          <div className="font-semibold">全診所</div>
          <div className={classNames("mt-1 flex justify-between text-xs", selectedConsultantId === null ? "text-paper/70" : "text-ink/50")}>
            <span>{totalClients} 客戶</span>
            <span>{totalOverdue} 逾期</span>
          </div>
        </button>
        {consultants.length === 0 && (
          <div className="rounded-md border border-dashed border-ink/15 bg-paper p-3 text-xs text-ink/45">尚無咨詢師資料</div>
        )}
        {consultants.map((item) => (
          <button
            key={item.consultant_id}
            className={classNames(
              "w-full rounded-md border px-3 py-2.5 text-left text-sm transition",
              selectedConsultantId === item.consultant_id ? "border-ink bg-ink text-paper" : "border-ink/10 bg-paper hover:border-clinic/40",
            )}
            onClick={() => onSelect(item.consultant_id)}
          >
            <div className="truncate font-semibold">{item.consultant_name}</div>
            <div className={classNames("mt-1 grid grid-cols-3 gap-2 text-xs", selectedConsultantId === item.consultant_id ? "text-paper/70" : "text-ink/50")}>
              <span>{item.total_clients} 客戶</span>
              <span className={item.overdue_followups > 0 && selectedConsultantId !== item.consultant_id ? "text-oxide" : undefined}>{item.overdue_followups} 逾期</span>
              <span>{item.s6_clients} S6</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function UserManagementPage({ token, currentUser }: { token: string; currentUser: User }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "consultant" as User["role"],
    password: "",
    status: "active" as UserStatus,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "consultant" as User["role"],
    status: "active" as UserStatus,
  });
  const [passwordUserId, setPasswordUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    getUsers(token)
      .then((response) => {
        setUsers(response.data);
        setError("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "使用者資料讀取失敗"));
  }, [token, reloadKey]);

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSavedMessage("");
    try {
      await createUser(token, createForm);
      setCreateForm({ name: "", email: "", role: "consultant", password: "", status: "active" });
      setSavedMessage("帳號已建立");
      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立帳號失敗");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(user: ManagedUser) {
    setEditingId(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setPasswordUserId(null);
    setNewPassword("");
    setSavedMessage("");
    setError("");
  }

  async function submitEdit(userId: number) {
    setSaving(true);
    setError("");
    setSavedMessage("");
    try {
      await updateUser(token, userId, editForm);
      setEditingId(null);
      setSavedMessage("帳號已更新");
      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新帳號失敗");
    } finally {
      setSaving(false);
    }
  }

  async function submitResetPassword(userId: number) {
    setSaving(true);
    setError("");
    setSavedMessage("");
    try {
      await resetUserPassword(token, userId, newPassword);
      setPasswordUserId(null);
      setNewPassword("");
      setSavedMessage("密碼已重設");
    } catch (err) {
      setError(err instanceof Error ? err.message : "重設密碼失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Panel title="建立帳號" icon={<Plus size={18} />}>
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_180px_180px_auto]" onSubmit={submitCreate}>
          <input className="field" placeholder="姓名" value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} required />
          <input className="field" type="email" placeholder="Email" value={createForm.email} onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))} required />
          <select className="field" value={createForm.role} onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value as User["role"] }))}>
            <option value="consultant">consultant</option>
            <option value="admin">admin</option>
          </select>
          <select className="field" value={createForm.status} onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value as UserStatus }))}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
          <input className="field" type="password" placeholder="初始密碼（至少8碼）" value={createForm.password} onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))} required />
          <button className="button-primary" disabled={saving}>{saving ? "建立中..." : "建立帳號"}</button>
        </form>
        {error ? <div className="mt-3"><InlineMessage tone="error">{error}</InlineMessage></div> : null}
        {savedMessage ? <div className="mt-3"><InlineMessage tone="success">{savedMessage}</InlineMessage></div> : null}
      </Panel>

      <Panel title="帳號列表" icon={<UserRound size={18} />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-[0.12em] text-ink/45">
                <th className="py-3 pr-4 font-semibold">姓名</th>
                <th className="py-3 pr-4 font-semibold">Email</th>
                <th className="py-3 pr-4 font-semibold">角色</th>
                <th className="py-3 pr-4 font-semibold">狀態</th>
                <th className="py-3 pr-4 font-semibold">建立時間</th>
                <th className="py-3 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id} className="border-b border-ink/5 align-top last:border-b-0">
                  <td className="py-4 pr-4">
                    {editingId === item.id ? (
                      <input className="field" value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
                    ) : item.name}
                  </td>
                  <td className="py-4 pr-4">
                    {editingId === item.id ? (
                      <input className="field" type="email" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} />
                    ) : item.email}
                  </td>
                  <td className="py-4 pr-4">
                    {editingId === item.id ? (
                      <select className="field" value={editForm.role} onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value as User["role"] }))}>
                        <option value="consultant">consultant</option>
                        <option value="admin">admin</option>
                      </select>
                    ) : item.role}
                  </td>
                  <td className="py-4 pr-4">
                    {editingId === item.id ? (
                      <select className="field" value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value as UserStatus }))}>
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    ) : (
                      <span className={classNames("rounded-full px-2 py-1 text-xs font-semibold", item.status === "active" ? "bg-clinic/10 text-clinic" : "bg-oxide/10 text-oxide")}>
                        {item.status}
                      </span>
                    )}
                  </td>
                  <td className="py-4 pr-4">{formatDate(item.created_at)}</td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      {editingId === item.id ? (
                        <>
                          <button type="button" className="button-primary" disabled={saving} onClick={() => submitEdit(item.id)}>
                            {saving ? "儲存中..." : "儲存"}
                          </button>
                          <button type="button" className="button-secondary" onClick={() => setEditingId(null)}>
                            取消
                          </button>
                        </>
                      ) : (
                        <button type="button" className="button-secondary" onClick={() => startEdit(item)}>
                          編輯
                        </button>
                      )}
                      {passwordUserId === item.id ? (
                        <>
                          <input
                            className="field min-w-[220px]"
                            type="password"
                            placeholder="新密碼（至少8碼）"
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                          />
                          <button type="button" className="button-primary" disabled={saving || newPassword.length < 8} onClick={() => submitResetPassword(item.id)}>
                            {saving ? "重設中..." : "送出密碼"}
                          </button>
                          <button type="button" className="button-secondary" onClick={() => { setPasswordUserId(null); setNewPassword(""); }}>
                            取消
                          </button>
                        </>
                      ) : (
                        <button type="button" className="button-secondary" onClick={() => { setPasswordUserId(item.id); setNewPassword(""); setEditingId(null); }}>
                          重設密碼
                        </button>
                      )}
                      {item.id === currentUser.id && (
                        <span className="self-center text-xs text-ink/45">目前登入帳號</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Dashboard({ token, onOpenClient }: { token: string; onOpenClient: (id: number) => void }) {
  const [data, setData] = useState<ConsultantDashboard | null>(null);
  const [error, setError] = useState("");
  const [notificationError, setNotificationError] = useState("");

  useEffect(() => {
    getConsultantDashboard(token).then(setData).catch((err) => setError(err.message));
  }, [token]);

  async function openNotification(notificationId: number, clientId?: number) {
    setNotificationError("");
    try {
      await markNotificationRead(token, notificationId);
      setData((current) => current ? {
        ...current,
        unread_notifications: current.unread_notifications.filter((item) => item.id !== notificationId),
      } : current);
      if (clientId) {
        onOpenClient(clientId);
      }
    } catch (err) {
      setNotificationError(err instanceof Error ? err.message : "通知狀態更新失敗");
    }
  }

  if (error) return <ErrorPanel message={error} />;
  if (!data) return <ShellLoading />;

  const totalClients = Object.values(data.stage_distribution).reduce((sum, value) => sum + value, 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<CalendarClock />} label="今日需追蹤" value={data.today_followups.length} tone="clinic" />
        <MetricCard icon={<AlertTriangle />} label="逾期追蹤" value={data.overdue_followups.length} tone="oxide" />
        <MetricCard icon={<Bell />} label="未讀通知" value={data.unread_notifications.length} tone="brass" />
        <MetricCard icon={<Activity />} label="負責客戶" value={totalClients} tone="moss" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="今日追蹤節奏" icon={<Clock3 size={18} />}>
          <DueList items={data.today_followups} empty="今天沒有排定追蹤" onOpenClient={onOpenClient} />
        </Panel>
        <Panel title="S1-S6 分佈" icon={<Activity size={18} />}>
          <StageBars distribution={data.stage_distribution} />
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Panel title="逾期未追蹤" icon={<AlertTriangle size={18} />}>
          <DueList items={data.overdue_followups} empty="目前沒有逾期追蹤" onOpenClient={onOpenClient} />
        </Panel>
        <Panel title="最近新增客戶" icon={<Plus size={18} />}>
          <ClientMiniList clients={data.recent_clients} empty="目前沒有新客戶" onOpenClient={onOpenClient} />
        </Panel>
        <Panel title="即將進入 S6" icon={<CircleDollarSign size={18} />}>
          <ClientMiniList clients={data.upcoming_s6_clients} empty="目前沒有 S5 客戶" onOpenClient={onOpenClient} />
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="主控者通知" icon={<Bell size={18} />}>
          <div className="space-y-3">
            {notificationError && <InlineMessage tone="error">{notificationError}</InlineMessage>}
            {data.unread_notifications.length === 0 && <EmptyText>沒有未讀通知</EmptyText>}
            {data.unread_notifications.map((item) => (
              <button key={item.id} className="w-full rounded-md border border-ink/10 bg-paper p-3 text-left hover:border-clinic/40" onClick={() => openNotification(item.id, item.client?.id)}>
                <div className="text-sm font-semibold">{item.client?.name ?? "一般通知"}</div>
                <div className="mt-1 text-sm text-ink/65">{item.message}</div>
                <div className="mt-2 text-xs text-moss">點擊後標記已讀</div>
              </button>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function NotificationCenter({ token, currentUser, onOpenClient }: { token: string; currentUser: User; onOpenClient: (id: number) => void }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState<"unread" | "read" | "">("unread");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getNotifications(token, status || undefined)
      .then((response) => setNotifications(response.data))
      .catch((err) => setError(err instanceof Error ? err.message : "通知讀取失敗"))
      .finally(() => setLoading(false));
  }, [token, status]);

  async function markRead(notificationId: number) {
    setActionError("");
    try {
      await markNotificationRead(token, notificationId);
      setNotifications((current) => (
        status === "unread"
          ? current.filter((item) => item.id !== notificationId)
          : current.map((item) => item.id === notificationId ? { ...item, status: "read" } : item)
      ));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "通知狀態更新失敗");
    }
  }

  if (error) return <ErrorPanel message={error} />;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-ink/10 bg-porcelain p-4 shadow-panel">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-moss">Notifications</div>
            <div className="mt-1 font-display text-3xl">主控者通知</div>
          </div>
          <div className="inline-flex w-fit overflow-hidden rounded-md border border-ink/10 bg-paper p-1">
            {[
              { label: "未讀", value: "unread" },
              { label: "已讀", value: "read" },
              { label: "全部", value: "" },
            ].map((item) => (
              <button
                key={item.label}
                className={classNames(
                  "rounded px-3 py-1.5 text-sm font-semibold",
                  status === item.value ? "bg-ink text-paper" : "text-ink/60 hover:text-ink",
                )}
                onClick={() => setStatus(item.value as "unread" | "read" | "")}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {actionError && <InlineMessage tone="error">{actionError}</InlineMessage>}

      <section className="overflow-hidden rounded-lg border border-ink/10 bg-porcelain shadow-panel">
        {loading && <div className="p-6 text-sm text-ink/55">載入中...</div>}
        {!loading && notifications.length === 0 && <div className="p-6 text-sm text-ink/55">沒有符合條件的通知</div>}
        {!loading && notifications.map((item) => (
          <div key={item.id} className="grid gap-3 border-b border-ink/5 p-4 last:border-b-0 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={classNames("rounded-full px-2 py-1 text-xs font-semibold", item.status === "read" ? "bg-ink/8 text-ink/50" : "bg-brass/10 text-brass")}>
                  {item.status === "read" ? "已讀" : "未讀"}
                </span>
                <span className="text-sm font-semibold">{item.client?.name ?? "一般通知"}</span>
                <span className="text-xs text-ink/45">{formatDate(item.created_at)}</span>
              </div>
              <div className="mt-2 text-sm text-ink/70">{item.message}</div>
              <div className="mt-2 text-xs text-ink/45">
                from {item.sender.name} · to {item.receiver.name}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.client && (
                <button className="button-secondary px-3 py-2" onClick={() => onOpenClient(item.client!.id)}>
                  查看客戶
                </button>
              )}
              {item.status === "unread" && item.receiver.id === currentUser.id && (
                <button className="button-primary px-3 py-2" onClick={() => markRead(item.id)}>
                  標記已讀
                </button>
              )}
              {item.status === "unread" && item.receiver.id !== currentUser.id && (
                <span className="rounded-md border border-brass/20 px-3 py-2 text-sm font-semibold text-brass">
                  等待對方讀取
                </span>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function AdminDashboard({
  token,
  consultants,
  selectedConsultantId,
  onOpenClientList,
  onOpenClient,
}: {
  token: string;
  consultants: ConsultantAnalytics[];
  selectedConsultantId: number | null;
  onOpenClientList: (preset?: Omit<ClientListPreset, "key">) => void;
  onOpenClient: (id: number) => void;
}) {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [funnel, setFunnel] = useState<AnalyticsFunnel | null>(null);
  const [funnelRange, setFunnelRange] = useState(defaultFunnelRange);
  const [barriers, setBarriers] = useState<BarrierAnalytics[]>([]);
  const [comparedConsultantIds, setComparedConsultantIds] = useState<number[]>([]);
  const [overdueItems, setOverdueItems] = useState<Array<{ client_id: number; client_name: string; current_stage: Stage; next_follow_up_at: string; overdue_days: number | null }>>([]);
  const [stagnantItems, setStagnantItems] = useState<ClientListItem[]>([]);
  const [error, setError] = useState("");
  const [funnelError, setFunnelError] = useState("");

  useEffect(() => {
    Promise.all([
      getAnalyticsOverview(token, selectedConsultantId),
      getBarrierAnalytics(token, selectedConsultantId),
      getOverdueFollowUps(token, { consultantId: selectedConsultantId, days: 1 }),
      getStagnantClients(token, selectedConsultantId, 14),
    ])
      .then(([overviewData, barrierData, overdueData, stagnantData]) => {
        setOverview(overviewData);
        setBarriers(barrierData.data);
        setOverdueItems(overdueData.data.slice(0, 6));
        setStagnantItems(stagnantData.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "管理數據讀取失敗"));
  }, [token, selectedConsultantId]);

  useEffect(() => {
    if (!isValidFunnelRange(funnelRange)) return;
    setFunnelError("");
    getAnalyticsFunnel(token, selectedConsultantId, {
      startDate: funnelRange.start || undefined,
      endDate: funnelRange.end || undefined,
    })
      .then(setFunnel)
      .catch((err) => setFunnelError(err instanceof Error ? err.message : "Funnel 讀取失敗"));
  }, [token, selectedConsultantId, funnelRange]);

  useEffect(() => {
    if (selectedConsultantId) {
      setComparedConsultantIds([selectedConsultantId]);
      return;
    }
    setComparedConsultantIds((current) => {
      const validIds = current.filter((id) => consultants.some((item) => item.consultant_id === id));
      return validIds.length > 0 ? validIds : consultants.map((item) => item.consultant_id);
    });
  }, [selectedConsultantId, consultants]);

  if (error) return <ErrorPanel message={error} />;
  if (!overview || !funnel) return <ShellLoading />;

  const selectedConsultant = consultants.find((item) => item.consultant_id === selectedConsultantId);
  const visibleConsultants = selectedConsultantId
    ? consultants.filter((item) => item.consultant_id === selectedConsultantId)
    : consultants.filter((item) => comparedConsultantIds.length === 0 || comparedConsultantIds.includes(item.consultant_id));

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="rounded-lg border border-ink/10 bg-porcelain p-4 shadow-panel">
          <div className="text-xs uppercase tracking-[0.16em] text-moss">Current Scope</div>
          <div className="mt-1 font-display text-3xl">{selectedConsultant ? selectedConsultant.consultant_name : "全診所"}</div>
        </div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<UserRound />} label="總客戶數" value={overview.total_clients} tone="moss" onClick={() => onOpenClientList()} />
          <MetricCard icon={<Plus />} label="本月新增" value={overview.new_clients_this_month} tone="clinic" onClick={() => onOpenClientList()} />
          <MetricCard icon={<CircleDollarSign />} label="本月 S6" value={overview.s6_clients_this_month} tone="brass" onClick={() => onOpenClientList({ stage: "S6" })} />
          <MetricCard icon={<AlertTriangle />} label="逾期追蹤" value={overview.overdue_followups} tone="oxide" onClick={() => onOpenClientList({ overdue: true })} />
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="S1-S6 Funnel" icon={<Filter size={18} />}>
          <FunnelDateRangeFilter value={funnelRange} onChange={setFunnelRange} />
          {funnelError ? <div className="mt-3 text-sm text-oxide">{funnelError}</div> : null}
          <AdminFunnel funnel={funnel} />
        </Panel>
        <Panel title="營運訊號" icon={<Activity size={18} />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <SignalBlock label="活躍客戶" value={overview.active_clients.toLocaleString()} onClick={() => onOpenClientList({ status: "active" })} />
            <SignalBlock label="長時間未推進" value={overview.stagnant_clients.toLocaleString()} tone={overview.stagnant_clients > 0 ? "risk" : "normal"} />
            <SignalBlock label="預估營收" value={money(overview.estimated_revenue)} wide />
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="逾期追蹤名單" icon={<AlertTriangle size={18} />}>
          <DueList items={overdueItems} empty="目前沒有逾期追蹤" onOpenClient={onOpenClient} />
        </Panel>
        <Panel title="長時間未推進名單" icon={<Clock3 size={18} />}>
          <ClientMiniList clients={stagnantItems} empty="目前沒有停滯客戶" onOpenClient={onOpenClient} />
        </Panel>
      </section>

      <Panel title="通知咨詢師" icon={<Bell size={18} />}>
        <AdminNotificationComposer token={token} consultants={consultants} selectedConsultantId={selectedConsultantId} />
      </Panel>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Panel title="Consultant Performance" icon={<UserRound size={18} />}>
          {!selectedConsultantId && consultants.length > 1 && (
            <ConsultantComparisonFilter
              consultants={consultants}
              selectedIds={comparedConsultantIds}
              onChange={setComparedConsultantIds}
            />
          )}
          <ConsultantPerformanceTable consultants={visibleConsultants} />
        </Panel>
        <Panel title="Decision Barrier Analysis" icon={<AlertTriangle size={18} />}>
          <BarrierBars barriers={barriers} />
        </Panel>
      </section>
    </div>
  );
}

function AnalyticsPage({
  token,
  consultants,
  selectedConsultantId,
}: {
  token: string;
  consultants: ConsultantAnalytics[];
  selectedConsultantId: number | null;
}) {
  const [funnel, setFunnel] = useState<AnalyticsFunnel | null>(null);
  const [funnelRange, setFunnelRange] = useState(defaultFunnelRange);
  const [consultantRows, setConsultantRows] = useState<ConsultantAnalytics[]>([]);
  const [barriers, setBarriers] = useState<BarrierAnalytics[]>([]);
  const [revenue, setRevenue] = useState<AnalyticsRevenue | null>(null);
  const [error, setError] = useState("");
  const [funnelError, setFunnelError] = useState("");

  useEffect(() => {
    Promise.all([
      getBarrierAnalytics(token, selectedConsultantId),
      getAnalyticsRevenue(token, selectedConsultantId),
      getAnalyticsConsultants(token),
    ])
      .then(([barrierData, revenueData, consultantData]) => {
        setBarriers(barrierData.data);
        setRevenue(revenueData);
        setConsultantRows(
          selectedConsultantId
            ? consultantData.data.filter((item) => item.consultant_id === selectedConsultantId)
            : consultantData.data,
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Analytics 讀取失敗"));
  }, [token, selectedConsultantId]);

  useEffect(() => {
    if (!isValidFunnelRange(funnelRange)) return;
    setFunnelError("");
    getAnalyticsFunnel(token, selectedConsultantId, {
      startDate: funnelRange.start || undefined,
      endDate: funnelRange.end || undefined,
    })
      .then(setFunnel)
      .catch((err) => setFunnelError(err instanceof Error ? err.message : "Funnel 讀取失敗"));
  }, [token, selectedConsultantId, funnelRange]);

  if (error) return <ErrorPanel message={error} />;
  if (!funnel || !revenue) return <ShellLoading />;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={<CircleDollarSign />} label="預估營收" value={Math.round(revenue.estimated_revenue)} tone="brass" />
        <MetricCard icon={<ShieldCheck />} label="已確認營收" value={Math.round(revenue.confirmed_revenue)} tone="clinic" />
        <MetricCard icon={<Activity />} label="趨勢月份" value={revenue.data.length} tone="moss" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Revenue Trend" icon={<CircleDollarSign size={18} />}>
          <RevenueTrendChart revenue={revenue} />
        </Panel>
        <Panel title="Decision Barrier Analysis" icon={<AlertTriangle size={18} />}>
          <BarrierBars barriers={barriers} />
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="S1-S6 Funnel" icon={<Filter size={18} />}>
          <FunnelDateRangeFilter value={funnelRange} onChange={setFunnelRange} />
          {funnelError ? <div className="mt-3 text-sm text-oxide">{funnelError}</div> : null}
          <AdminFunnel funnel={funnel} />
        </Panel>
        <Panel title="Consultant Performance" icon={<UserRound size={18} />}>
          <ConsultantPerformanceTable consultants={consultantRows} />
        </Panel>
      </section>
    </div>
  );
}

function AdminNotificationComposer({
  token,
  consultants,
  selectedConsultantId,
}: {
  token: string;
  consultants: ConsultantAnalytics[];
  selectedConsultantId: number | null;
}) {
  const [receiverId, setReceiverId] = useState<number | "">(selectedConsultantId ?? "");
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [clientId, setClientId] = useState<number | "">("");
  const [message, setMessage] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setReceiverId(selectedConsultantId ?? "");
    setClientId("");
    setSent(false);
    setError("");
  }, [selectedConsultantId]);

  useEffect(() => {
    if (!receiverId) {
      setClients([]);
      setClientId("");
      return;
    }
    setLoadingClients(true);
    getClients(token, { consultantId: receiverId })
      .then((response) => setClients(response.data.filter((client) => client.client_status !== "archived")))
      .catch(() => setClients([]))
      .finally(() => setLoadingClients(false));
  }, [token, receiverId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSent(false);
    try {
      if (!receiverId) throw new Error("請選擇咨詢師");
      if (!message.trim()) throw new Error("請輸入通知內容");
      await createNotification(token, {
        receiver_id: receiverId,
        client_id: clientId || undefined,
        message: message.trim(),
      });
      setMessage("");
      setClientId("");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "通知發送失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
        <label className="form-label mb-0">
          接收咨詢師
          <select className="field" value={receiverId} onChange={(event) => { setReceiverId(event.target.value ? Number(event.target.value) : ""); setSent(false); }}>
            <option value="">選擇咨詢師</option>
            {consultants.map((item) => (
              <option key={item.consultant_id} value={item.consultant_id}>{item.consultant_name}</option>
            ))}
          </select>
        </label>
        <label className="form-label mb-0">
          關聯客戶
          <select className="field" value={clientId} onChange={(event) => { setClientId(event.target.value ? Number(event.target.value) : ""); setSent(false); }} disabled={!receiverId || loadingClients}>
            <option value="">{loadingClients ? "讀取客戶中..." : "不指定客戶"}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name} · {client.current_stage}</option>
            ))}
          </select>
        </label>
      </div>
      <textarea
        className="field min-h-24"
        placeholder="輸入要交辦或提醒咨詢師的內容"
        value={message}
        onChange={(event) => { setMessage(event.target.value); setSent(false); }}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5 text-sm">
          {error && <span className="text-oxide">{error}</span>}
          {sent && <span className="text-clinic">通知已送出</span>}
        </div>
        <button className="button-primary gap-2" disabled={saving || consultants.length === 0}>
          <Bell size={16} />
          {saving ? "發送中..." : "發送通知"}
        </button>
      </div>
    </form>
  );
}

function RevenueTrendChart({ revenue }: { revenue: AnalyticsRevenue }) {
  if (revenue.data.length === 0) return <EmptyText>尚無趨勢資料</EmptyText>;
  const max = Math.max(1, ...revenue.data.flatMap((item) => [item.estimated_revenue, item.confirmed_revenue]));
  return (
    <div className="space-y-4">
      {revenue.data.map((item) => (
        <div key={item.month} className="rounded-md border border-ink/10 bg-paper p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="font-semibold">{item.month}</div>
            <div className="text-xs text-ink/50">{item.s6_clients} 位 S6</div>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-[56px_1fr_96px] items-center gap-3 text-sm">
              <div className="text-ink/55">預估</div>
              <div className="h-2.5 overflow-hidden rounded-full bg-ink/8">
                <div className="h-full rounded-full bg-brass" style={{ width: `${(item.estimated_revenue / max) * 100}%` }} />
              </div>
              <div className="text-right font-semibold">{money(item.estimated_revenue)}</div>
            </div>
            <div className="grid grid-cols-[56px_1fr_96px] items-center gap-3 text-sm">
              <div className="text-ink/55">確認</div>
              <div className="h-2.5 overflow-hidden rounded-full bg-ink/8">
                <div className="h-full rounded-full bg-clinic" style={{ width: `${(item.confirmed_revenue / max) * 100}%` }} />
              </div>
              <div className="text-right font-semibold">{money(item.confirmed_revenue)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FunnelDateRangeFilter({
  value,
  onChange,
}: {
  value: { start: string; end: string };
  onChange: (value: { start: string; end: string }) => void;
}) {
  const invalid = !isValidFunnelRange(value);
  const [recentDays, setRecentDays] = useState(30);

  return (
    <div className="mb-4 rounded-md border border-ink/10 bg-paper p-3">
      <div className="grid gap-3 md:grid-cols-[140px_1fr_1fr] md:items-end">
        <label className="space-y-1 text-sm">
          <span className="text-ink/55">最近天數</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={recentDays}
              onChange={(event) => setRecentDays(Math.max(1, Number(event.target.value) || 1))}
              className="w-full rounded-md border border-ink/10 bg-white px-3 py-2"
            />
            <button
              type="button"
              onClick={() => onChange(funnelRangeFromDays(recentDays))}
              className="whitespace-nowrap rounded-md border border-ink/10 px-3 py-2 text-sm font-semibold text-ink transition hover:border-clinic/40"
            >
              套用
            </button>
          </div>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-ink/55">開始</span>
          <input
            type="datetime-local"
            value={value.start}
            onChange={(event) => onChange({ ...value, start: event.target.value })}
            className="w-full rounded-md border border-ink/10 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-ink/55">結束</span>
          <input
            type="datetime-local"
            value={value.end}
            onChange={(event) => onChange({ ...value, end: event.target.value })}
            className="w-full rounded-md border border-ink/10 bg-white px-3 py-2"
          />
        </label>
      </div>
      {invalid ? <div className="mt-2 text-xs text-oxide">開始時間不能晚於結束時間</div> : null}
    </div>
  );
}

function AdminFunnel({ funnel }: { funnel: AnalyticsFunnel }) {
  const max = Math.max(1, ...funnel.stages.map((item) => item.count));
  return (
    <div className="space-y-4">
      {funnel.stages.map((item, index) => {
        const conversion = funnel.conversion_rates[index];
        return (
          <div key={item.stage} className="rounded-md border border-ink/10 bg-paper p-3">
            <div className="grid grid-cols-[82px_1fr_56px] items-center gap-3">
              <div>
                <div className="font-semibold">{item.stage}</div>
                <div className="text-xs text-ink/45">{item.name}</div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-ink/8">
                <div className="h-full rounded-full bg-clinic" style={{ width: `${(item.count / max) * 100}%` }} />
              </div>
              <div className="text-right font-display text-2xl">{item.count}</div>
            </div>
            {conversion && (
              <div className="mt-2 text-xs text-ink/50">
                {conversion.from} → {conversion.to}: {conversion.rate.toFixed(1)}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SignalBlock({ label, value, tone = "normal", wide = false, onClick }: { label: string; value: string; tone?: "normal" | "risk"; wide?: boolean; onClick?: () => void }) {
  const Component = onClick ? "button" : "div";
  return (
    <Component className={classNames(
      "rounded-md border p-4",
      onClick && "w-full text-left transition hover:border-clinic/40 hover:shadow-panel",
      wide && "sm:col-span-2",
      tone === "risk" ? "border-oxide/20 bg-oxide/10" : "border-ink/10 bg-paper",
    )} onClick={onClick}>
      <div className="text-sm text-ink/55">{label}</div>
      <div className="mt-1 font-display text-3xl">{value}</div>
    </Component>
  );
}

function ConsultantPerformanceTable({ consultants }: { consultants: ConsultantAnalytics[] }) {
  if (consultants.length === 0) return <EmptyText>尚無咨詢師資料</EmptyText>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-[0.12em] text-ink/45">
            <th className="py-3 pr-4 font-semibold">咨詢師</th>
            <th className="py-3 pr-4 font-semibold">客戶</th>
            <th className="py-3 pr-4 font-semibold">新增</th>
            <th className="py-3 pr-4 font-semibold">逾期</th>
            <th className="py-3 pr-4 font-semibold">S1</th>
            <th className="py-3 pr-4 font-semibold">S2</th>
            <th className="py-3 pr-4 font-semibold">S3</th>
            <th className="py-3 pr-4 font-semibold">S4</th>
            <th className="py-3 pr-4 font-semibold">S5</th>
            <th className="py-3 pr-4 font-semibold">S6</th>
            <th className="py-3 pr-4 font-semibold">預估金額</th>
          </tr>
        </thead>
        <tbody>
          {consultants.map((item) => (
            <tr key={item.consultant_id} className="border-b border-ink/5 last:border-b-0">
              <td className="py-4 pr-4 font-semibold">{item.consultant_name}</td>
              <td className="py-4 pr-4">{item.total_clients}</td>
              <td className="py-4 pr-4">{item.new_clients}</td>
              <td className={classNames("py-4 pr-4 font-semibold", item.overdue_followups > 0 && "text-oxide")}>{item.overdue_followups}</td>
              <td className="py-4 pr-4">{item.stage_distribution.S1 ?? 0}</td>
              <td className="py-4 pr-4">{item.stage_distribution.S2 ?? 0}</td>
              <td className="py-4 pr-4">{item.stage_distribution.S3 ?? 0}</td>
              <td className="py-4 pr-4">{item.stage_distribution.S4 ?? 0}</td>
              <td className="py-4 pr-4">{item.stage_distribution.S5 ?? 0}</td>
              <td className="py-4 pr-4">{item.s6_clients}</td>
              <td className="py-4 pr-4">{money(item.estimated_revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConsultantComparisonFilter({
  consultants,
  selectedIds,
  onChange,
}: {
  consultants: ConsultantAnalytics[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  function toggle(id: number) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id],
    );
  }

  const allSelected = selectedIds.length === consultants.length;

  return (
    <div className="mb-4 rounded-md border border-ink/10 bg-paper p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-ink/70">比對咨詢師</div>
        <button
          type="button"
          className="text-xs font-semibold text-moss hover:text-ink"
          onClick={() => onChange(allSelected ? [] : consultants.map((item) => item.consultant_id))}
        >
          {allSelected ? "全部取消" : "全選"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {consultants.map((item) => {
          const selected = selectedIds.includes(item.consultant_id);
          return (
            <button
              key={item.consultant_id}
              type="button"
              onClick={() => toggle(item.consultant_id)}
              className={classNames(
                "rounded-full border px-3 py-1.5 text-sm transition",
                selected
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/10 bg-white text-ink/70 hover:border-clinic/40 hover:text-ink",
              )}
            >
              {item.consultant_name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BarrierBars({ barriers }: { barriers: BarrierAnalytics[] }) {
  if (barriers.length === 0) return <EmptyText>尚無決策障礙資料</EmptyText>;
  const max = Math.max(1, ...barriers.map((item) => item.count));
  return (
    <div className="space-y-3">
      {barriers.map((item) => (
        <div key={item.barrier_type} className="rounded-md border border-ink/10 bg-paper p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="font-semibold">{item.barrier_type}</div>
            <div className="text-sm text-ink/55">{item.percentage.toFixed(1)}%</div>
          </div>
          <div className="grid grid-cols-[1fr_32px] items-center gap-3">
            <div className="h-2.5 overflow-hidden rounded-full bg-ink/8">
              <div className="h-full rounded-full bg-oxide" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
            <div className="text-right text-sm font-semibold">{item.count}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ icon, label, value, tone, onClick }: { icon: ReactNode; label: string; value: number; tone: "clinic" | "oxide" | "brass" | "moss"; onClick?: () => void }) {
  const colors = {
    clinic: "text-clinic bg-clinic/10",
    oxide: "text-oxide bg-oxide/10",
    brass: "text-brass bg-brass/10",
    moss: "text-moss bg-moss/10",
  };
  const Component = onClick ? "button" : "div";
  return (
    <Component className={classNames("rounded-lg border border-ink/10 bg-porcelain p-5 shadow-panel", onClick && "w-full text-left transition hover:border-clinic/40")} onClick={onClick}>
      <div className={classNames("mb-5 grid h-10 w-10 place-items-center rounded-md", colors[tone])}>{icon}</div>
      <div className="text-sm text-ink/55">{label}</div>
      <div className="mt-1 font-display text-4xl">{value}</div>
    </Component>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-ink/10 bg-porcelain p-5 shadow-panel">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function DueList({ items, empty, onOpenClient }: { items: Array<{ client_id: number; client_name: string; current_stage: Stage; next_follow_up_at: string; overdue_days: number | null }>; empty: string; onOpenClient: (id: number) => void }) {
  if (items.length === 0) return <EmptyText>{empty}</EmptyText>;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <button key={`${item.client_id}-${item.next_follow_up_at}`} className="flex w-full items-center justify-between rounded-md border border-ink/10 bg-paper p-3 text-left hover:border-clinic/40" onClick={() => onOpenClient(item.client_id)}>
          <div>
            <div className="flex items-center gap-2">
              <StageBadge stage={item.current_stage} />
              <span className="font-semibold">{item.client_name}</span>
            </div>
            <div className="mt-1 text-sm text-ink/55">{formatDate(item.next_follow_up_at)}</div>
          </div>
          <ChevronRight size={18} className="text-ink/35" />
        </button>
      ))}
    </div>
  );
}

function ClientMiniList({ clients, empty, onOpenClient }: { clients: ClientListItem[]; empty: string; onOpenClient: (id: number) => void }) {
  if (clients.length === 0) return <EmptyText>{empty}</EmptyText>;
  return (
    <div className="space-y-3">
      {clients.map((client) => (
        <button key={client.id} className="w-full rounded-md border border-ink/10 bg-paper p-3 text-left hover:border-clinic/40" onClick={() => onOpenClient(client.id)}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">{client.name}</span>
            <StageBadge stage={client.current_stage} />
          </div>
          <div className="mt-1 text-sm text-ink/55">{money(client.estimated_value)}</div>
        </button>
      ))}
    </div>
  );
}

function StageBars({ distribution }: { distribution: Record<Stage, number> }) {
  const max = Math.max(1, ...Object.values(distribution));
  return (
    <div className="space-y-3">
      {stages.map((stage) => (
        <div key={stage} className="grid grid-cols-[72px_1fr_34px] items-center gap-3">
          <div className="text-sm font-semibold">{stage}</div>
          <div className="h-3 overflow-hidden rounded-full bg-ink/8">
            <div className="h-full rounded-full bg-clinic" style={{ width: `${(distribution[stage] / max) * 100}%` }} />
          </div>
          <div className="text-right text-sm text-ink/55">{distribution[stage]}</div>
        </div>
      ))}
    </div>
  );
}

function ClientListView({
  token,
  userRole,
  consultants,
  consultantId,
  preset,
  onOpenClient,
}: {
  token: string;
  userRole: User["role"];
  consultants: ConsultantAnalytics[];
  consultantId?: number | null;
  preset: ClientListPreset;
  onOpenClient: (id: number) => void;
}) {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState<ClientStatus | "">("");
  const [overdue, setOverdue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [archiveError, setArchiveError] = useState("");

  useEffect(() => {
    setStage(preset.stage ?? "");
    setStatus(preset.status ?? "");
    setOverdue(Boolean(preset.overdue));
    setKeyword("");
  }, [preset.key]);

  useEffect(() => {
    setLoading(true);
    getClients(token, { keyword, stage, status: status || undefined, overdue, consultantId })
      .then((response) => setClients(response.data))
      .finally(() => setLoading(false));
  }, [token, keyword, stage, status, overdue, consultantId, reloadKey]);

  async function archiveFromList(clientId: number) {
    if (!window.confirm("確定要封存這位客戶？封存後不會出現在一般列表中。")) return;
    setArchiveError("");
    try {
      await archiveClient(token, clientId);
      setClients((current) => current.filter((client) => client.id !== clientId));
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "封存客戶失敗");
    }
  }

  async function restoreFromList(clientId: number) {
    setArchiveError("");
    try {
      await restoreClient(token, clientId);
      setClients((current) => (
        status === "archived"
          ? current.filter((client) => client.id !== clientId)
          : current.map((client) => client.id === clientId ? { ...client, client_status: "active" } : client)
      ));
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "還原客戶失敗");
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-ink/10 bg-porcelain p-4 shadow-panel">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 text-ink/35" size={18} />
            <input className="field pl-10" placeholder="搜尋姓名、電話、Line ID" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </label>
          <select className="field lg:w-44" value={stage} onChange={(event) => setStage(event.target.value)}>
            <option value="">全部階段</option>
            {stages.map((item) => (
              <option key={item} value={item}>{item} {stageLabels[item]}</option>
            ))}
          </select>
          <select className="field lg:w-36" value={status} onChange={(event) => setStatus(event.target.value as ClientStatus | "")}>
            <option value="">全部狀態</option>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="completed">completed</option>
            <option value="lost">lost</option>
            <option value="archived">archived</option>
          </select>
          <label className="flex items-center gap-2 rounded-md border border-ink/10 bg-paper px-3 text-sm">
            <input type="checkbox" checked={overdue} onChange={(event) => setOverdue(event.target.checked)} />
            只看逾期
          </label>
          <button className="button-primary gap-2" onClick={() => setShowCreate((value) => !value)}>
            <Plus size={16} />
            新增客戶
          </button>
        </div>
        {showCreate && (
          <div className="mt-4 border-t border-ink/10 pt-4">
            <ClientForm
              mode="create"
              token={token}
              userRole={userRole}
              consultants={consultants}
              defaultConsultantId={consultantId ?? undefined}
              onCreated={(id) => {
                setShowCreate(false);
                setReloadKey((value) => value + 1);
                onOpenClient(id);
              }}
            />
          </div>
        )}
      </div>

      {archiveError && <InlineMessage tone="error">{archiveError}</InlineMessage>}

      <div className="overflow-hidden rounded-lg border border-ink/10 bg-porcelain shadow-panel">
        <div className="grid grid-cols-[1fr_120px_150px_120px_90px] border-b border-ink/10 px-4 py-3 text-xs uppercase tracking-[0.14em] text-ink/45 max-md:hidden">
          <div>客戶</div>
          <div>階段</div>
          <div>下次追蹤</div>
          <div>預估金額</div>
          <div>操作</div>
        </div>
        {loading && <div className="p-6 text-sm text-ink/55">載入中...</div>}
        {!loading && clients.length === 0 && <div className="p-6 text-sm text-ink/55">沒有符合條件的客戶</div>}
        {!loading && clients.map((client) => (
          <div key={client.id} className="grid grid-cols-1 items-center gap-3 border-b border-ink/5 px-4 py-4 last:border-b-0 hover:bg-paper md:grid-cols-[1fr_120px_150px_120px_90px]">
            <div>
              <div className="font-semibold">{client.name}</div>
              <div className="text-sm text-ink/50">{client.phone ?? client.line_id ?? "未填聯絡資訊"}</div>
            </div>
            <StageBadge stage={client.current_stage} />
            <div className="text-sm text-ink/60">{formatDate(client.next_follow_up_at)}</div>
            <div className="text-sm font-semibold">{money(client.estimated_value)}</div>
            <div className="flex items-center gap-2">
              <button className="button-secondary px-3 py-2" onClick={() => onOpenClient(client.id)}>查看</button>
              {client.client_status === "archived" ? (
                <button className="rounded-md border border-clinic/20 px-3 py-2 text-sm font-semibold text-clinic hover:bg-clinic/10" onClick={() => restoreFromList(client.id)}>
                  還原
                </button>
              ) : (
                <button className="rounded-md border border-oxide/20 px-3 py-2 text-sm font-semibold text-oxide hover:bg-oxide/10" onClick={() => archiveFromList(client.id)}>
                  封存
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientDetailView({
  token,
  clientId,
  userRole,
  consultants,
  onBack,
}: {
  token: string;
  clientId: number;
  userRole: User["role"];
  consultants: ConsultantAnalytics[];
  onBack: () => void;
}) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [stageLogs, setStageLogs] = useState<StageLogItem[]>([]);
  const [barriers, setBarriers] = useState<DecisionBarrier[]>([]);
  const [adminNotes, setAdminNotes] = useState<AdminNoteItem[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingFollowUpId, setEditingFollowUpId] = useState<number | null>(null);
  const [archiveError, setArchiveError] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [barrierSavingId, setBarrierSavingId] = useState<number | null>(null);
  const [barrierError, setBarrierError] = useState("");

  useEffect(() => {
    Promise.all([
      getClient(token, clientId),
      getFollowUps(token, clientId),
      getStageLogs(token, clientId),
      getBarriers(token, clientId),
      getAdminNotes(token, clientId),
    ]).then(([clientData, followUpData, stageLogData, barrierData, noteData]) => {
      setClient(clientData);
      setFollowUps(followUpData.data);
      setStageLogs(stageLogData.data);
      setBarriers(barrierData.data);
      setAdminNotes(noteData.data);
    });
  }, [token, clientId, reloadKey]);

  if (!client) return <ShellLoading />;
  const currentClient = client;
  const ageLabel = currentClient.age === null ? null : `${currentClient.age} 歲`;
  const zodiacLabel = zodiacFromBirthDate(currentClient.birth_date);

  async function archiveCurrentClient() {
    if (!window.confirm("確定要封存這位客戶？封存後可用 archived 狀態篩選找回。")) return;
    setArchiving(true);
    setArchiveError("");
    try {
      await archiveClient(token, currentClient.id);
      onBack();
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "封存客戶失敗");
    } finally {
      setArchiving(false);
    }
  }

  async function restoreCurrentClient() {
    setArchiving(true);
    setArchiveError("");
    try {
      await restoreClient(token, currentClient.id);
      setReloadKey((value) => value + 1);
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "還原客戶失敗");
    } finally {
      setArchiving(false);
    }
  }

  async function toggleBarrierStatus(item: DecisionBarrier) {
    const nextStatus = item.status === "resolved" ? "unresolved" : "resolved";
    setBarrierSavingId(item.id);
    setBarrierError("");
    try {
      await updateBarrier(token, item.id, { status: nextStatus });
      setBarriers((current) => current.map((barrier) => (
        barrier.id === item.id ? { ...barrier, status: nextStatus } : barrier
      )));
    } catch (err) {
      setBarrierError(err instanceof Error ? err.message : "決策障礙狀態更新失敗");
    } finally {
      setBarrierSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <button className="text-sm text-moss hover:text-ink" onClick={onBack}>← 回客戶列表</button>
      {archiveError && <InlineMessage tone="error">{archiveError}</InlineMessage>}
      <section className="rounded-lg border border-ink/10 bg-porcelain p-5 shadow-panel">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <StageBadge stage={client.current_stage} />
              <span className="text-sm text-ink/55">{client.assigned_consultant.name}</span>
            </div>
            <h2 className="font-display text-4xl">{client.name}</h2>
            <div className="mt-3 grid gap-2 text-sm text-ink/60 sm:grid-cols-2 lg:grid-cols-4">
              <span>{client.phone ?? "未填電話"}</span>
              <span>{client.line_id ?? "未填 Line"}</span>
              <span>{client.interested_treatment ?? "未填療程"}</span>
              <span>{money(client.estimated_value)}</span>
              <span>{client.birth_date ? `生日 ${client.birth_date}` : "未填生日"}</span>
              <span>{ageLabel ?? "未顯示年齡"}</span>
              <span>{zodiacLabel ?? "未顯示星座"}</span>
            </div>
          </div>
          <div className="space-y-3">
            <StageUpdateForm token={token} clientId={client.id} currentStage={client.current_stage} onDone={() => setReloadKey((value) => value + 1)} />
            {client.client_status === "archived" ? (
              <button className="flex w-full items-center justify-center gap-2 rounded-md border border-clinic/20 px-4 py-2.5 text-sm font-semibold text-clinic hover:bg-clinic/10" onClick={restoreCurrentClient} disabled={archiving}>
                <RotateCcw size={16} />
                {archiving ? "還原中..." : "還原客戶"}
              </button>
            ) : (
              <button className="w-full rounded-md border border-oxide/20 px-4 py-2.5 text-sm font-semibold text-oxide hover:bg-oxide/10" onClick={archiveCurrentClient} disabled={archiving}>
                {archiving ? "封存中..." : "封存客戶"}
              </button>
            )}
          </div>
        </div>
      </section>

      <Panel title="客戶基本資料" icon={<UserRound size={18} />}>
        <ClientForm
          mode="edit"
          token={token}
          client={client}
          userRole={userRole}
          consultants={consultants}
          onUpdated={() => setReloadKey((value) => value + 1)}
        />
      </Panel>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="主控者備註" icon={<ShieldCheck size={18} />}>
          <AdminNotesPanel
            token={token}
            clientId={client.id}
            userRole={userRole}
            notes={adminNotes}
            onChanged={() => setReloadKey((value) => value + 1)}
          />
        </Panel>
        <Panel title="S6 成交與啟動" icon={<CircleDollarSign size={18} />}>
          <S6ExecutionPanel token={token} client={client} onSaved={() => setReloadKey((value) => value + 1)} />
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title={editingFollowUpId ? "編輯追蹤紀錄" : "新增追蹤紀錄"} icon={<FileClock size={18} />}>
          <FollowUpForm
            token={token}
            clientId={client.id}
            editingItem={followUps.find((item) => item.id === editingFollowUpId) ?? null}
            onCancelEdit={() => setEditingFollowUpId(null)}
            onDone={() => {
              setEditingFollowUpId(null);
              setReloadKey((value) => value + 1);
            }}
          />
        </Panel>
        <Panel title="追蹤時間軸" icon={<Clock3 size={18} />}>
          <Timeline followUps={followUps} onEdit={(id) => setEditingFollowUpId(id)} editingFollowUpId={editingFollowUpId} />
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="決策障礙" icon={<AlertTriangle size={18} />}>
          <BarrierForm token={token} clientId={client.id} onDone={() => setReloadKey((value) => value + 1)} />
          {barrierError && <div className="mt-3"><InlineMessage tone="error">{barrierError}</InlineMessage></div>}
          <div className="mt-4 space-y-3">
            {barriers.map((item) => (
              <div key={item.id} className="rounded-md border border-ink/10 bg-paper p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold">{item.barrier_type}</div>
                      <span className={classNames("rounded-full px-2 py-1 text-xs", item.status === "resolved" ? "bg-clinic/10 text-clinic" : "bg-oxide/10 text-oxide")}>{item.status}</span>
                    </div>
                    <div className="mt-1 text-sm text-ink/60">{item.description ?? "未填補充說明"}</div>
                  </div>
                  <button
                    className={classNames(
                      "w-fit rounded-md border px-3 py-2 text-sm font-semibold",
                      item.status === "resolved" ? "border-oxide/20 text-oxide hover:bg-oxide/10" : "border-clinic/20 text-clinic hover:bg-clinic/10",
                    )}
                    onClick={() => toggleBarrierStatus(item)}
                    disabled={barrierSavingId === item.id}
                  >
                    {barrierSavingId === item.id ? "更新中..." : item.status === "resolved" ? "重新打開" : "標記已解決"}
                  </button>
                </div>
              </div>
            ))}
            {barriers.length === 0 && <EmptyText>尚無決策障礙</EmptyText>}
          </div>
        </Panel>
        <Panel title="階段變更紀錄" icon={<Activity size={18} />}>
          <div className="space-y-3">
            {stageLogs.map((log) => (
              <div key={log.id} className="rounded-md border border-ink/10 bg-paper p-3">
                <div className="flex items-center gap-2 text-sm">
                  <span>{log.from_stage ?? "建立"}</span>
                  <ChevronRight size={14} />
                  <StageBadge stage={log.to_stage} />
                </div>
                <div className="mt-1 text-sm text-ink/55">{log.reason ?? "未填原因"} · {formatDate(log.created_at)}</div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function compactPayload(payload: ClientPayload): ClientPayload {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== "" && value !== undefined && value !== null),
  ) as ClientPayload;
}

function AdminNotesPanel({
  token,
  clientId,
  userRole,
  notes,
  onChanged,
}: {
  token: string;
  clientId: number;
  userRole: User["role"];
  notes: AdminNoteItem[];
  onChanged: () => void;
}) {
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!content.trim()) return;
    setSaving(true);
    setError("");
    try {
      await createAdminNote(token, clientId, { content: content.trim() });
      setContent("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "主控者備註儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit() {
    if (!editingId || !editingContent.trim()) return;
    setSaving(true);
    setError("");
    try {
      await updateAdminNote(token, editingId, { content: editingContent.trim() });
      setEditingId(null);
      setEditingContent("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "主控者備註更新失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {userRole === "admin" && (
        <div className="space-y-3 border-b border-ink/10 pb-4">
          <textarea className="field min-h-24" placeholder="留下主管判斷、策略與交辦方向" value={content} onChange={(event) => setContent(event.target.value)} />
          {error && <InlineMessage tone="error">{error}</InlineMessage>}
          <button type="button" className="button-primary" disabled={saving} onClick={submit}>
            {saving ? "儲存中..." : "新增備註"}
          </button>
        </div>
      )}
      <div className="space-y-3">
        {notes.length === 0 && <EmptyText>尚無主控者備註</EmptyText>}
        {notes.map((note) => (
          <div key={note.id} className="rounded-md border border-ink/10 bg-paper p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">{note.author.name}</div>
              <div className="text-xs text-ink/45">{formatDate(note.updated_at)}</div>
            </div>
            {editingId === note.id ? (
              <div className="space-y-3">
                <textarea className="field min-h-24" value={editingContent} onChange={(event) => setEditingContent(event.target.value)} />
                <div className="flex gap-2">
                  <button type="button" className="button-primary" disabled={saving} onClick={submitEdit}>
                    {saving ? "更新中..." : "儲存"}
                  </button>
                  <button type="button" className="button-secondary" onClick={() => { setEditingId(null); setEditingContent(""); }}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="whitespace-pre-wrap text-sm text-ink/70">{note.content}</div>
                {userRole === "admin" && (
                  <button
                    type="button"
                    className="mt-3 rounded-md border border-ink/10 px-3 py-2 text-sm font-semibold hover:border-clinic/40"
                    onClick={() => {
                      setEditingId(note.id);
                      setEditingContent(note.content);
                    }}
                  >
                    編輯備註
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function S6ExecutionPanel({ token, client, onSaved }: { token: string; client: ClientDetail; onSaved: () => void }) {
  const [payload, setPayload] = useState({
    final_treatment_plan: client.final_treatment_plan ?? "",
    actual_deal_value: client.actual_deal_value ?? "",
    payment_status: client.payment_status ?? "",
    treatment_date: toDateTimeInputValue(client.treatment_date),
    consent_signed: client.consent_signed,
    preop_completed: client.preop_completed,
    treatment_started: client.treatment_started,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPayload({
      final_treatment_plan: client.final_treatment_plan ?? "",
      actual_deal_value: client.actual_deal_value ?? "",
      payment_status: client.payment_status ?? "",
      treatment_date: toDateTimeInputValue(client.treatment_date),
      consent_signed: client.consent_signed,
      preop_completed: client.preop_completed,
      treatment_started: client.treatment_started,
    });
    setSaved(false);
    setError("");
  }, [client.id, client.updated_at]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await updateClient(token, client.id, {
        final_treatment_plan: payload.final_treatment_plan || undefined,
        actual_deal_value: payload.actual_deal_value === "" ? undefined : Number(payload.actual_deal_value),
        payment_status: payload.payment_status || undefined,
        treatment_date: payload.treatment_date ? new Date(payload.treatment_date).toISOString() : undefined,
        consent_signed: payload.consent_signed,
        preop_completed: payload.preop_completed,
        treatment_started: payload.treatment_started,
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "S6 資料更新失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <textarea className="field min-h-24" placeholder="最終療程方案" value={payload.final_treatment_plan} onChange={(event) => setPayload((current) => ({ ...current, final_treatment_plan: event.target.value }))} />
      <div className="grid gap-3 md:grid-cols-2">
        <input className="field" type="number" min={0} placeholder="實際成交金額" value={payload.actual_deal_value} onChange={(event) => setPayload((current) => ({ ...current, actual_deal_value: event.target.value ? Number(event.target.value) : "" }))} />
        <input className="field" placeholder="付款狀態" value={payload.payment_status} onChange={(event) => setPayload((current) => ({ ...current, payment_status: event.target.value }))} />
        <input className="field md:col-span-2" type="datetime-local" value={payload.treatment_date} onChange={(event) => setPayload((current) => ({ ...current, treatment_date: event.target.value }))} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex items-center gap-2 rounded-md border border-ink/10 bg-paper px-3 py-2 text-sm">
          <input type="checkbox" checked={payload.consent_signed} onChange={(event) => setPayload((current) => ({ ...current, consent_signed: event.target.checked }))} />
          已簽同意書
        </label>
        <label className="flex items-center gap-2 rounded-md border border-ink/10 bg-paper px-3 py-2 text-sm">
          <input type="checkbox" checked={payload.preop_completed} onChange={(event) => setPayload((current) => ({ ...current, preop_completed: event.target.checked }))} />
          已完成術前衛教
        </label>
        <label className="flex items-center gap-2 rounded-md border border-ink/10 bg-paper px-3 py-2 text-sm">
          <input type="checkbox" checked={payload.treatment_started} onChange={(event) => setPayload((current) => ({ ...current, treatment_started: event.target.checked }))} />
          已正式啟動療程
        </label>
      </div>
      {error && <InlineMessage tone="error">{error}</InlineMessage>}
      {saved && <InlineMessage tone="success">S6 資料已更新</InlineMessage>}
      <button className="button-primary" disabled={saving}>{saving ? "儲存中..." : "儲存 S6 資料"}</button>
    </form>
  );
}

function clientToPayload(client?: ClientDetail, defaultConsultantId?: number): ClientPayload {
  return {
    name: client?.name ?? "",
    phone: client?.phone ?? "",
    line_id: client?.line_id ?? "",
    email: client?.email ?? "",
    gender: client?.gender ?? "",
    birth_date: client?.birth_date ?? undefined,
    source: client?.source ?? "",
    interested_treatment: client?.interested_treatment ?? "",
    initial_need: client?.initial_need ?? "",
    budget_range: client?.budget_range ?? "",
    assigned_consultant_id: client?.assigned_consultant.id ?? defaultConsultantId,
    current_stage: client?.current_stage ?? "S1",
    client_status: client?.client_status ?? "active",
    consultation_status: client?.consultation_status ?? "尚未回覆",
    estimated_value: client?.estimated_value ?? undefined,
  };
}

function ClientForm({
  mode,
  token,
  client,
  userRole,
  consultants,
  defaultConsultantId,
  onCreated,
  onUpdated,
}: {
  mode: "create" | "edit";
  token: string;
  client?: ClientDetail;
  userRole: User["role"];
  consultants: ConsultantAnalytics[];
  defaultConsultantId?: number;
  onCreated?: (id: number) => void;
  onUpdated?: () => void;
}) {
  const [payload, setPayload] = useState<ClientPayload>(() => clientToPayload(client, defaultConsultantId ?? consultants[0]?.consultant_id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const computedAge = calculateAgeFromBirthDate(payload.birth_date);
  const computedZodiac = zodiacFromBirthDate(payload.birth_date);

  useEffect(() => {
    setPayload(clientToPayload(client, defaultConsultantId ?? consultants[0]?.consultant_id));
    setSaved(false);
    setError("");
  }, [client?.id, defaultConsultantId, consultants]);

  function setField<K extends keyof ClientPayload>(key: K, value: ClientPayload[K]) {
    setPayload((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const cleaned = compactPayload(payload);
      if (!cleaned.name) {
        throw new Error("請填寫客戶姓名");
      }
      if (userRole === "admin" && !cleaned.assigned_consultant_id) {
        throw new Error("請選擇負責咨詢師");
      }
      if (mode === "create") {
        const response = await createClient(token, cleaned);
        onCreated?.(response.id);
      } else if (client) {
        await updateClient(token, client.id, cleaned);
        setSaved(true);
        onUpdated?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="form-label mb-0">
          客戶姓名
          <input className="field" value={payload.name} onChange={(event) => setField("name", event.target.value)} required />
        </label>
        <label className="form-label mb-0">
          電話
          <input className="field" value={payload.phone ?? ""} onChange={(event) => setField("phone", event.target.value)} />
        </label>
        <label className="form-label mb-0">
          Line ID
          <input className="field" value={payload.line_id ?? ""} onChange={(event) => setField("line_id", event.target.value)} />
        </label>
        <label className="form-label mb-0">
          Email
          <input className="field" type="email" value={payload.email ?? ""} onChange={(event) => setField("email", event.target.value)} />
        </label>
        <label className="form-label mb-0">
          性別
          <select className="field" value={payload.gender ?? ""} onChange={(event) => setField("gender", event.target.value)}>
            <option value="">未填</option>
            <option value="female">女性</option>
            <option value="male">男性</option>
            <option value="other">其他</option>
          </select>
        </label>
        <label className="form-label mb-0">
          出生年月日
          <input
            className="field"
            type="text"
            inputMode="numeric"
            placeholder="YYYY-MM-DD"
            value={payload.birth_date ?? ""}
            onChange={(event) => setField("birth_date", event.target.value || undefined)}
          />
          <div className="mt-1 text-xs text-ink/50">
            {computedAge === null
              ? "系統會自動推算年齡與星座"
              : `系統推算：${computedAge} 歲${computedZodiac ? ` · ${computedZodiac}` : ""}`}
          </div>
        </label>
        <label className="form-label mb-0">
          客戶來源
          <input className="field" value={payload.source ?? ""} onChange={(event) => setField("source", event.target.value)} />
        </label>
        <label className="form-label mb-0">
          目前階段
          <select className="field" value={payload.current_stage ?? "S1"} onChange={(event) => setField("current_stage", event.target.value as Stage)}>
            {stages.map((item) => <option key={item} value={item}>{item} {stageLabels[item]}</option>)}
          </select>
        </label>
        {userRole === "admin" && (
          <label className="form-label mb-0">
            負責咨詢師
            <select
              className="field"
              value={payload.assigned_consultant_id ?? ""}
              onChange={(event) => setField("assigned_consultant_id", event.target.value ? Number(event.target.value) : undefined)}
            >
              <option value="">選擇咨詢師</option>
              {consultants.map((item) => (
                <option key={item.consultant_id} value={item.consultant_id}>{item.consultant_name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="form-label mb-0 xl:col-span-2">
          感興趣療程
          <input className="field" value={payload.interested_treatment ?? ""} onChange={(event) => setField("interested_treatment", event.target.value)} />
        </label>
        <label className="form-label mb-0">
          預算範圍
          <input className="field" value={payload.budget_range ?? ""} onChange={(event) => setField("budget_range", event.target.value)} />
        </label>
        <label className="form-label mb-0">
          預估金額
          <input
            className="field"
            type="number"
            min={0}
            value={payload.estimated_value ?? ""}
            onChange={(event) => setField("estimated_value", event.target.value ? Number(event.target.value) : undefined)}
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-[180px_1fr]">
        <label className="form-label mb-0">
          咨詢狀態
          <select
            className="field"
            value={payload.consultation_status ?? "尚未回覆"}
            onChange={(event) => setField("consultation_status", event.target.value as ClientPayload["consultation_status"])}
          >
            {consultationStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="form-label mb-0">
          初步需求
          <textarea
            className="field min-h-24"
            value={payload.initial_need ?? ""}
            onChange={(event) => setField("initial_need", event.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 border-t border-ink/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5 text-sm">
          {error && <span className="text-oxide">{error}</span>}
          {saved && <span className="text-clinic">已更新客戶資料</span>}
        </div>
        <button className="button-primary gap-2" disabled={saving}>
          {mode === "create" ? <Plus size={16} /> : <Save size={16} />}
          {saving ? "儲存中..." : mode === "create" ? "建立客戶" : "儲存基本資料"}
        </button>
      </div>
    </form>
  );
}

function StageUpdateForm({ token, clientId, currentStage, onDone }: { token: string; clientId: number; currentStage: Stage; onDone: () => void }) {
  const [stage, setStage] = useState<Stage>(currentStage);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateClientStage(token, clientId, { to_stage: stage, reason });
      setReason("");
      setSaved(true);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "階段更新失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-2" onSubmit={submit}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select className="field sm:w-40" value={stage} onChange={(event) => { setStage(event.target.value as Stage); setSaved(false); }}>
          {stages.map((item) => <option key={item} value={item}>{item} {stageLabels[item]}</option>)}
        </select>
        <input className="field sm:w-56" placeholder="變更原因" value={reason} onChange={(event) => { setReason(event.target.value); setSaved(false); }} />
        <button className="button-primary" disabled={saving}>{saving ? "更新中..." : "更新階段"}</button>
      </div>
      {error && <InlineMessage tone="error">{error}</InlineMessage>}
      {saved && <InlineMessage tone="success">階段已更新</InlineMessage>}
    </form>
  );
}

function FollowUpForm({
  token,
  clientId,
  editingItem,
  onDone,
  onCancelEdit,
}: {
  token: string;
  clientId: number;
  editingItem: FollowUpItem | null;
  onDone: () => void;
  onCancelEdit: () => void;
}) {
  const [method, setMethod] = useState<ContactMethod>("line");
  const [content, setContent] = useState("");
  const [response, setResponse] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextAt, setNextAt] = useState("");
  const [needAdminSupport, setNeedAdminSupport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!editingItem) {
      setMethod("line");
      setContent("");
      setResponse("");
      setNextAction("");
      setNextAt("");
      setNeedAdminSupport(false);
      setError("");
      setSaved(false);
      return;
    }
    setMethod(editingItem.contact_method);
    setContent(editingItem.content);
    setResponse(editingItem.client_response ?? "");
    setNextAction(editingItem.next_action ?? "");
    setNextAt(toDateTimeInputValue(editingItem.next_follow_up_at));
    setNeedAdminSupport(editingItem.need_admin_support);
    setError("");
    setSaved(false);
  }, [editingItem]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const payload = {
        contact_method: method,
        content,
        client_response: response || undefined,
        next_action: nextAction || undefined,
        next_follow_up_at: nextAt ? new Date(nextAt).toISOString() : undefined,
        need_admin_support: needAdminSupport,
      };
      if (editingItem) {
        await updateFollowUp(token, editingItem.id, payload);
      } else {
        await createFollowUp(token, clientId, payload);
      }
      setMethod("line");
      setContent("");
      setResponse("");
      setNextAction("");
      setNextAt("");
      setNeedAdminSupport(false);
      setSaved(true);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : editingItem ? "追蹤紀錄更新失敗" : "追蹤紀錄新增失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <select className="field" value={method} onChange={(event) => setMethod(event.target.value as ContactMethod)}>
        {contactMethods.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <textarea className="field min-h-24" placeholder="追蹤內容" value={content} onChange={(event) => setContent(event.target.value)} required />
      <textarea className="field min-h-20" placeholder="客戶反應" value={response} onChange={(event) => setResponse(event.target.value)} />
      <input className="field" placeholder="下一步行動" value={nextAction} onChange={(event) => setNextAction(event.target.value)} />
      <input className="field" type="datetime-local" value={nextAt} onChange={(event) => setNextAt(event.target.value)} />
      <label className="flex items-center gap-2 text-sm text-ink/70">
        <input type="checkbox" checked={needAdminSupport} onChange={(event) => setNeedAdminSupport(event.target.checked)} />
        <span>需要主控者協助</span>
      </label>
      {error && <InlineMessage tone="error">{error}</InlineMessage>}
      {saved && <InlineMessage tone="success">{editingItem ? "追蹤紀錄已更新" : "追蹤紀錄已新增"}</InlineMessage>}
      <div className="flex gap-3">
        {editingItem ? (
          <button type="button" className="button-secondary flex-1" onClick={onCancelEdit} disabled={saving}>
            取消編輯
          </button>
        ) : null}
        <button className="button-primary flex-1" disabled={saving}>
          {saving ? (editingItem ? "更新中..." : "新增中...") : (editingItem ? "更新追蹤" : "新增追蹤")}
        </button>
      </div>
    </form>
  );
}

function BarrierForm({ token, clientId, onDone }: { token: string; clientId: number; onDone: () => void }) {
  const [type, setType] = useState("價格猶豫");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await createBarrier(token, clientId, { barrier_type: type, description, status: "unresolved" });
      setDescription("");
      setSaved(true);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "決策障礙新增失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto]">
        <select className="field" value={type} onChange={(event) => { setType(event.target.value); setSaved(false); }}>
          {["價格猶豫", "擔心風險", "時間安排困難", "家人或伴侶反對", "信任不足", "療程理解不足", "正在比較其他診所", "效果期待不確定", "其他"].map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <input className="field" placeholder="補充說明" value={description} onChange={(event) => { setDescription(event.target.value); setSaved(false); }} />
        <button className="button-secondary" disabled={saving}>{saving ? "新增中..." : "新增"}</button>
      </div>
      {error && <InlineMessage tone="error">{error}</InlineMessage>}
      {saved && <InlineMessage tone="success">決策障礙已新增</InlineMessage>}
    </form>
  );
}

function Timeline({
  followUps,
  onEdit,
  editingFollowUpId,
}: {
  followUps: FollowUpItem[];
  onEdit: (id: number) => void;
  editingFollowUpId: number | null;
}) {
  if (followUps.length === 0) return <EmptyText>尚無追蹤紀錄</EmptyText>;
  return (
    <div className="space-y-4">
      {followUps.map((item) => (
        <div key={item.id} className="border-l-2 border-clinic/30 pl-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-clinic/10 px-2 py-1 text-xs font-semibold text-clinic">{item.contact_method}</span>
            <span className="text-sm text-ink/50">{formatDate(item.created_at)}</span>
            <button
              type="button"
              className={classNames(
                "ml-auto inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold transition",
                editingFollowUpId === item.id ? "border-clinic/20 bg-clinic/10 text-clinic" : "border-ink/10 text-ink/70 hover:border-clinic/30 hover:text-clinic",
              )}
              onClick={() => onEdit(item.id)}
            >
              <Pencil size={12} />
              編輯
            </button>
          </div>
          <div className="mt-2 font-semibold">{item.content}</div>
          {item.client_response && <div className="mt-1 text-sm text-ink/60">{item.client_response}</div>}
          {item.next_action && <div className="mt-1 text-sm text-ink/55">下一步：{item.next_action}</div>}
          {item.next_follow_up_at && <div className="mt-2 text-sm text-brass">下次追蹤：{formatDate(item.next_follow_up_at)}</div>}
          {item.need_admin_support && <div className="mt-2 text-xs font-semibold text-oxide">需要主控者協助</div>}
        </div>
      ))}
    </div>
  );
}

function StageBadge({ stage }: { stage: Stage }) {
  return <span className="inline-flex w-fit items-center rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-paper">{stage}</span>;
}

function EmptyText({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-dashed border-ink/15 bg-paper p-4 text-sm text-ink/45">{children}</div>;
}

function ErrorPanel({ message }: { message: string }) {
  return <div className="rounded-md border border-oxide/20 bg-oxide/10 p-4 text-sm text-oxide">{message}</div>;
}

function InlineMessage({ children, tone }: { children: ReactNode; tone: "error" | "success" }) {
  return (
    <div className={classNames(
      "rounded-md border px-3 py-2 text-sm",
      tone === "error" ? "border-oxide/20 bg-oxide/10 text-oxide" : "border-clinic/20 bg-clinic/10 text-clinic",
    )}>
      {children}
    </div>
  );
}
