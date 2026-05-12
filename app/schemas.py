from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import (
    BarrierStatus,
    ClientStatus,
    ConsultationStatus,
    ContactMethod,
    NotificationStatus,
    Stage,
    UserRole,
)


class TokenUser(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    token: str
    user: TokenUser


class AssignedConsultant(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class ClientBase(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    phone: str | None = None
    line_id: str | None = None
    email: EmailStr | None = None
    gender: str | None = None
    age: int | None = Field(default=None, ge=0, le=130)
    source: str | None = None
    interested_treatment: str | None = None
    initial_need: str | None = None
    budget_range: str | None = None
    final_treatment_plan: str | None = None
    actual_deal_value: float | None = Field(default=None, ge=0)
    payment_status: str | None = None
    treatment_date: datetime | None = None
    consent_signed: bool | None = None
    preop_completed: bool | None = None
    treatment_started: bool | None = None
    assigned_consultant_id: int | None = None
    current_stage: Stage | None = None
    client_status: ClientStatus | None = None
    consultation_status: ConsultationStatus | None = None
    estimated_value: float | None = Field(default=None, ge=0)


class ClientCreate(ClientBase):
    name: str = Field(max_length=120)
    assigned_consultant_id: int | None = None


class ClientUpdate(ClientBase):
    pass


class ClientListItem(BaseModel):
    id: int
    name: str
    phone: str | None
    line_id: str | None
    assigned_consultant: AssignedConsultant
    current_stage: Stage
    client_status: ClientStatus
    consultation_status: ConsultationStatus
    estimated_value: float | None
    next_follow_up_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Pagination(BaseModel):
    page: int
    limit: int
    total: int


class ClientListResponse(BaseModel):
    data: list[ClientListItem]
    pagination: Pagination


class ClientSummaryResponse(BaseModel):
    data: list[ClientListItem]


class ClientDetail(BaseModel):
    id: int
    name: str
    phone: str | None
    line_id: str | None
    email: EmailStr | None
    gender: str | None
    age: int | None
    source: str | None
    interested_treatment: str | None
    initial_need: str | None
    budget_range: str | None
    final_treatment_plan: str | None
    actual_deal_value: float | None
    payment_status: str | None
    treatment_date: datetime | None
    consent_signed: bool
    preop_completed: bool
    treatment_started: bool
    assigned_consultant: AssignedConsultant
    current_stage: Stage
    client_status: ClientStatus
    consultation_status: ConsultationStatus
    estimated_value: float | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    message: str


class CreatedResponse(MessageResponse):
    id: int


class StageUpdate(BaseModel):
    to_stage: Stage
    reason: str | None = None
    note: str | None = None


class StageUpdateResponse(MessageResponse):
    client_id: int
    from_stage: Stage
    to_stage: Stage


class StageLogItem(BaseModel):
    id: int
    from_stage: Stage | None
    to_stage: Stage
    changed_by: AssignedConsultant
    reason: str | None
    note: str | None
    created_at: datetime


class StageLogResponse(BaseModel):
    data: list[StageLogItem]


class FollowUpCreate(BaseModel):
    contact_method: ContactMethod
    content: str
    client_response: str | None = None
    next_action: str | None = None
    next_follow_up_at: datetime | None = None
    need_admin_support: bool = False


class FollowUpItem(BaseModel):
    id: int
    contact_method: ContactMethod
    content: str
    client_response: str | None
    next_action: str | None
    next_follow_up_at: datetime | None
    need_admin_support: bool
    created_by: AssignedConsultant
    created_at: datetime


class FollowUpResponse(BaseModel):
    data: list[FollowUpItem]


class FollowUpDueItem(BaseModel):
    client_id: int
    client_name: str
    current_stage: Stage
    assigned_consultant: AssignedConsultant
    next_follow_up_at: datetime
    last_follow_up_at: datetime
    overdue_days: int | None = None


class FollowUpDueResponse(BaseModel):
    data: list[FollowUpDueItem]


class DecisionBarrierCreate(BaseModel):
    barrier_type: str = Field(max_length=120)
    description: str | None = None
    status: BarrierStatus = BarrierStatus.unresolved


class DecisionBarrierUpdate(BaseModel):
    barrier_type: str | None = Field(default=None, max_length=120)
    description: str | None = None
    status: BarrierStatus | None = None


class DecisionBarrierItem(BaseModel):
    id: int
    client_id: int
    barrier_type: str
    description: str | None
    status: BarrierStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DecisionBarrierResponse(BaseModel):
    data: list[DecisionBarrierItem]


class BarrierAnalyticsItem(BaseModel):
    barrier_type: str
    count: int
    percentage: float


class BarrierAnalyticsResponse(BaseModel):
    data: list[BarrierAnalyticsItem]


class NotificationCreate(BaseModel):
    receiver_id: int
    client_id: int | None = None
    message: str


class NotificationClient(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class NotificationItem(BaseModel):
    id: int
    message: str
    status: NotificationStatus
    client: NotificationClient | None
    sender: AssignedConsultant
    receiver: AssignedConsultant
    created_at: datetime


class NotificationListResponse(BaseModel):
    data: list[NotificationItem]
    pagination: Pagination


class AdminNoteCreate(BaseModel):
    content: str = Field(min_length=1)


class AdminNoteUpdate(BaseModel):
    content: str = Field(min_length=1)


class AdminNoteItem(BaseModel):
    id: int
    client_id: int
    content: str
    author: AssignedConsultant
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminNoteListResponse(BaseModel):
    data: list[AdminNoteItem]


class AnalyticsOverviewResponse(BaseModel):
    total_clients: int
    new_clients_this_month: int
    active_clients: int
    s6_clients_this_month: int
    estimated_revenue: float
    overdue_followups: int
    stagnant_clients: int


class FunnelStageItem(BaseModel):
    stage: Stage
    name: str
    count: int


class FunnelConversionRate(BaseModel):
    from_stage: Stage = Field(serialization_alias="from")
    to_stage: Stage = Field(serialization_alias="to")
    rate: float


class AnalyticsFunnelResponse(BaseModel):
    stages: list[FunnelStageItem]
    conversion_rates: list[FunnelConversionRate]


class ConsultantAnalyticsItem(BaseModel):
    consultant_id: int
    consultant_name: str
    total_clients: int
    new_clients: int
    stage_distribution: dict[str, int]
    average_follow_up_gap_days: float
    overdue_followups: int
    s6_clients: int
    estimated_revenue: float
    conversion_rate_s1_to_s6: float


class AnalyticsConsultantsResponse(BaseModel):
    data: list[ConsultantAnalyticsItem]


class RevenueTrendItem(BaseModel):
    month: str
    estimated_revenue: float
    confirmed_revenue: float
    s6_clients: int


class AnalyticsRevenueResponse(BaseModel):
    estimated_revenue: float
    confirmed_revenue: float
    data: list[RevenueTrendItem]


class ConsultantDashboardResponse(BaseModel):
    consultant: AssignedConsultant
    today_followups: list[FollowUpDueItem]
    overdue_followups: list[FollowUpDueItem]
    recent_clients: list[ClientListItem]
    upcoming_s6_clients: list[ClientListItem]
    unread_notifications: list[NotificationItem]
    stage_distribution: dict[str, int]
