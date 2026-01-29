package config

import (
	"os"
	"gopkg.in/yaml.v3"
)

type Config struct {
	Admin struct {
		Username string `yaml:"username"`
		Password string `yaml:"password"`
	} `yaml:"admin"`
}

var GlobalConfig Config

func LoadConfig() error {
	data, err := os.ReadFile("config.yaml")
	if err != nil {
		return err
	}
	return yaml.Unmarshal(data, &GlobalConfig)
}
