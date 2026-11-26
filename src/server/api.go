package main

import (
	"encoding/gob"
	"fmt"
	"log"
	"runtime/debug"
	"strings"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

var _ = registerToken()

func registerToken() bool {
	gob.Register(map[string]any{})
	gob.Register(map[string]bool{})
	gob.Register(struct{}{})
	return true
}

type ApiRequest struct {
	Action  string         `json:"action" binding:"required"`
	Version int            `json:"version" binding:"required"`
	Params  map[string]any `json:"params"`
}

func apiHandler(c *gin.Context) {
	var request ApiRequest
	var err error

	if err = c.ShouldBindJSON(&request); err != nil {
		logRequest(c, err)
		jsonError(c, CreateApiError(BadRequestError))
		return
	}

	defer func() {
		if err := recover(); err != nil {
			jsonError(c, CreateApiError(UnexpectedError))
			log.Println(err, string(debug.Stack()))
		}
	}()

	session := initSession(c)

	var apiError apiError
	switch request.Action {
	case "get-items":
		apiError = apiGetItems(c)
	case "get-my-items":
		apiError = apiGetMyItems(c, session)
	default:
		apiError = CreateApiError(NotFoundError)
	}

	if err := session.Save(); err != nil {
		logRequest(c, fmt.Errorf("error while saving session: %w", err))
	}

	if apiError != nil {
		jsonError(c, apiError)
	}
}

func initSession(c *gin.Context) sessions.Session {
	session := getSession(c)
	return session
}

func apiGetItems(c *gin.Context) apiError {
	files, err := getItems(itemParams{Sort: itemSort{Ascending: true}})

	if err != nil {
		logRequest(c, err)
		return CreateApiError(UnexpectedError)
	}

	for i := range files {
		files[i].PreviewUrl = strings.Replace(files[i].PreviewUrl, ugcUrlPrefix, "/", 1)
	}

	jsonSuccess(c, map[string]any{"items": files})
	return nil
}

func apiGetMyItems(c *gin.Context, s sessions.Session) apiError {
	steamId64, ok := s.Get("steam_id_64").(string)
	if !ok {
		return CreateApiError(NotLoggedError)
	}

	items, err := getCreatorItems(440, steamId64)

	if err != nil {
		logRequest(c, err)
		return CreateApiError(UnexpectedError)
	}

	for i := range items {
		items[i].PreviewUrl = strings.Replace(items[i].PreviewUrl, ugcUrlPrefix, "/", 1)
	}

	jsonSuccess(c, map[string]any{"items": items})
	return nil
}
