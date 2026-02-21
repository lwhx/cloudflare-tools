package handler

import (
	"archive/zip"
	"cloudflare-tools/server/models"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
)

type BatchApplyCertRequest struct {
	AccountID      string   `json:"accountId"`
	Domains        []string `json:"domains"`
	IncludeWildcard bool    `json:"includeWildcard"`
}

type CertResult struct {
	Domain       string   `json:"domain"`
	Success      bool     `json:"success"`
	Message      string   `json:"message"`
	Steps        []string `json:"steps"`
	CertPath     string   `json:"certPath,omitempty"`
	DownloadURL  string   `json:"downloadUrl,omitempty"`
}

func BatchApplyCert(c *gin.Context) {
	var req BatchApplyCertRequest
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

	results := make([]CertResult, len(req.Domains))
	var wg sync.WaitGroup

	for i, domain := range req.Domains {
		wg.Add(1)
		go func(idx int, dom string) {
			defer wg.Done()
			success, msg, steps, certPath := applyCertificate(acc, dom, req.IncludeWildcard)
			downloadURL := ""
			if success && certPath != "" {
				downloadURL = fmt.Sprintf("/api/certs/download/%s", filepath.Base(certPath))
			}
			results[idx] = CertResult{
				Domain:      dom,
				Success:     success,
				Message:     msg,
				Steps:       steps,
				CertPath:    certPath,
				DownloadURL: downloadURL,
			}
		}(i, domain)
	}

	wg.Wait()
	c.JSON(http.StatusOK, results)
}

func applyCertificate(acc *models.Account, domain string, includeWildcard bool) (bool, string, []string, string) {
	steps := []string{}
	
	acmeShPath := os.Getenv("HOME") + "/.acme.sh/acme.sh"
	if _, err := os.Stat(acmeShPath); os.IsNotExist(err) {
		steps = append(steps, "错误: acme.sh 未安装")
		return false, "acme.sh not installed", steps, ""
	}
	steps = append(steps, "✓ 检查 acme.sh 环境")

	certDir := filepath.Join("certs", domain)
	os.MkdirAll(certDir, 0755)
	steps = append(steps, "✓ 创建证书目录")

	domainArgs := []string{"-d", domain}
	domainList := domain
	if includeWildcard {
		domainArgs = append(domainArgs, "-d", "*."+domain)
		domainList = domain + " + *." + domain
	}
	steps = append(steps, fmt.Sprintf("✓ 准备申请域名: %s", domainList))

	cmd := exec.Command(acmeShPath, append([]string{
		"--issue",
		"--dns", "dns_cf",
	}, domainArgs...)...)

	cmd.Env = append(os.Environ(),
		fmt.Sprintf("CF_Key=%s", acc.Key),
		fmt.Sprintf("CF_Email=%s", acc.Email),
	)

	steps = append(steps, "→ 调用 acme.sh 申请证书...")
	output, err := cmd.CombinedOutput()
	if err != nil {
		errMsg := string(output)
		if strings.Contains(errMsg, "Domains not changed") {
			steps = append(steps, "✓ 证书已存在，准备安装")
			return installExistingCert(acmeShPath, domain, certDir, includeWildcard, steps)
		}
		steps = append(steps, "✗ 申请失败")
		steps = append(steps, fmt.Sprintf("错误详情: %s", errMsg))
		return false, "申请失败", steps, ""
	}

	steps = append(steps, "✓ 证书申请成功")
	return installExistingCert(acmeShPath, domain, certDir, includeWildcard, steps)
}

func installExistingCert(acmeShPath, domain, certDir string, includeWildcard bool, steps []string) (bool, string, []string, string) {
	domainArgs := []string{"-d", domain}
	if includeWildcard {
		domainArgs = append(domainArgs, "-d", "*."+domain)
	}

	steps = append(steps, "→ 安装证书文件...")
	installCmd := exec.Command(acmeShPath, append([]string{
		"--install-cert",
	}, append(domainArgs,
		"--cert-file", filepath.Join(certDir, "cert.pem"),
		"--key-file", filepath.Join(certDir, "key.pem"),
		"--fullchain-file", filepath.Join(certDir, "fullchain.pem"),
		"--ca-file", filepath.Join(certDir, "ca.pem"),
	)...)...)

	if output, err := installCmd.CombinedOutput(); err != nil {
		steps = append(steps, "✗ 证书安装失败")
		steps = append(steps, fmt.Sprintf("错误详情: %s", string(output)))
		return false, "安装失败", steps, ""
	}

	steps = append(steps, "✓ 证书文件安装完成")
	steps = append(steps, "→ 打包证书为 ZIP...")
	
	zipPath := certDir + ".zip"
	if err := zipCertFiles(certDir, zipPath); err != nil {
		steps = append(steps, "✗ ZIP 打包失败")
		return false, "打包失败", steps, certDir
	}

	steps = append(steps, "✓ 证书打包完成")
	steps = append(steps, "✓ 全部完成，可以下载")
	return true, "申请成功", steps, zipPath
}

func zipCertFiles(sourceDir, zipPath string) error {
	zipFile, err := os.Create(zipPath)
	if err != nil {
		return err
	}
	defer zipFile.Close()

	archive := zip.NewWriter(zipFile)
	defer archive.Close()

	files := []string{"cert.pem", "key.pem", "fullchain.pem", "ca.pem"}
	for _, file := range files {
		filePath := filepath.Join(sourceDir, file)
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			continue
		}

		f, err := os.Open(filePath)
		if err != nil {
			continue
		}
		defer f.Close()

		w, err := archive.Create(file)
		if err != nil {
			continue
		}

		if _, err := io.Copy(w, f); err != nil {
			continue
		}
	}

	return nil
}

func DownloadCert(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" || strings.Contains(filename, "..") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filename"})
		return
	}

	filePath := filepath.Join("certs", filename)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/zip")
	c.File(filePath)
}

func ListCerts(c *gin.Context) {
	certsDir := "certs"
	if _, err := os.Stat(certsDir); os.IsNotExist(err) {
		c.JSON(http.StatusOK, []gin.H{})
		return
	}

	files, err := ioutil.ReadDir(certsDir)
	if err != nil {
		c.JSON(http.StatusOK, []gin.H{})
		return
	}

	var certs []gin.H
	for _, file := range files {
		if strings.HasSuffix(file.Name(), ".zip") {
			domain := strings.TrimSuffix(file.Name(), ".zip")
			certs = append(certs, gin.H{
				"domain":      domain,
				"filename":    file.Name(),
				"size":        file.Size(),
				"modifiedAt":  file.ModTime().Format("2006-01-02 15:04:05"),
				"downloadUrl": fmt.Sprintf("/api/certs/download/%s", file.Name()),
			})
		}
	}

	if certs == nil {
		certs = []gin.H{}
	}

	c.JSON(http.StatusOK, certs)
}
