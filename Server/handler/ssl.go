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

type BatchSSLSettingsRequest struct {
	AccountID         string   `json:"accountId"`
	Domains           []string `json:"domains"`
	SSLMode           string   `json:"sslMode"`
	MinTLSVersion     string   `json:"minTlsVersion"`
	AlwaysUseHTTPS    string   `json:"alwaysUseHttps"`
	AutomaticHTTPS    string   `json:"automaticHttps"`
	OpportunisticEnc  string   `json:"opportunisticEnc"`
}

type SSLSettingResult struct {
	Domain  string `json:"domain"`
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func BatchSSLSettings(c *gin.Context) {
	var req BatchSSLSettingsRequest
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

	results := make([]SSLSettingResult, len(req.Domains))
	var wg sync.WaitGroup

	for i, domain := range req.Domains {
		wg.Add(1)
		go func(idx int, dom string) {
			defer wg.Done()
			success, msg := applySSLSettings(acc, dom, &req)
			results[idx] = SSLSettingResult{
				Domain:  dom,
				Success: success,
				Message: msg,
			}
		}(i, domain)
	}

	wg.Wait()
	c.JSON(http.StatusOK, results)
}

func applySSLSettings(acc *models.Account, domain string, settings *BatchSSLSettingsRequest) (bool, string) {
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
	totalSettings := 0

	if settings.SSLMode != "" {
		totalSettings++
		if updateZoneSetting(acc, zoneID, "ssl", settings.SSLMode) {
			successCount++
		}
	}

	if settings.MinTLSVersion != "" {
		totalSettings++
		if updateZoneSetting(acc, zoneID, "min_tls_version", settings.MinTLSVersion) {
			successCount++
		}
	}

	if settings.AlwaysUseHTTPS != "" {
		totalSettings++
		if updateZoneSetting(acc, zoneID, "always_use_https", settings.AlwaysUseHTTPS) {
			successCount++
		}
	}

	if settings.AutomaticHTTPS != "" {
		totalSettings++
		if updateZoneSetting(acc, zoneID, "automatic_https_rewrites", settings.AutomaticHTTPS) {
			successCount++
		}
	}

	if settings.OpportunisticEnc != "" {
		totalSettings++
		if updateZoneSetting(acc, zoneID, "opportunistic_encryption", settings.OpportunisticEnc) {
			successCount++
		}
	}

	if successCount == totalSettings && totalSettings > 0 {
		return true, fmt.Sprintf("Success (%d/%d)", successCount, totalSettings)
	} else if successCount > 0 {
		return true, fmt.Sprintf("Partial success (%d/%d)", successCount, totalSettings)
	}

	return false, "Failed to update settings"
}

func updateZoneSetting(acc *models.Account, zoneID string, setting string, value string) bool {
	payload := map[string]interface{}{
		"value": value,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("PATCH", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/settings/%s", zoneID, setting), bytes.NewBuffer(body))
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
