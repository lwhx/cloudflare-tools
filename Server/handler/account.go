package handler

import (
	"cloudflare-tools/server/models"
	"net/http"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"io/ioutil"
	"fmt"
)

func ListAccounts(c *gin.Context) {
	c.JSON(http.StatusOK, models.Accounts)
}

func AddAccount(c *gin.Context) {
	var acc models.Account
	if err := c.ShouldBindJSON(&acc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if acc.ID != "" {
		found := false
		for i, existing := range models.Accounts {
			if existing.ID == acc.ID {
				models.Accounts[i] = acc
				found = true
				break
			}
		}
		if !found {
			c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
			return
		}
	} else {
		acc.ID = uuid.New().String()
		models.Accounts = append(models.Accounts, acc)
	}

	if err := models.SaveAccounts(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, acc)
}

func DeleteAccount(c *gin.Context) {
	id := c.Param("id")
	mu := false
	for i, acc := range models.Accounts {
		if acc.ID == id {
			models.Accounts = append(models.Accounts[:i], models.Accounts[i+1:]...)
			mu = true
			break
		}
	}
	if !mu {
		c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		return
	}
	if err := models.SaveAccounts(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

func TestAccount(c *gin.Context) {
	var acc models.Account
	if err := c.ShouldBindJSON(&acc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data"})
		return
	}

	client := &http.Client{}
	req, _ := http.NewRequest("GET", "https://api.cloudflare.com/client/v4/zones?per_page=1", nil)
	req.Header.Add("X-Auth-Email", acc.Email)
	req.Header.Add("X-Auth-Key", acc.Key)
	req.Header.Add("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无法连接到 Cloudflare API"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		c.JSON(http.StatusOK, gin.H{"success": true})
	} else {
		body, _ := ioutil.ReadAll(resp.Body)
		c.JSON(http.StatusOK, gin.H{"success": false, "message": fmt.Sprintf("校验失败 (HTTP %d): %s", resp.StatusCode, string(body))})
	}
}
