from enum import StrEnum


class UserRole(StrEnum):
    admin = "admin"
    consultant = "consultant"


class UserStatus(StrEnum):
    active = "active"
    inactive = "inactive"


class Stage(StrEnum):
    S1 = "S1"
    S2 = "S2"
    S3 = "S3"
    S4 = "S4"
    S5 = "S5"
    S6 = "S6"


class ClientStatus(StrEnum):
    active = "active"
    paused = "paused"
    completed = "completed"
    lost = "lost"
    archived = "archived"


class ConsultationStatus(StrEnum):
    no_reply = "尚未回覆"
    interested = "有興趣"
    paused = "暫緩"
    lost_contact = "失聯"


class ContactMethod(StrEnum):
    phone = "phone"
    line = "line"
    onsite = "onsite"
    email = "email"


class BarrierStatus(StrEnum):
    unresolved = "unresolved"
    resolved = "resolved"


class NotificationStatus(StrEnum):
    unread = "unread"
    read = "read"
