package handler

import (
	"bytes"
	"cloudflare-tools/server/models"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

type BatchOptimizationRequest struct {
	AccountID       string   `json:"accountId"`
	Domains         []string `json:"domains"`
	Minify          string   `json:"minify"`
	Brotli          string   `json:"brotli"`
	EarlyHints      string   `json:"earlyHints"`
	HTTP2           string   `json:"http2"`
	HTTP3           string   `json:"http3"`
	ZeroRTT         string   `json:"zeroRtt"`
	IPV6            string   `json:"ipv6"`
	WebSockets      string   `json:"webSockets"`
	PseudoIPV4      string   `json:"pseudoIpv4"`
	RocketLoader    string   `json:"rocketLoader"`
	Mirage          string   `json:"mirage"`
	Polish          string   `json:"polish"`
}

type OptimizationResult struct {
	Domain  string `json:"domain"`
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func BatchOptimization(c *gin.Context) {
	var req BatchOptimizationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var acc *models.Account
	for _, a := range models.Accounts {
		if a.ID == req.AccountID {
			acc = &a
			break
		}
	}

	if acc == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		return
	}

	results := make([]OptimizationResult, len(req.Domains))
	var wg sync.WaitGroup

	for i, domain := range req.Domains {
		wg.Add(1)
		go func(idx int, dom string) {
			defer wg.Done()
			success, msg := applyOptimization(acc, dom, &req)
			results[idx] = OptimizationResult{
				Domain:  dom,
				Success: success,
				Message: msg,
			}
		}(i, domain)
	}

	wg.Wait()
	c.JSON(http.StatusOK, results)
}

func applyOptimization(acc *models.Account, domain string, settings *BatchOptimizationRequest) (bool, string) {
	reqGet, _ := http.NewRequest("GET", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones?name=%s", domain), nil)
	reqGet.Header.Add("X-Auth-Email", acc.Email)
	reqGet.Header.Add("X-Auth-Key", acc.Key)

	client := &http.Client{}
	resp, err := client.Do(reqGet)
	if err != nil {
		return false, "Request failed"
	}
	defer resp.Body.Close()

	var result struct {
		Result []struct {
			ID string `json:"id"`
		} `json:"result"`
	}

	body, _ := ioutil.ReadAll(resp.Body)
	json.Unmarshal(body, &result)

	if len(result.Result) == 0 {
		return false, "Zone not found"
	}

	zoneID := result.Result[0].ID
	successCount := 0
	totalOperations := 0

	if settings.Minify != "" {
		totalOperations++
		if updateMinifySetting(acc, zoneID, settings.Minify) {
			successCount++
		}
	}

	if settings.Brotli != "" {
		totalOperations++
		if updateZoneSetting(acc, zoneID, "brotli", settings.Brotli) {
			successCount++
		}
	}

	if settings.EarlyHints != "" {
		totalOperations++
		if updateZoneSetting(acc, zoneID, "early_hints", settings.EarlyHints) {
			successCount++
		}
	}

	if settings.HTTP2 != "" {
		totalOperations++
		if updateZoneSetting(acc, zoneID, "http2", settings.HTTP2) {
			successCount++
		}
	}

	if settings.HTTP3 != "" {
		totalOperations++
		if updateZoneSetting(acc, zoneID, "http3", settings.HTTP3) {
			successCount++
		}
	}

	if settings.ZeroRTT != "" {
		totalOperations++
		if updateZoneSetting(acc, zoneID, "0rtt", settings.ZeroRTT) {
			successCount++
		}
	}

	if settings.IPV6 != "" {
		totalOperations++
		if updateZoneSetting(acc, zoneID, "ipv6", settings.IPV6) {
			successCount++
		}
	}

	if settings.WebSockets != "" {
		totalOperations++
		if updateZoneSetting(acc, zoneID, "websockets", settings.WebSockets) {
			successCount++
		}
	}

	if settings.PseudoIPV4 != "" {
		totalOperations++
		if updateZoneSetting(acc, zoneID, "pseudo_ipv4", settings.PseudoIPV4) {
			successCount++
		}
	}

	if settings.RocketLoader != "" {
		totalOperations++
		if updateZoneSetting(acc, zoneID, "rocket_loader", settings.RocketLoader) {
			successCount++
		}
	}

	if settings.Mirage != "" {
		totalOperations++
		if updateZoneSetting(acc, zoneID, "mirage", settings.Mirage) {
			successCount++
		}
	}

	if settings.Polish != "" {
		totalOperations++
		if updateZoneSetting(acc, zoneID, "polish", settings.Polish) {
			successCount++
		}
	}

	if successCount == totalOperations && totalOperations > 0 {
		return true, fmt.Sprintf("Success (%d/%d)", successCount, totalOperations)
	} else if successCount > 0 {
		return true, fmt.Sprintf("Partial success (%d/%d)", successCount, totalOperations)
	}

	return false, "No operations performed"
}

func updateMinifySetting(acc *models.Account, zoneID string, minifyValue string) bool {
	var minifyConfig map[string]interface{}
	
	switch minifyValue {
	case "all":
		minifyConfig = map[string]interface{}{
			"css":  "on",
			"html": "on",
			"js":   "on",
		}
	case "css":
		minifyConfig = map[string]interface{}{
			"css":  "on",
			"html": "off",
			"js":   "off",
		}
	case "html":
		minifyConfig = map[string]interface{}{
			"css":  "off",
			"html": "on",
			"js":   "off",
		}
	case "js":
		minifyConfig = map[string]interface{}{
			"css":  "off",
			"html": "off",
			"js":   "on",
		}
	case "off":
		minifyConfig = map[string]interface{}{
			"css":  "off",
			"html": "off",
			"js":   "off",
		}
	default:
		return false
	}

	payload := map[string]interface{}{
		"value": minifyConfig,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("PATCH", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/settings/minify", zoneID), bytes.NewBuffer(body))
	req.Header.Add("X-Auth-Email", acc.Email)
	req.Header.Add("X-Auth-Key", acc.Key)
	req.Header.Add("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}
