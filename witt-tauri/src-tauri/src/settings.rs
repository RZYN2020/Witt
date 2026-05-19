const SERVICE: &str = "Witt";
const LLM_KEY: &str = "llm_api_key";

pub fn save_llm_api_key(api_key: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE, LLM_KEY).map_err(|error| error.to_string())?;
    entry.set_password(api_key).map_err(|error| error.to_string())
}

pub fn has_llm_api_key() -> bool {
    keyring::Entry::new(SERVICE, LLM_KEY)
        .and_then(|entry| entry.get_password())
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false)
}
