"""
Feedback Service - 反馈服务
管理参与者反馈
"""

from datetime import datetime
from typing import Optional


class FeedbackService:
    """
    反馈服务
    """
    
    def __init__(self, db_session):
        self.db = db_session
    
    def submit_feedback(self, participant_id: str, round_id: str, 
                       partner_id: str, rating: int, 
                       notes: Optional[str] = None) -> dict:
        """
        提交反馈
        """
        feedback_data = {
            "participant_id": participant_id,
            "round_id": round_id,
            "partner_id": partner_id,
            "rating": rating,
            "notes": notes,
            "created_at": datetime.utcnow().isoformat(),
        }
        
        # TODO: 保存到数据库
        
        return feedback_data
    
    def get_feedback(self, round_id: str) -> list:
        """
        获取轮次的所有反馈
        """
        # TODO: 从数据库查询
        return []
