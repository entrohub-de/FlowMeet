"""
Matching Engine - 配对引擎
根据约束条件进行智能配对
"""

from typing import List, Dict, Tuple
from collections import defaultdict


class MatchingEngine:
    """
    配对引擎
    
    约束：
    - 本轮不重复
    - 最近 N 轮尽量不重复
    - 尽量避免奇数落单
    """
    
    def __init__(self, redis_client, db_session):
        self.redis = redis_client
        self.db = db_session
    
    def match_participants(self, event_id: str, round_id: str, 
                          participant_ids: List[str],
                          recent_rounds: int = 5) -> Dict[str, str]:
        """
        配对参与者
        返回: {participant_id: partner_id}
        
        算法：贪心
        - 遍历参与者列表
        - 检查历史配对（避免重复）
        - 配对成功则锁定，继续下一个
        """
        
        # 获取历史配对信息
        history = self._get_match_history(event_id, participant_ids, recent_rounds)
        
        matches = {}
        available = set(participant_ids)
        
        for participant_id in participant_ids:
            if participant_id not in available:
                continue
            
            # 找寻最合适的配对
            partner = self._find_best_match(
                participant_id,
                available - {participant_id},
                history
            )
            
            if partner:
                matches[participant_id] = partner
                matches[partner] = participant_id
                available.discard(participant_id)
                available.discard(partner)
        
        # 处理奇数落单（分配到待机列表）
        if available:
            self._handle_odd_participants(event_id, round_id, available)
        
        # 存储本轮配对
        self._save_match_history(event_id, round_id, matches)
        
        return matches
    
    def _get_match_history(self, event_id: str, participant_ids: List[str], 
                          recent_rounds: int) -> Dict[str, set]:
        """
        获取最近 N 轮的配对历史
        返回: {participant_id: {partner_ids...}}
        """
        history = defaultdict(set)
        
        for participant_id in participant_ids:
            # 从 Redis 获取该参与者的历史配对
            history_key = f"participant:{participant_id}:match_history"
            recent_partners = self.redis.lrange(history_key, 0, recent_rounds - 1)
            history[participant_id] = set(recent_partners)
        
        return history
    
    def _find_best_match(self, participant_id: str, candidates: set,
                        history: Dict[str, set]) -> str:
        """
        为参与者找最合适的配对
        优先选择：未配对过或距离最远的候选人
        """
        if not candidates:
            return None
        
        # 简单贪心：选择最少配对过的候选人
        participant_history = history.get(participant_id, set())
        
        best_match = None
        best_score = -1
        
        for candidate in candidates:
            # 计分：未配对过得分更高
            if candidate not in participant_history:
                score = 2
            else:
                score = 1
            
            if score > best_score:
                best_score = score
                best_match = candidate
        
        return best_match
    
    def _handle_odd_participants(self, event_id: str, round_id: str, 
                                odd_participants: set):
        """
        处理奇数落单的参与者
        """
        for participant_id in odd_participants:
            # 可选：记录到待机列表
            self.redis.sadd(f"round:{round_id}:waitlist", participant_id)
    
    def _save_match_history(self, event_id: str, round_id: str, 
                           matches: Dict[str, str]):
        """
        保存本轮配对历史
        """
        for participant_id, partner_id in matches.items():
            # 保存到 Redis List（FIFO）
            history_key = f"participant:{participant_id}:match_history"
            self.redis.lpush(history_key, partner_id)
            # 只保留最近 50 轮
            self.redis.ltrim(history_key, 0, 49)
