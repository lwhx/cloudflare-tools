package models

import (
	"encoding/json"
	"os"
	"sync"
)

type Account struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Key   string `json:"key"`
	Name  string `json:"name"`
}

var (
	Accounts []Account
	mu       sync.Mutex
)

func LoadAccounts() error {
	data, err := os.ReadFile("accounts.json")
	if err != nil {
		if os.IsNotExist(err) {
			Accounts = []Account{}
			return nil
		}
		return err
	}
	return json.Unmarshal(data, &Accounts)
}

func SaveAccounts() error {
	mu.Lock()
	defer mu.Unlock()
	data, err := json.MarshalIndent(Accounts, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile("accounts.json", data, 0644)
}
