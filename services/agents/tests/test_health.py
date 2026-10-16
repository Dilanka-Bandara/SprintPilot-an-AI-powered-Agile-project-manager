from fastapi.testclient import TestClient

from sprintpilot_agents.server import app


def test_health_explicitly_reports_agents_not_enabled():
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "agents_enabled": False}
