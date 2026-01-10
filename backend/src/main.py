"""
FastAPI 主应用
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import redis
import logging

from .config import settings
from .routes import participant, host, realtime

# 日志
logger = logging.getLogger(__name__)

# Redis 客户端
redis_client: redis.Redis = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    """
    # Startup
    global redis_client
    redis_client = redis.from_url(settings.redis_url, decode_responses=True)
    logger.info("Redis connection established")
    
    yield
    
    # Shutdown
    if redis_client:
        redis_client.close()
        logger.info("Redis connection closed")


# 创建应用
app = FastAPI(
    title="FlowMeet API",
    description="Networking Event Management System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: 在生产环境配置具体来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 包含路由
app.include_router(participant.router)
app.include_router(host.router)
app.include_router(realtime.router)


@app.get("/health")
async def health_check():
    """
    健康检查
    """
    return {
        "status": "healthy",
        "service": "FlowMeet API",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
