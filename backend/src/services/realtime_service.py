"""
Realtime Service - 实时通信服务
使用 SSE 推送实时事件
"""

from typing import Optional, Dict, Callable
from datetime import datetime
from ..types.models import RealtimeEvent, EventType
import asyncio
import json


class RealtimeService:
    """
    实时通信服务
    
    推荐方案：SSE 作为主推送通道
    """
    
    def __init__(self, redis_client):
        self.redis = redis_client
        # {client_id: async_queue}
        self.subscribers: Dict[str, asyncio.Queue] = {}
    
    async def subscribe(self, client_id: str) -> asyncio.Queue:
        """
        订阅实时事件
        返回 Queue，客户端持续轮询获取事件
        """
        queue = asyncio.Queue()
        self.subscribers[client_id] = queue
        return queue
    
    async def unsubscribe(self, client_id: str):
        """
        取消订阅
        """
        if client_id in self.subscribers:
            del self.subscribers[client_id]
    
    async def publish_event(self, event: RealtimeEvent, 
                          target_ids: Optional[list] = None):
        """
        发布事件到订阅者
        """
        # 如果指定了目标 ID，只推送给指定的客户端
        targets = target_ids or list(self.subscribers.keys())
        
        event_json = json.dumps({
            "type": event.type.value,
            "timestamp": event.timestamp.isoformat(),
            "data": event.data,
        })
        
        # 推送给所有订阅者
        for client_id in targets:
            if client_id in self.subscribers:
                try:
                    await self.subscribers[client_id].put_nowait(event_json)
                except asyncio.QueueFull:
                    # 队列满，丢弃消息或移除订阅者
                    await self.unsubscribe(client_id)
    
    async def broadcast_event(self, event_type: EventType, data: dict):
        """
        广播事件给所有订阅者
        """
        event = RealtimeEvent(
            type=event_type,
            timestamp=datetime.utcnow(),
            data=data
        )
        await self.publish_event(event)
    
    async def send_to_participant(self, participant_id: str, 
                                 event_type: EventType, data: dict):
        """
        发送事件给特定参与者
        """
        event = RealtimeEvent(
            type=event_type,
            timestamp=datetime.utcnow(),
            data=data
        )
        await self.publish_event(event, target_ids=[participant_id])
