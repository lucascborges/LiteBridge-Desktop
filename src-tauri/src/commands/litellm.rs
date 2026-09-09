use serde::{Deserialize, Serialize};
use std::time::Instant;
use url::Url;

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub latency_ms: u64,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LiteLLMModelItem {
    pub id: String,
    pub object: Option<String>,
    pub created: Option<i64>,
    pub owned_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelsResponse {
    pub data: Vec<LiteLLMModelItem>,
    pub total: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelProbeResult {
    pub model_id: String,
    pub success: bool,
    pub latency_ms: u64,
    pub error: Option<String>,
}

/// OWASP A03 / A10 - Sanitiza e valida URL do gateway prevenindo SSRF ou injeção de parâmetros maliciosos
pub fn validate_gateway_url(raw_url: &str) -> Result<String, String> {
    let trimmed = raw_url.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err("Gateway URL cannot be empty".to_string());
    }

    let parsed = Url::parse(trimmed).map_err(|e| format!("Invalid URL: {e}"))?;

    match parsed.scheme() {
        "http" | "https" => {}
        _ => return Err("URL scheme must be http or https".to_string()),
    }

    if parsed.host_str().is_none() {
        return Err("URL must have a valid host".to_string());
    }

    Ok(trimmed.to_string())
}

/// Mascara a chave de API para proteção estrita OWASP A02 (Sensitive Data Exposure)
pub fn mask_api_key(key: &str) -> String {
    let trimmed = key.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    if trimmed.len() <= 8 {
        return "********".to_string();
    }
    let prefix_len = 4.min(trimmed.len() / 4);
    let suffix_len = 4.min(trimmed.len() / 4);
    let prefix = &trimmed[..prefix_len];
    let suffix = &trimmed[trimmed.len() - suffix_len..];
    format!("{prefix}***{suffix}")
}

#[tauri::command]
pub async fn check_litellm_health(gateway_url: String, api_key: Option<String>) -> Result<HealthResponse, String> {
    let valid_url = validate_gateway_url(&gateway_url)?;
    let endpoint = format!("{valid_url}/health");

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| format!("HTTP client error: {e}"))?;

    let mut req = client.get(&endpoint);
    if let Some(key) = api_key {
        let trimmed_key = key.trim();
        if !trimmed_key.is_empty() {
            req = req.header("Authorization", format!("Bearer {trimmed_key}"));
        }
    }

    let start = Instant::now();
    let resp = req.send().await.map_err(|e| format!("Failed to reach LiteLLM at {endpoint}: {e}"))?;
    let elapsed = start.elapsed().as_millis() as u64;

    if resp.status().is_success() {
        Ok(HealthResponse {
            status: "connected".to_string(),
            latency_ms: elapsed,
            url: valid_url,
        })
    } else {
        Err(format!("LiteLLM /health returned status {}", resp.status()))
    }
}

#[tauri::command]
pub async fn fetch_litellm_models(gateway_url: String, api_key: Option<String>) -> Result<ModelsResponse, String> {
    let valid_url = validate_gateway_url(&gateway_url)?;
    let endpoint = format!("{valid_url}/v1/models");

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|e| format!("HTTP client error: {e}"))?;

    let mut req = client.get(&endpoint);
    if let Some(key) = api_key {
        let trimmed_key = key.trim();
        if !trimmed_key.is_empty() {
            req = req.header("Authorization", format!("Bearer {trimmed_key}"));
        }
    }

    let resp = req.send().await.map_err(|e| format!("Failed to fetch models from {endpoint}: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("LiteLLM /v1/models returned HTTP {}", resp.status()));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| format!("Invalid JSON response: {e}"))?;
    let empty_vec = Vec::new();
    let data_array = json.get("data").and_then(|d| d.as_array()).unwrap_or(&empty_vec);

    let models: Vec<LiteLLMModelItem> = data_array
        .iter()
        .filter_map(|item| {
            item.get("id").and_then(|id| id.as_str()).map(|id_str| LiteLLMModelItem {
                id: id_str.to_string(),
                object: item.get("object").and_then(|v| v.as_str()).map(|s| s.to_string()),
                created: item.get("created").and_then(|v| v.as_i64()),
                owned_by: item.get("owned_by").and_then(|v| v.as_str()).map(|s| s.to_string()),
            })
        })
        .collect();

    let total = models.len();
    Ok(ModelsResponse { data: models, total })
}

#[tauri::command]
pub async fn probe_model_latency(
    gateway_url: String,
    api_key: Option<String>,
    model_id: String,
) -> Result<ModelProbeResult, String> {
    let valid_url = validate_gateway_url(&gateway_url)?;
    let endpoint = format!("{valid_url}/v1/chat/completions");

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("HTTP client error: {e}"))?;

    let payload = serde_json::json!({
        "model": model_id,
        "messages": [
            {"role": "user", "content": "ping"}
        ],
        "max_tokens": 1
    });

    let mut req = client.post(&endpoint).json(&payload);
    if let Some(key) = api_key {
        let trimmed_key = key.trim();
        if !trimmed_key.is_empty() {
            req = req.header("Authorization", format!("Bearer {trimmed_key}"));
        }
    }

    let start = Instant::now();
    let result = req.send().await;
    let elapsed = start.elapsed().as_millis() as u64;

    match result {
        Ok(resp) => {
            if resp.status().is_success() {
                Ok(ModelProbeResult {
                    model_id,
                    success: true,
                    latency_ms: elapsed,
                    error: None,
                })
            } else {
                Ok(ModelProbeResult {
                    model_id,
                    success: false,
                    latency_ms: elapsed,
                    error: Some(format!("HTTP {}", resp.status())),
                })
            }
        }
        Err(e) => Ok(ModelProbeResult {
            model_id,
            success: false,
            latency_ms: elapsed,
            error: Some(e.to_string()),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_gateway_url() {
        assert!(validate_gateway_url("http://localhost:4000").is_ok());
        assert!(validate_gateway_url("https://127.0.0.1:8787/").is_ok());
        assert_eq!(
            validate_gateway_url("http://127.0.0.1:4000/").unwrap(),
            "http://127.0.0.1:4000"
        );
        assert!(validate_gateway_url("ftp://localhost:4000").is_err());
        assert!(validate_gateway_url("invalid-url").is_err());
        assert!(validate_gateway_url("").is_err());
    }

    #[test]
    fn test_mask_api_key() {
        assert_eq!(mask_api_key("sk-litellm-virtual-team-key-9842"), "sk-l***9842");
        assert_eq!(mask_api_key("12345"), "********");
        assert_eq!(mask_api_key(""), "");
    }
}
