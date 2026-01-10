from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://user:password@localhost:5432/flowmeet"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    
    # Session
    heartbeat_interval: int = 15  # seconds
    offline_threshold: int = 30   # seconds
    
    # Matching
    match_timeout: int = 120  # seconds
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
