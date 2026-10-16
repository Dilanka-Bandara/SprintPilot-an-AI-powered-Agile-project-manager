"""Service foundation. Agent execution is intentionally not exposed until configured."""

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="SprintPilot agents", version="0.1.0")


class Health(BaseModel):
    status: str
    agents_enabled: bool


@app.get("/health", response_model=Health)
def health() -> Health:
    return Health(status="ok", agents_enabled=False)
