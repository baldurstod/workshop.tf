package main

type Config struct {
	HTTPS    `json:"https"`
	Sessions `json:"sessions"`
	Steam    `json:"steam"`
}

type HTTPS struct {
	Port          int    `json:"port"`
	HttpsKeyFile  string `json:"https_key_file"`
	HttpsCertFile string `json:"https_cert_file"`
}

type Database struct {
	Datasource string `json:"datasource"`
}

type Sessions struct {
	DB          Database `json:"db"`
	Secret      string   `json:"secret"`
	SessionName string   `json:"session_name"`
}

type Steam struct {
	ApiKey string `json:"api_key"`
}
