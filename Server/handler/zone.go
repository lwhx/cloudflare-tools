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

type BatchAddZoneRequest struct {
	AccountID string   `json:"accountId"`
	Domains   []string `json:"domains"`
}

type ZoneResult struct {
	Domain      string   `json:"domain"`
	Success     bool     `json:"success"`
	Message     string   `json:"message"`
	NameServers []string `json:"nameServers,omitempty"`
}

func BatchAddZones(c *gin.Context) {
	var req BatchAddZoneRequest
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

	results := make([]ZoneResult, len(req.Domains))
	var wg sync.WaitGroup

	for i, domain := range req.Domains {
		wg.Add(1)
		go func(idx int, dom string) {
			defer wg.Done()
			success, msg, ns := addZoneToCloudflare(acc, dom)
			results[idx] = ZoneResult{
				Domain:      dom,
				Success:     success,
				Message:     msg,
				NameServers: ns,
			}
		}(i, domain)
	}

	wg.Wait()
	c.JSON(http.StatusOK, results)
}

func addZoneToCloudflare(acc *models.Account, domain string) (bool, string, []string) {
	payload := map[string]interface{}{
		"name":       domain,
		"jump_start": true,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "https://api.cloudflare.com/client/v4/zones", bytes.NewBuffer(body))
	req.Header.Add("X-Auth-Email", acc.Email)
	req.Header.Add("X-Auth-Key", acc.Key)
	req.Header.Add("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return false, "Request failed", nil
	}
	defer resp.Body.Close()

	respBody, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
		var successRes struct {
			Result struct {
				NameServers []string `json:"name_servers"`
			} `json:"result"`
		}
		json.Unmarshal(respBody, &successRes)
		return true, "Success", successRes.Result.NameServers
	}

	var errorRes struct {
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	json.Unmarshal(respBody, &errorRes)

	msg := "Unknown error"
	if len(errorRes.Errors) > 0 {
		msg = errorRes.Errors[0].Message
	} else if resp.StatusCode == 403 {
		msg = "Auth failed (403)"
	} else {
		msg = fmt.Sprintf("HTTP %d", resp.StatusCode)
	}

	return false, msg, nil
}

type BatchDeleteZoneRequest struct {
	AccountID string   `json:"accountId"`
	Domains   []string `json:"domains"`
}

type DeleteZoneResult struct {
	Domain  string `json:"domain"`
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func BatchDeleteZones(c *gin.Context) {
	var req BatchDeleteZoneRequest
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

	results := make([]DeleteZoneResult, len(req.Domains))
	var wg sync.WaitGroup

	for i, domain := range req.Domains {
		wg.Add(1)
		go func(idx int, dom string) {
			defer wg.Done()
			success, msg := deleteZoneFromCloudflare(acc, dom)
			results[idx] = DeleteZoneResult{
				Domain:  dom,
				Success: success,
				Message: msg,
			}
		}(i, domain)
	}

	wg.Wait()
	c.JSON(http.StatusOK, results)
}

func deleteZoneFromCloudflare(acc *models.Account, domain string) (bool, string) {
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

	reqDel, _ := http.NewRequest("DELETE", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s", zoneID), nil)
	reqDel.Header.Add("X-Auth-Email", acc.Email)
	reqDel.Header.Add("X-Auth-Key", acc.Key)

	respDel, err := client.Do(reqDel)
	if err != nil {
		return false, "Delete request failed"
	}
	defer respDel.Body.Close()

	if respDel.StatusCode == http.StatusOK {
		return true, "Success"
	}

	var errorRes struct {
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}

	respBody, _ := ioutil.ReadAll(respDel.Body)
	json.Unmarshal(respBody, &errorRes)

	msg := "Unknown error"
	if len(errorRes.Errors) > 0 {
		msg = errorRes.Errors[0].Message
	} else {
		msg = fmt.Sprintf("HTTP %d", respDel.StatusCode)
	}

	return false, msg
}

type ExportZonesRequest struct {
	AccountID string `json:"accountId"`
}

type ExportZoneResult struct {
	Domain      string   `json:"domain"`
	Status      string   `json:"status"`
	NameServers []string `json:"nameServers"`
	CreatedOn   string   `json:"createdOn"`
}

func ExportZones(c *gin.Context) {
	var req ExportZonesRequest
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

	zones, err := fetchAllZones(acc)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, zones)
}

func fetchAllZones(acc *models.Account) ([]ExportZoneResult, error) {
	var allZones []ExportZoneResult
	page := 1
	perPage := 50

	for {
		url := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones?page=%d&per_page=%d", page, perPage)
		req, _ := http.NewRequest("GET", url, nil)
		req.Header.Add("X-Auth-Email", acc.Email)
		req.Header.Add("X-Auth-Key", acc.Key)

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("Request failed")
		}
		defer resp.Body.Close()

		var result struct {
			Result []struct {
				Name        string   `json:"name"`
				Status      string   `json:"status"`
				NameServers []string `json:"name_servers"`
				CreatedOn   string   `json:"created_on"`
			} `json:"result"`
			ResultInfo struct {
				Page       int `json:"page"`
				TotalPages int `json:"total_pages"`
			} `json:"result_info"`
		}

		body, _ := ioutil.ReadAll(resp.Body)
		json.Unmarshal(body, &result)

		for _, zone := range result.Result {
			allZones = append(allZones, ExportZoneResult{
				Domain:      zone.Name,
				Status:      zone.Status,
				NameServers: zone.NameServers,
				CreatedOn:   zone.CreatedOn,
			})
		}

		if page >= result.ResultInfo.TotalPages {
			break
		}
		page++
	}

	return allZones, nil
}
