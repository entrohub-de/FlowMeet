"""
Session Orchestrator - 流程引擎
负责管理整个 networking 活动的状态流转和轮次控制
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List
from ..types.models import UIState, EventType, RealtimeEvent


class SessionOrchestrator:
    """
    流程引擎
    驱动参与者状态机
    """
    
    def __init__(self, redis_client, db_session):
        self.redis = redis_client
        self.db = db_session
    
    def start_round(self, event_id: str, duration_seconds: int) -> Dict:
        """
        开始轮次
        - 生成 round_id
        - 计算 ends_at
        - 调用 Matching Engine
        - 推送所有参与者 MATCH_ASSIGNED
        """
        round_id = self._generate_round_id(event_id)
        ends_at = datetime.utcnow() + timedelta(seconds=duration_seconds)
        
        # 存储轮次信息
        round_info = {
            "round_id": round_id,
            "event_id": event_id,
            "status": "ACTIVE",
            "starts_at": datetime.utcnow().isoformat(),
            "ends_at": ends_at.isoformat(),
            "duration_seconds": duration_seconds,
        }
        
        self.redis.hset(f"round:{round_id}", mapping=round_info)
        
        return {
            "round_id": round_id,
            "ends_at": ends_at,
            "status": "STARTED"
        }
    
    def end_round(self, event_id: str, round_id: str) -> Dict:
        """
        结束轮次
        - 更新轮次状态
        - 参与者转入 FEEDBACK / WAITING
        """
        self.redis.hset(f"round:{round_id}", "status", "ENDED")
        
        return {
            "round_id": round_id,
            "status": "ENDED"
        }
    
    def pause_round(self, event_id: str, round_id: str) -> Dict:
        """
        暂停轮次
        - 保存当前剩余时间
        - 参与者转入 PAUSED
        """
        self.redis.hset(f"round:{round_id}", "status", "PAUSED")
        
        return {
            "round_id": round_id,
            "status": "PAUSED"
        }
    
    def resume_round(self, event_id: str, round_id: str) -> Dict:
        """
        恢复轮次
        - 恢复 ends_at
        - 参与者恢复原状态
        """
        self.redis.hset(f"round:{round_id}", "status", "ACTIVE")
        
        return {
            "round_id": round_id,
            "status": "RESUMED"
        }
    
    def update_participant_state(self, participant_id: str, new_state: UIState, 
                                round_id: Optional[str] = None, 
                                match_partner: Optional[str] = None,
                                ends_at: Optional[datetime] = None) -> Dict:
        """
        更新参与者状态
        只有 Orchestrator 能改状态
        """
        state_key = f"participant:{participant_id}:state"
        state_data = {
            "ui_state": new_state.value,
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        if round_id:
            state_data["round_id"] = round_id
        if match_partner:
            state_data["match_partner"] = match_partner
        if ends_at:
            state_data["ends_at"] = ends_at.isoformat()
        
        self.redis.hset(state_key, mapping=state_data)
        
        return state_data
    
    def get_participant_state(self, participant_id: str) -> Optional[Dict]:
        """
        获取参与者状态
        """
        state_key = f"participant:{participant_id}:state"
        return self.redis.hgetall(state_key) or None
    
    def _generate_round_id(self, event_id: str) -> str:
        """
        生成轮次 ID
        格式: event_id:timestamp:sequence
        """
        counter = self.redis.incr(f"event:{event_id}:round_counter")
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        return f"{event_id}:R{counter:03d}:{timestamp}"
