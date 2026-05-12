export type Role = "admin" | "consultant";
export type Stage = "S1" | "S2" | "S3" | "S4" | "S5" | "S6";
export type ClientStatus = "active" | "paused" | "completed" | "lost" | "archived";
export type ConsultationStatus = "尚未回覆" | "有興趣" | "暫緩" | "失聯";
export type ContactMethod = "phone" | "line" | "onsite" | "email";
export type BarrierStatus = "unresolved" | "resolved";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface AssignedConsultant {
  id: number;
  name: string;
}

export interface ClientListItem {
  id: number;
  name: string;
  phone: string | null;
  line_id: string | null;
  assigned_consultant: AssignedConsultant;
  current_stage: Stage;
  client_status: ClientStatus;
  consultation_status: ConsultationStatus;
  estimated_value: number | null;
  next_follow_up_at: string | null;
  created_at: string;
}

export interface ClientDetail extends ClientListItem {
  email: string | null;
  gender: string | null;
  age: number | null;
  source: string | null;
  interested_treatment: string | null;
  initial_need: string | null;
  budget_range: string | null;
  final_treatment_plan: string | null;
  actual_deal_value: number | null;
  payment_status: string | null;
  treatment_date: string | null;
  consent_signed: boolean;
  preop_completed: boolean;
  treatment_started: boolean;
  updated_at: string;
}

export interface ClientPayload {
  name: string;
  phone?: string;
  line_id?: string;
  email?: string;
  gender?: string;
  age?: number;
  source?: string;
  interested_treatment?: string;
  initial_need?: string;
  budget_range?: string;
  final_treatment_plan?: string;
  actual_deal_value?: number;
  payment_status?: string;
  treatment_date?: string;
  consent_signed?: boolean;
  preop_completed?: boolean;
  treatment_started?: boolean;
  assigned_consultant_id?: number;
  current_stage?: Stage;
  client_status?: ClientStatus;
  consultation_status?: ConsultationStatus;
  estimated_value?: number;
}

export interface ClientListPreset {
  key: number;
  stage?: Stage;
  status?: ClientStatus;
  overdue?: boolean;
}

export interface ClientListResponse {
  data: ClientListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface FollowUpDueItem {
  client_id: number;
  client_name: string;
  current_stage: Stage;
  assigned_consultant: AssignedConsultant;
  next_follow_up_at: string;
  last_follow_up_at: string;
  overdue_days: number | null;
}

export interface FollowUpItem {
  id: number;
  contact_method: ContactMethod;
  content: string;
  client_response: string | null;
  next_action: string | null;
  next_follow_up_at: string | null;
  need_admin_support: boolean;
  created_by: AssignedConsultant;
  created_at: string;
}

export interface StageLogItem {
  id: number;
  from_stage: Stage | null;
  to_stage: Stage;
  changed_by: AssignedConsultant;
  reason: string | null;
  note: string | null;
  created_at: string;
}

export interface DecisionBarrier {
  id: number;
  client_id: number;
  barrier_type: string;
  description: string | null;
  status: BarrierStatus;
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: number;
  message: string;
  status: "unread" | "read";
  client: { id: number; name: string } | null;
  sender: AssignedConsultant;
  receiver: AssignedConsultant;
  created_at: string;
}

export interface NotificationListResponse {
  data: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface AdminNoteItem {
  id: number;
  client_id: number;
  content: string;
  author: AssignedConsultant;
  created_at: string;
  updated_at: string;
}

export interface ConsultantDashboard {
  consultant: AssignedConsultant;
  today_followups: FollowUpDueItem[];
  overdue_followups: FollowUpDueItem[];
  recent_clients: ClientListItem[];
  upcoming_s6_clients: ClientListItem[];
  unread_notifications: NotificationItem[];
  stage_distribution: Record<Stage, number>;
}

export interface AnalyticsOverview {
  total_clients: number;
  new_clients_this_month: number;
  active_clients: number;
  s6_clients_this_month: number;
  estimated_revenue: number;
  overdue_followups: number;
  stagnant_clients: number;
}

export interface AnalyticsFunnel {
  stages: Array<{
    stage: Stage;
    name: string;
    count: number;
  }>;
  conversion_rates: Array<{
    from: Stage;
    to: Stage;
    rate: number;
  }>;
}

export interface ConsultantAnalytics {
  consultant_id: number;
  consultant_name: string;
  total_clients: number;
  new_clients: number;
  stage_distribution: Record<Stage, number>;
  average_follow_up_gap_days: number;
  overdue_followups: number;
  s6_clients: number;
  estimated_revenue: number;
  conversion_rate_s1_to_s6: number;
}

export interface BarrierAnalytics {
  barrier_type: string;
  count: number;
  percentage: number;
}

export interface AnalyticsRevenue {
  estimated_revenue: number;
  confirmed_revenue: number;
  data: Array<{
    month: string;
    estimated_revenue: number;
    confirmed_revenue: number;
    s6_clients: number;
  }>;
}
