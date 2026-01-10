"""
Presence Service - 在线状态服务
管理参与者的在线/离线状态
"""

from datetime import datetime
from typing import List, Dict


class PresenceService:
    """
    在线状态服务
    
    约束：
    - Redis 记录 last_seen
    - 超过 30s 视为 offline
    """
    
    OFFLINE_THRESHOLD = 30  # seconds
    
    def __init__(self, redis_client, offline_threshold: int = 30):
        self.redis = redis_client
        self.offline_threshold = offline_threshold
    
    def mark_online(self, participant_id: str, event_id: str):
        """
        标记参与者在线
        """
        now = datetime.utcnow().timestamp()
        
        # 记录最后一次活动时间
        presence_key = f"event:{event_id}:participant:{participant_id}:last_seen"
        self.redis.set(presence_key, now)
        
        # 添加到在线集合
        online_key = f"event:{event_id}:online"
        self.redis.sadd(online_key, participant_id)
    
    def is_online(self, participant_id: str, event_id: str) -> bool:
        """
        检查参与者是否在线
        """
        presence_key = f"event:{event_id}:participant:{participant_id}:last_seen"
        last_seen = self.redis.get(presence_key)
        
        if not last_seen:
            return False
        
        now = datetime.utcnow().timestamp()
        last_seen_ts = float(last_seen)
        
        return (now - last_seen_ts) < self.offline_threshold
    
    def get_online_participants(self, event_id: str) -> List[str]:
        """
        获取在线的参与者
        """
        online_key = f"event:{event_id}:online"
        online_set = self.redis.smembers(online_key)
        
        # 过滤掉超时的
        active = []
        now = datetime.utcnow().timestamp()
        
        for participant_id in online_set:
            presence_key = f"event:{event_id}:participant:{participant_id}:last_seen"
            last_seen = self.redis.get(presence_key)
            
            if last_seen and (now - float(last_seen)) < self.offline_threshold:
                active.append(participant_id)
            else:
                # 移除离线的
                self.redis.srem(online_key, participant_id)
        
        return active
    
    def mark_offline(self, participant_id: str, event_id: str):
        """
        标记参与者离线
        """
        online_key = f"event:{event_id}:online"
        self.redis.srem(online_key, participant_id)
