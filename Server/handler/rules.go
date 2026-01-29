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

type BatchCopyRulesRequest struct {
	AccountID      string   `json:"accountId"`
	SourceDomain   string   `json:"sourceDomain"`
	TargetDomains  []string `json:"targetDomains"`
	RuleTypes      []string `json:"ruleTypes"`
}

type CopyRulesResult struct {
	Domain  string `json:"domain"`
	Success bool   `json:"success"`
	Message string `json:"message"`
	Count   int    `json:"count"`
}

func BatchCopyRules(c *gin.Context) {
	var req BatchCopyRulesRequest
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

	sourceZoneID, err := getZoneIDByDomain(acc, req.SourceDomain)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Source domain not found"})
		return
	}

	results := make([]CopyRulesResult, len(req.TargetDomains))
	var wg sync.WaitGroup

	for i, domain := range req.TargetDomains {
		wg.Add(1)
		go func(idx int, dom string) {
			defer wg.Done()
			success, msg, count := copyRulesToDomain(acc, sourceZoneID, dom, req.RuleTypes)
			results[idx] = CopyRulesResult{
				Domain:  dom,
				Success: success,
				Message: msg,
				Count:   count,
			}
		}(i, domain)
	}

	wg.Wait()
	c.JSON(http.StatusOK, results)
}

func copyRulesToDomain(acc *models.Account, sourceZoneID string, targetDomain string, ruleTypes []string) (bool, string, int) {
	targetZoneID, err := getZoneIDByDomain(acc, targetDomain)
	if err != nil {
		return false, "Target zone not found", 0
	}

	totalCopied := 0

	for _, ruleType := range ruleTypes {
		switch ruleType {
		case "page_rules":
			count := copyPageRules(acc, sourceZoneID, targetZoneID, targetDomain)
			totalCopied += count
		case "firewall_rules":
			count := copyFirewallRules(acc, sourceZoneID, targetZoneID)
			totalCopied += count
		case "rate_limiting":
			count := copyRateLimitRules(acc, sourceZoneID, targetZoneID)
			totalCopied += count
		}
	}

	if totalCopied > 0 {
		return true, fmt.Sprintf("Copied %d rules", totalCopied), totalCopied
	}

	return false, "No rules copied", 0
}

func getZoneIDByDomain(acc *models.Account, domain string) (string, error) {
	req, _ := http.NewRequest("GET", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones?name=%s", domain), nil)
	req.Header.Add("X-Auth-Email", acc.Email)
	req.Header.Add("X-Auth-Key", acc.Key)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("Request failed")
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
		return "", fmt.Errorf("Zone not found")
	}

	return result.Result[0].ID, nil
}

func copyPageRules(acc *models.Account, sourceZoneID string, targetZoneID string, targetDomain string) int {
	req, _ := http.NewRequest("GET", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/pagerules", sourceZoneID), nil)
	req.Header.Add("X-Auth-Email", acc.Email)
	req.Header.Add("X-Auth-Key", acc.Key)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return 0
	}
	defer resp.Body.Close()

	var result struct {
		Result []map[string]interface{} `json:"result"`
	}

	body, _ := ioutil.ReadAll(resp.Body)
	json.Unmarshal(body, &result)

	count := 0
	for _, rule := range result.Result {
		delete(rule, "id")
		delete(rule, "created_on")
		delete(rule, "modified_on")

		ruleBody, _ := json.Marshal(rule)
		postReq, _ := http.NewRequest("POST", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/pagerules", targetZoneID), bytes.NewBuffer(ruleBody))
		postReq.Header.Add("X-Auth-Email", acc.Email)
		postReq.Header.Add("X-Auth-Key", acc.Key)
		postReq.Header.Add("Content-Type", "application/json")

		postResp, err := client.Do(postReq)
		if err == nil && postResp.StatusCode == http.StatusOK {
			count++
		}
		if postResp != nil {
			postResp.Body.Close()
		}
	}

	return count
}

func copyFirewallRules(acc *models.Account, sourceZoneID string, targetZoneID string) int {
	req, _ := http.NewRequest("GET", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/firewall/rules", sourceZoneID), nil)
	req.Header.Add("X-Auth-Email", acc.Email)
	req.Header.Add("X-Auth-Key", acc.Key)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return 0
	}
	defer resp.Body.Close()

	var result struct {
		Result []map[string]interface{} `json:"result"`
	}

	body, _ := ioutil.ReadAll(resp.Body)
	json.Unmarshal(body, &result)

	count := 0
	for _, rule := range result.Result {
		delete(rule, "id")
		delete(rule, "created_on")
		delete(rule, "modified_on")

		ruleBody, _ := json.Marshal(rule)
		postReq, _ := http.NewRequest("POST", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/firewall/rules", targetZoneID), bytes.NewBuffer(ruleBody))
		postReq.Header.Add("X-Auth-Email", acc.Email)
		postReq.Header.Add("X-Auth-Key", acc.Key)
		postReq.Header.Add("Content-Type", "application/json")

		postResp, err := client.Do(postReq)
		if err == nil && postResp.StatusCode == http.StatusOK {
			count++
		}
		if postResp != nil {
			postResp.Body.Close()
		}
	}

	return count
}

func copyRateLimitRules(acc *models.Account, sourceZoneID string, targetZoneID string) int {
	req, _ := http.NewRequest("GET", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/rate_limits", sourceZoneID), nil)
	req.Header.Add("X-Auth-Email", acc.Email)
	req.Header.Add("X-Auth-Key", acc.Key)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return 0
	}
	defer resp.Body.Close()

	var result struct {
		Result []map[string]interface{} `json:"result"`
	}

	body, _ := ioutil.ReadAll(resp.Body)
	json.Unmarshal(body, &result)

	count := 0
	for _, rule := range result.Result {
		delete(rule, "id")
		delete(rule, "created_on")
		delete(rule, "modified_on")

		ruleBody, _ := json.Marshal(rule)
		postReq, _ := http.NewRequest("POST", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/rate_limits", targetZoneID), bytes.NewBuffer(ruleBody))
		postReq.Header.Add("X-Auth-Email", acc.Email)
		postReq.Header.Add("X-Auth-Key", acc.Key)
		postReq.Header.Add("Content-Type", "application/json")

		postResp, err := client.Do(postReq)
		if err == nil && postResp.StatusCode == http.StatusOK {
			count++
		}
		if postResp != nil {
			postResp.Body.Close()
		}
	}

	return count
}

type BatchDeleteRulesRequest struct {
	AccountID string   `json:"accountId"`
	Domains   []string `json:"domains"`
	RuleTypes []string `json:"ruleTypes"`
}

type DeleteRulesResult struct {
	Domain  string `json:"domain"`
	Success bool   `json:"success"`
	Message string `json:"message"`
	Count   int    `json:"count"`
}

func BatchDeleteRules(c *gin.Context) {
	var req BatchDeleteRulesRequest
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

	results := make([]DeleteRulesResult, len(req.Domains))
	var wg sync.WaitGroup

	for i, domain := range req.Domains {
		wg.Add(1)
		go func(idx int, dom string) {
			defer wg.Done()
			success, msg, count := deleteRulesFromDomain(acc, dom, req.RuleTypes)
			results[idx] = DeleteRulesResult{
				Domain:  dom,
				Success: success,
				Message: msg,
				Count:   count,
			}
		}(i, domain)
	}

	wg.Wait()
	c.JSON(http.StatusOK, results)
}

func deleteRulesFromDomain(acc *models.Account, domain string, ruleTypes []string) (bool, string, int) {
	zoneID, err := getZoneIDByDomain(acc, domain)
	if err != nil {
		return false, "Zone not found", 0
	}

	totalDeleted := 0

	for _, ruleType := range ruleTypes {
		switch ruleType {
		case "page_rules":
			count := deletePageRules(acc, zoneID)
			totalDeleted += count
		case "firewall_rules":
			count := deleteFirewallRules(acc, zoneID)
			totalDeleted += count
		case "rate_limiting":
			count := deleteRateLimitRules(acc, zoneID)
			totalDeleted += count
		}
	}

	if totalDeleted > 0 {
		return true, fmt.Sprintf("Deleted %d rules", totalDeleted), totalDeleted
	}

	return false, "No rules found", 0
}

func deletePageRules(acc *models.Account, zoneID string) int {
	req, _ := http.NewRequest("GET", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/pagerules", zoneID), nil)
	req.Header.Add("X-Auth-Email", acc.Email)
	req.Header.Add("X-Auth-Key", acc.Key)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return 0
	}
	defer resp.Body.Close()

	var result struct {
		Result []struct {
			ID string `json:"id"`
		} `json:"result"`
	}

	body, _ := ioutil.ReadAll(resp.Body)
	json.Unmarshal(body, &result)

	count := 0
	for _, rule := range result.Result {
		delReq, _ := http.NewRequest("DELETE", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/pagerules/%s", zoneID, rule.ID), nil)
		delReq.Header.Add("X-Auth-Email", acc.Email)
		delReq.Header.Add("X-Auth-Key", acc.Key)

		delResp, err := client.Do(delReq)
		if err == nil && delResp.StatusCode == http.StatusOK {
			count++
		}
		if delResp != nil {
			delResp.Body.Close()
		}
	}

	return count
}

func deleteFirewallRules(acc *models.Account, zoneID string) int {
	req, _ := http.NewRequest("GET", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/firewall/rules", zoneID), nil)
	req.Header.Add("X-Auth-Email", acc.Email)
	req.Header.Add("X-Auth-Key", acc.Key)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return 0
	}
	defer resp.Body.Close()

	var result struct {
		Result []struct {
			ID string `json:"id"`
		} `json:"result"`
	}

	body, _ := ioutil.ReadAll(resp.Body)
	json.Unmarshal(body, &result)

	count := 0
	for _, rule := range result.Result {
		delReq, _ := http.NewRequest("DELETE", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/firewall/rules/%s", zoneID, rule.ID), nil)
		delReq.Header.Add("X-Auth-Email", acc.Email)
		delReq.Header.Add("X-Auth-Key", acc.Key)

		delResp, err := client.Do(delReq)
		if err == nil && delResp.StatusCode == http.StatusOK {
			count++
		}
		if delResp != nil {
			delResp.Body.Close()
		}
	}

	return count
}

func deleteRateLimitRules(acc *models.Account, zoneID string) int {
	req, _ := http.NewRequest("GET", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/rate_limits", zoneID), nil)
	req.Header.Add("X-Auth-Email", acc.Email)
	req.Header.Add("X-Auth-Key", acc.Key)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return 0
	}
	defer resp.Body.Close()

	var result struct {
		Result []struct {
			ID string `json:"id"`
		} `json:"result"`
	}

	body, _ := ioutil.ReadAll(resp.Body)
	json.Unmarshal(body, &result)

	count := 0
	for _, rule := range result.Result {
		delReq, _ := http.NewRequest("DELETE", fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/rate_limits/%s", zoneID, rule.ID), nil)
		delReq.Header.Add("X-Auth-Email", acc.Email)
		delReq.Header.Add("X-Auth-Key", acc.Key)

		delResp, err := client.Do(delReq)
		if err == nil && delResp.StatusCode == http.StatusOK {
			count++
		}
		if delResp != nil {
			delResp.Body.Close()
		}
	}

	return count
}
