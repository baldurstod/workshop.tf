package main

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/yohcop/openid-go"
)

var serverAddress string

func setServerAddress(address string) {
	serverAddress = address
}

func openIdHandler(c *gin.Context) {

	cbPath, err := url.JoinPath(serverAddress, "/openidcallback")
	if err != nil {
		logRequest(c, err)
		c.String(http.StatusInternalServerError, "")
		return

	}

	realm, err := url.JoinPath(serverAddress, "/")
	if err != nil {
		logRequest(c, err)
		c.String(http.StatusInternalServerError, "")
		return
	}

	url, err := openid.RedirectURL(
		"http://steamcommunity.com/openid",
		cbPath,
		realm,
	)
	if err != nil {
		logRequest(c, err)
		c.String(http.StatusInternalServerError, "")
		return
	}

	c.Redirect(http.StatusFound, url)
}

var nonceStore = openid.NewSimpleNonceStore()

// NoOpDiscoveryCache implements the DiscoveryCache interface and doesn't cache anything.
// For a simple website, I'm not sure you need a cache.
type NoOpDiscoveryCache struct{}

// Put is a no op.
func (n *NoOpDiscoveryCache) Put(id string, info openid.DiscoveredInfo) {}

// Get always returns nil.
func (n *NoOpDiscoveryCache) Get(id string) openid.DiscoveredInfo {
	return nil
}

var discoveryCache = &NoOpDiscoveryCache{}

func openIdCallbackHandler(c *gin.Context) {
	base, err := url.Parse(serverAddress)
	if err != nil {
		logRequest(c, err)
		c.String(http.StatusInternalServerError, "")
		return
	}

	u, err := url.Parse(c.Request.URL.String())
	if err != nil {
		logRequest(c, err)
		c.String(http.StatusInternalServerError, "")
		return
	}

	url := base.ResolveReference(u)

	id, err := openid.Verify(url.String(), discoveryCache, nonceStore)
	if err != nil {
		logRequest(c, err)
		c.String(http.StatusInternalServerError, "")
		return
	} else {
		session := initSession(c)

		session.Set("steam_id_64", strings.Replace(id, "https://steamcommunity.com/openid/id/", "", -1))

		if err := session.Save(); err != nil {
			logRequest(c, fmt.Errorf("error while saving session: %w", err))
		}

		c.Redirect(http.StatusFound, "/upload")
	}
}
