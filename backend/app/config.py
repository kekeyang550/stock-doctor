from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="STOCK_DOCTOR_", env_file=".env")

    data_provider: str = Field(default="mock", pattern="^(mock|akshare|eastmoney)$")
    data_request_timeout_seconds: int = Field(default=8, ge=1, le=60)
    data_cache_ttl_seconds: int = Field(default=300, ge=30, le=86_400)
    data_freshness_stale_after_minutes: int = Field(default=30, ge=1, le=24 * 60)
    tdx_vipdoc_path: str = "E:\\new_tdx64\\vipdoc"
    ths_stockname_paths: str = (
        "D:\\同花顺软件\\同花顺\\stockname\\stockname_16_0.txt;"
        "D:\\同花顺软件\\同花顺\\stockname\\stockname_32_0.txt"
    )


settings = Settings()
