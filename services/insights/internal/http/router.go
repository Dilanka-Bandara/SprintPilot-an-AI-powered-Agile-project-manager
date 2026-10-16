package http

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

// Router exposes only liveness until the event store is implemented.
func Router() *gin.Engine {
	router := gin.New()
	router.Use(gin.Recovery())
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "metrics_enabled": false})
	})
	return router
}
