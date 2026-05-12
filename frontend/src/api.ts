import type {
  AdminNoteItem,
  AnalyticsFunnel,
  AnalyticsOverview,
  AnalyticsRevenue,
  BarrierAnalytics,
  BarrierStatus,
  ClientDetail,
  ClientListResponse,
  ClientPayload,
  ClientStatus,
  ConsultantAnalytics,
  ConsultantDashboard,
  ContactMethod,
  DecisionBarrier,
  FollowUpItem,
  NotificationListResponse,
  Stage,
  StageLogItem,
  User,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.detail ?? "API request failed");
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  return request<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function me(token: string) {
  return request<User>("/auth/me", {}, token);
}

export async function getConsultantDashboard(token: string) {
  return request<ConsultantDashboard>("/dashboard/consultant", {}, token);
}

export async function getClients(
  token: string,
  params: { keyword?: string; stage?: string; status?: ClientStatus; overdue?: boolean; consultantId?: number | null } = {},
) {
  const search = new URLSearchParams();
  if (params.keyword) search.set("keyword", params.keyword);
  if (params.stage) search.set("stage", params.stage);
  if (params.status) search.set("status", params.status);
  if (params.overdue) search.set("overdue", "true");
  if (params.consultantId) search.set("consultant_id", String(params.consultantId));
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<ClientListResponse>(`/clients${suffix}`, {}, token);
}

export async function getClient(token: string, clientId: number) {
  return request<ClientDetail>(`/clients/${clientId}`, {}, token);
}

export async function createClient(token: string, payload: ClientPayload) {
  return request<{ id: number; message: string }>(
    "/clients",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updateClient(token: string, clientId: number, payload: Partial<ClientPayload>) {
  return request<{ message: string }>(
    `/clients/${clientId}`,
    { method: "PUT", body: JSON.stringify(payload) },
    token,
  );
}

export async function archiveClient(token: string, clientId: number) {
  return request<{ message: string }>(
    `/clients/${clientId}`,
    { method: "DELETE" },
    token,
  );
}

export async function restoreClient(token: string, clientId: number) {
  return updateClient(token, clientId, { client_status: "active" });
}

export async function updateClientStage(
  token: string,
  clientId: number,
  payload: { to_stage: Stage; reason?: string; note?: string },
) {
  return request<{ message: string }>(
    `/clients/${clientId}/stage`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function getFollowUps(token: string, clientId: number) {
  return request<{ data: FollowUpItem[] }>(`/clients/${clientId}/follow-ups`, {}, token);
}

export async function getOverdueFollowUps(
  token: string,
  params: { consultantId?: number | null; days?: number; stage?: Stage } = {},
) {
  const search = new URLSearchParams();
  if (params.consultantId) search.set("consultant_id", String(params.consultantId));
  if (params.days !== undefined) search.set("days", String(params.days));
  if (params.stage) search.set("stage", params.stage);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<{ data: Array<{
    client_id: number;
    client_name: string;
    current_stage: Stage;
    assigned_consultant: { id: number; name: string };
    next_follow_up_at: string;
    last_follow_up_at: string;
    overdue_days: number | null;
  }> }>(`/follow-ups/overdue${suffix}`, {}, token);
}

export async function createFollowUp(
  token: string,
  clientId: number,
  payload: {
    contact_method: ContactMethod;
    content: string;
    client_response?: string;
    next_action?: string;
    next_follow_up_at?: string;
    need_admin_support?: boolean;
  },
) {
  return request<{ id: number; message: string }>(
    `/clients/${clientId}/follow-ups`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function getStageLogs(token: string, clientId: number) {
  return request<{ data: StageLogItem[] }>(`/clients/${clientId}/stage-logs`, {}, token);
}

export async function getBarriers(token: string, clientId: number) {
  return request<{ data: DecisionBarrier[] }>(`/clients/${clientId}/barriers`, {}, token);
}

export async function getAdminNotes(token: string, clientId: number) {
  return request<{ data: AdminNoteItem[] }>(`/clients/${clientId}/admin-notes`, {}, token);
}

export async function createAdminNote(token: string, clientId: number, payload: { content: string }) {
  return request<{ id: number; message: string }>(
    `/clients/${clientId}/admin-notes`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updateAdminNote(token: string, noteId: number, payload: { content: string }) {
  return request<{ message: string }>(
    `/admin-notes/${noteId}`,
    { method: "PUT", body: JSON.stringify(payload) },
    token,
  );
}

export async function createBarrier(
  token: string,
  clientId: number,
  payload: { barrier_type: string; description?: string; status?: "unresolved" | "resolved" },
) {
  return request<{ id: number; message: string }>(
    `/clients/${clientId}/barriers`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updateBarrier(
  token: string,
  barrierId: number,
  payload: { barrier_type?: string; description?: string; status?: BarrierStatus },
) {
  return request<{ message: string }>(
    `/barriers/${barrierId}`,
    { method: "PUT", body: JSON.stringify(payload) },
    token,
  );
}

export async function getNotifications(token: string, status?: "unread" | "read") {
  const suffix = status ? `?status=${status}` : "";
  return request<NotificationListResponse>(`/notifications${suffix}`, {}, token);
}

export async function createNotification(
  token: string,
  payload: { receiver_id: number; client_id?: number; message: string },
) {
  return request<{ id: number; message: string }>(
    "/notifications",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function markNotificationRead(token: string, notificationId: number) {
  return request<{ message: string }>(
    `/notifications/${notificationId}/read`,
    { method: "PUT", body: JSON.stringify({}) },
    token,
  );
}

function consultantQuery(consultantId?: number | null) {
  return consultantId ? `?consultant_id=${consultantId}` : "";
}

export async function getAnalyticsOverview(token: string, consultantId?: number | null) {
  return request<AnalyticsOverview>(`/analytics/overview${consultantQuery(consultantId)}`, {}, token);
}

export async function getAnalyticsFunnel(token: string, consultantId?: number | null) {
  return request<AnalyticsFunnel>(`/analytics/funnel${consultantQuery(consultantId)}`, {}, token);
}

export async function getAnalyticsConsultants(token: string) {
  return request<{ data: ConsultantAnalytics[] }>("/analytics/consultants", {}, token);
}

export async function getBarrierAnalytics(token: string, consultantId?: number | null) {
  return request<{ data: BarrierAnalytics[] }>(`/analytics/barriers${consultantQuery(consultantId)}`, {}, token);
}

export async function getAnalyticsRevenue(token: string, consultantId?: number | null) {
  return request<AnalyticsRevenue>(`/analytics/revenue${consultantQuery(consultantId)}`, {}, token);
}

export async function getStagnantClients(token: string, consultantId?: number | null, days = 14) {
  const search = new URLSearchParams();
  if (consultantId) search.set("consultant_id", String(consultantId));
  search.set("days", String(days));
  search.set("limit", "10");
  return request<ClientListResponse>(`/analytics/stagnant-clients?${search.toString()}`, {}, token);
}
