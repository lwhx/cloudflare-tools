package handler

import (
	"cloudflare-tools/server/config"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var JwtSecret []byte
var loginAttempts = make(map[string]*LoginAttempt)
var attemptsMutex sync.RWMutex

type LoginAttempt struct {
	Count      int
	LastAttempt time.Time
	LockedUntil time.Time
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func init() {
	secret := []byte("cf-tools-secret-change-in-production")
	JwtSecret = secret
}

func GenerateRandomSecret() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}

	if req.Username == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户名和密码不能为空"})
		return
	}

	clientIP := c.ClientIP()
	
	attemptsMutex.Lock()
	attempt, exists := loginAttempts[clientIP]
	if !exists {
		attempt = &LoginAttempt{}
		loginAttempts[clientIP] = attempt
	}

	if time.Now().Before(attempt.LockedUntil) {
		remainingTime := int(time.Until(attempt.LockedUntil).Minutes())
		attemptsMutex.Unlock()
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error": "登录失败次数过多，请稍后再试",
			"locked_minutes": remainingTime + 1,
		})
		return
	}

	if time.Since(attempt.LastAttempt) > 15*time.Minute {
		attempt.Count = 0
	}
	attemptsMutex.Unlock()

	if req.Username != config.GlobalConfig.Admin.Username || req.Password != config.GlobalConfig.Admin.Password {
		attemptsMutex.Lock()
		attempt.Count++
		attempt.LastAttempt = time.Now()
		
		if attempt.Count >= 5 {
			attempt.LockedUntil = time.Now().Add(15 * time.Minute)
			attemptsMutex.Unlock()
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "登录失败次数过多，账户已锁定15分钟",
			})
			return
		}
		attemptsMutex.Unlock()

		remainingAttempts := 5 - attempt.Count
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "用户名或密码错误",
			"remaining_attempts": remainingAttempts,
		})
		return
	}

	attemptsMutex.Lock()
	delete(loginAttempts, clientIP)
	attemptsMutex.Unlock()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user": req.Username,
		"ip":   clientIP,
		"iat":  time.Now().Unix(),
		"exp":  time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString(JwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成令牌失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"expires_in": 86400,
	})
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未提供认证令牌"})
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return JwtSecret, nil
		})

		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "令牌无效或已过期"})
			return
		}

		if !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "令牌验证失败"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "令牌格式错误"})
			return
		}

		if exp, ok := claims["exp"].(float64); ok {
			if time.Now().Unix() > int64(exp) {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "令牌已过期，请重新登录"})
				return
			}
		}

		c.Set("user", claims["user"])
		c.Next()
	}
}
