"""
Participant API 路由
参与者端的 REST 端点
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from ..types.models import (
    CheckInRequest, FeedbackRequest, ParticipantState,
    UIState, EventType
)

router = APIRouter(prefix="/api/participant", tags=["participant"])


@router.post("/checkin")
async def checkin(request: CheckInRequest):
    """
    签到接口
    
    请求：
    - participant_id: 参与者 ID
    - event_id: 活动 ID
    - name: 参与者名字
    
    返回：
    - participant_id
    - ui_state: CHECKIN 或 WAITING
    """
    # TODO: 实现签到逻辑
    # 1. 验证 event_id
    # 2. 创建参与者记录
    # 3. 标记为在线
    # 4. 初始化状态为 WAITING（如果活动已开始）或 CHECKIN
    
    return {
        "participant_id": request.participant_id,
        "ui_state": UIState.WAITING.value
    }


@router.get("/state/{participant_id}")
async def get_state(participant_id: str, event_id: str = Query(...)):
    """
    获取参与者当前状态
    
    参数：
    - participant_id: 参与者 ID（路径参数）
    - event_id: 活动 ID（查询参数）
    
    返回：
    - participant_id
    - ui_state
    - round_id
    - match_partner
    - ends_at
    """
    # TODO: 从数据库/Redis 获取状态
    
    return {
        "participant_id": participant_id,
        "ui_state": UIState.WAITING.value,
        "round_id": None,
        "match_partner": None,
        "ends_at": None
    }


@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    """
    提交反馈
    
    请求：
    - participant_id
    - round_id
    - partner_id
    - rating: 1-5
    - notes: 可选备注
    
    返回：
    - status: success
    """
    # TODO: 实现反馈逻辑
    # 1. 验证参与者和轮次
    # 2. 保存反馈到数据库
    # 3. 更新参与者状态为 WAITING
    
    return {
        "status": "success",
        "message": "Feedback submitted"
    }


@router.post("/heartbeat")
async def heartbeat(participant_id: str = Query(...), event_id: str = Query(...)):
    """
    心跳接口
    标记参与者在线
    
    参数：
    - participant_id: 参与者 ID（查询参数）
    - event_id: 活动 ID（查询参数）
    
    返回：
    - status: ok
    - current_state: 最新状态（用于恢复）
    """
    # TODO: 实现心跳逻辑
    # 1. 更新 last_seen 时间戳
    # 2. 检查是否需要恢复状态
    
    return {
        "status": "ok",
        "current_state": {
            "ui_state": UIState.WAITING.value,
            "round_id": None,
            "match_partner": None,
        }
    }
