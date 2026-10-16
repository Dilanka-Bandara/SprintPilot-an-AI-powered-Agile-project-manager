package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthReportsMetricsNotEnabled(t *testing.T) {
	response := httptest.NewRecorder()
	Router().ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/health", nil))
	if response.Code != http.StatusOK {
		t.Fatalf("health: got %d", response.Code)
	}
	var body struct {
		Status         string `json:"status"`
		MetricsEnabled bool   `json:"metrics_enabled"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Status != "ok" || body.MetricsEnabled {
		t.Fatalf("unexpected health: %+v", body)
	}
}
