from enum import Enum
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class UIState(str, Enum):
    """参与者 UI 状态机"""
    CHECKIN = "CHECKIN"
    WAITING = "WAITING"
    MATCHED = "MATCHED"
    ENDING = "ENDING"
    FEEDBACK = "FEEDBACK"
    PAUSED = "PAUSED"


class ParticipantType(str, Enum):
    """参与者类型"""
    PARTICIPANT = "PARTICIPANT"
    HOST = "HOST"


class EventType(str, Enum):
    """实时事件类型"""
    EVENT_STATUS_CHANGED = "EVENT_STATUS_CHANGED"
    ROUND_STARTED = "ROUND_STARTED"
    MATCH_ASSIGNED = "MATCH_ASSIGNED"
    ROUND_ENDING_SOON = "ROUND_ENDING_SOON"
    ROUND_ENDED = "ROUND_ENDED"
    RECOVER_STATE = "RECOVER_STATE"


# ============ Request/Response Models ============

class CheckInRequest(BaseModel):
    """签到请求"""
    participant_id: str
    event_id: str
    name: str


class FeedbackRequest(BaseModel):
    """反馈请求"""
    participant_id: str
    round_id: str
    partner_id: str
    rating: int = Field(ge=1, le=5)
    notes: Optional[str] = None


class ParticipantState(BaseModel):
    """参与者状态响应"""
    participant_id: str
    ui_state: UIState
    round_id: Optional[str]
    match_partner: Optional[str]
    ends_at: Optional[datetime]


class RoundStartRequest(BaseModel):
    """开始轮次请求"""
    event_id: str
    duration_seconds: int


class RoundEndRequest(BaseModel):
    """结束轮次请求"""
    event_id: str
    round_id: str


class PauseRoundRequest(BaseModel):
    """暂停轮次请求"""
    event_id: str
    round_id: str


class ResumeRoundRequest(BaseModel):
    """恢复轮次请求"""
    event_id: str
    round_id: str


class RealtimeEvent(BaseModel):
    """实时事件消息"""
    type: EventType
    timestamp: datetime
    data: dict


class HostAction(BaseModel):
    """主持人操作记录"""
    event_id: str
    host_id: str
    action_type: str
    round_id: Optional[str]
    details: Optional[dict]
    created_at: datetime
