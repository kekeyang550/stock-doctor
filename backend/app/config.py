from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="STOCK_DOCTOR_", env_file=".env")

    data_provider: str = Field(default="mock", pattern="^(mock|akshare)$")


settings = Settings()
