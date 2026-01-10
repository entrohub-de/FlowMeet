"""
Host API 路由
主持人端的 REST 端点
"""

from fastapi import APIRouter, HTTPException
from ..types.models import (
    RoundStartRequest, RoundEndRequest, 
    PauseRoundRequest, ResumeRoundRequest,
    HostAction
)
from datetime import datetime

router = APIRouter(prefix="/api/host", tags=["host"])


@router.post("/round/start")
async def start_round(request: RoundStartRequest):
    """
    开始轮次
    
    请求：
    - event_id
    - duration_seconds: 本轮时长
    
    返回：
    - round_id
    - ends_at: 轮次结束时间戳（绝对时间）
    - status: STARTED
    """
    # TODO: 实现开始轮次逻辑
    # 1. 验证事件
    # 2. 调用 SessionOrchestrator.start_round()
    # 3. 调用 MatchingEngine.match_participants()
    # 4. 通过 RealtimeService 推送 MATCH_ASSIGNED 给所有参与者
    # 5. 记录 HostAction
    
    return {
        "round_id": "event:R001:20240110120000",
        "ends_at": "2024-01-10T12:02:00Z",
        "status": "STARTED"
    }


@router.post("/round/end")
async def end_round(request: RoundEndRequest):
    """
    结束轮次
    
    请求：
    - event_id
    - round_id
    
    返回：
    - status: ENDED
    """
    # TODO: 实现结束轮次逻辑
    # 1. 验证轮次
    # 2. 调用 SessionOrchestrator.end_round()
    # 3. 推送 ROUND_ENDED 给参与者
    # 4. 参与者转入 FEEDBACK 状态
    
    return {
        "status": "ENDED",
        "round_id": request.round_id
    }


@router.post("/round/pause")
async def pause_round(request: PauseRoundRequest):
    """
    暂停轮次
    
    请求：
    - event_id
    - round_id
    
    返回：
    - status: PAUSED
    """
    # TODO: 实现暂停轮次逻辑
    # 1. 保存当前剩余时间
    # 2. 所有参与者转入 PAUSED 状态
    
    return {
        "status": "PAUSED",
        "round_id": request.round_id
    }


@router.post("/round/resume")
async def resume_round(request: ResumeRoundRequest):
    """
    恢复轮次
    
    请求：
    - event_id
    - round_id
    
    返回：
    - status: RESUMED
    """
    # TODO: 实现恢复轮次逻辑
    # 1. 重新计算 ends_at
    # 2. 所有参与者恢复原状态
    
    return {
        "status": "RESUMED",
        "round_id": request.round_id
    }


@router.get("/event/{event_id}/status")
async def get_event_status(event_id: str):
    """
    获取活动状态
    
    返回：
    - current_round_id
    - current_round_status
    - participant_count
    - online_count
    """
    # TODO: 实现获取状态逻辑
    
    return {
        "event_id": event_id,
        "current_round_id": None,
        "current_round_status": "IDLE",
        "participant_count": 0,
        "online_count": 0
    }


@router.get("/event/{event_id}/participants")
async def get_participants(event_id: str):
    """
    获取活动的所有参与者
    
    返回：
    - participants: [
        {
          "participant_id",
          "name",
          "ui_state",
          "is_online"
        }
      ]
    """
    # TODO: 实现获取参与者列表逻辑
    
    return {
        "event_id": event_id,
        "participants": []
    }
