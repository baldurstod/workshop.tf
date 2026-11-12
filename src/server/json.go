package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func jsonError(c *gin.Context, e apiError) {
	c.JSON(http.StatusOK, gin.H{
		"success":   false,
		"error":     e.Error(),
		"error_18n": e.I18n(),
	})
}

func jsonSuccess(c *gin.Context, result map[string]any) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"result":  result,
	})
}
