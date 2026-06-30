use axum::body::Body;
use axum::extract::{DefaultBodyLimit, Multipart, Path, Query, Request, State};
use axum::http::{header, HeaderMap, HeaderValue, StatusCode};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post, put};
use axum::{Json, Router};
use chrono::Utc;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::path::{Path as FsPath, PathBuf};
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::trace::TraceLayer;
use uuid::Uuid;
use witt_core::models::*;
use witt_core::sync::{sync_annotations_to_anki as core_sync_annotations_to_anki, SyncInput};
use witt_storage::{books, db};

#[derive(Clone)]
pub struct ServerConfig {
    pub bind: SocketAddr,
    pub data_dir: PathBuf,
    pub static_dir: PathBuf,
    pub token: String,
    pub llm_api_key: Option<String>,
}

#[derive(Clone)]
struct AppState {
    conn: Arc<Mutex<Connection>>,
    books_dir: PathBuf,
    config_path: PathBuf,
    token: Arc<String>,
    llm_api_key: Arc<Mutex<Option<String>>>,
}

#[derive(Debug)]
struct ApiError {
    status: StatusCode,
    message: String,
}

impl ApiError {
    fn bad_request(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            message: message.into(),
        }
    }

    fn not_found(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::NOT_FOUND,
            message: message.into(),
        }
    }

    fn internal(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: message.into(),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let body = Json(serde_json::json!({ "error": self.message }));
        (self.status, body).into_response()
    }
}

impl From<String> for ApiError {
    fn from(value: String) -> Self {
        ApiError::internal(value)
    }
}

type ApiResult<T> = Result<T, ApiError>;

pub async fn run_from_env() -> Result<(), String> {
    let config = config_from_env()?;
    run(config).await
}

pub async fn run(config: ServerConfig) -> Result<(), String> {
    let state = init_state(&config)?;
    let app = router(state, &config.static_dir);
    let listener = tokio::net::TcpListener::bind(config.bind)
        .await
        .map_err(|error| error.to_string())?;
    println!("Witt web server listening on http://{}", config.bind);
    axum::serve(listener, app)
        .await
        .map_err(|error| error.to_string())
}

pub fn router_for_tests(data_dir: PathBuf, token: String) -> Result<Router, String> {
    let config = ServerConfig {
        bind: "127.0.0.1:0".parse().expect("test address"),
        static_dir: PathBuf::from("witt-tauri/ui/dist"),
        data_dir,
        token,
        llm_api_key: None,
    };
    let state = init_state(&config)?;
    Ok(api_router(state))
}

#[cfg(test)]
fn test_state(data_dir: PathBuf, token: String) -> Result<AppState, String> {
    let config = ServerConfig {
        bind: "127.0.0.1:0".parse().expect("test address"),
        static_dir: PathBuf::from("witt-tauri/ui/dist"),
        data_dir,
        token,
        llm_api_key: None,
    };
    init_state(&config)
}

#[cfg(test)]
fn router_from_state_for_tests(state: AppState) -> Router {
    api_router(state)
}

fn config_from_env() -> Result<ServerConfig, String> {
    let token = std::env::var("WITT_WEB_TOKEN")
        .map_err(|_| "Set WITT_WEB_TOKEN before starting witt-server".to_string())?;
    if token.trim().is_empty() {
        return Err("WITT_WEB_TOKEN must not be empty".to_string());
    }
    let bind = std::env::var("WITT_BIND")
        .unwrap_or_else(|_| "127.0.0.1:8787".to_string())
        .parse::<SocketAddr>()
        .map_err(|error| format!("Invalid WITT_BIND: {error}"))?;
    let data_dir = std::env::var("WITT_DATA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(".witt-data"));
    let static_dir = std::env::var("WITT_STATIC_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("witt-tauri/ui/dist"));
    let llm_api_key = std::env::var("WITT_LLM_API_KEY")
        .ok()
        .filter(|value| !value.trim().is_empty());
    Ok(ServerConfig {
        bind,
        data_dir,
        static_dir,
        token,
        llm_api_key,
    })
}

fn init_state(config: &ServerConfig) -> Result<AppState, String> {
    let storage = witt_storage::state::StorageState::new(&config.data_dir)?;
    storage.seed_settings()?;
    Ok(AppState {
        conn: Arc::new(Mutex::new(storage.conn)),
        books_dir: storage.books_dir,
        config_path: storage.config_path,
        token: Arc::new(config.token.clone()),
        llm_api_key: Arc::new(Mutex::new(config.llm_api_key.clone())),
    })
}

fn router(state: AppState, static_dir: &FsPath) -> Router {
    let index = static_dir.join("index.html");
    api_router(state)
        .nest_service(
            "/",
            ServeDir::new(static_dir).not_found_service(ServeFile::new(index)),
        )
        .layer(TraceLayer::new_for_http())
}

fn api_router(state: AppState) -> Router {
    let protected = Router::new()
        .route("/health", get(health))
        .route("/settings", get(get_settings).put(save_settings))
        .route("/config", get(get_app_config).put(save_app_config))
        .route("/config/reload", post(reload_app_config))
        .route("/prompts", get(list_prompt_profiles))
        .route(
            "/prompts/:prompt_id",
            get(read_prompt_profile).put(save_prompt_profile),
        )
        .route("/pipelines", get(list_pipeline_profiles))
        .route(
            "/pipelines/:pipeline_id",
            get(read_pipeline_profile).put(save_pipeline_profile),
        )
        .route("/pipelines/:pipeline_id/load", post(load_pipeline_profile))
        .route("/books", get(list_books).post(upload_book))
        .route("/books/:book_id", get(get_book).delete(remove_book))
        .route("/books/:book_id/file", get(get_book_file))
        .route(
            "/books/:book_id/progress",
            get(get_progress).put(save_progress),
        )
        .route(
            "/annotations",
            get(list_annotations).post(create_annotation),
        )
        .route(
            "/annotations/:annotation_id",
            put(update_annotation).delete(delete_annotation),
        )
        .route("/vocabulary", get(list_vocabulary))
        .route("/vocabulary/:word/status", put(update_vocabulary_status))
        .route("/word-occurrences/:word", get(list_word_occurrences))
        .route("/meaning-groups/:word", get(list_meaning_groups))
        .route(
            "/dictionary-cache",
            get(get_dictionary_cache).put(save_dictionary_cache),
        )
        .route("/anki/status", get(check_anki))
        .route("/anki/decks", get(list_anki_decks))
        .route("/anki/decks/select", post(select_anki_deck))
        .route("/anki/models", get(list_anki_models))
        .route("/anki/cache/refresh", post(refresh_anki_cache))
        .route("/anki/notes", get(search_anki_notes))
        .route("/anki/notes/:note_id", get(get_anki_note))
        .route("/anki/conflicts", get(list_anki_sync_conflicts))
        .route("/anki/sync", post(sync_annotations_to_anki))
        .route("/anki/sync-web", post(sync_anki_web))
        .route("/anki/export.tsv", get(export_annotations_tsv))
        .route("/llm/selection", post(ask_llm_about_selection))
        .route("/llm/key", get(get_llm_key).put(save_llm_key))
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            require_bearer,
        ))
        .layer(DefaultBodyLimit::max(100 * 1024 * 1024));

    Router::new().nest("/api", protected).with_state(state)
}

async fn require_bearer(
    State(state): State<AppState>,
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let expected = format!("Bearer {}", state.token);
    let authorized = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value == expected);
    if !authorized {
        return Err(StatusCode::UNAUTHORIZED);
    }
    Ok(next.run(request).await)
}

async fn health(State(state): State<AppState>) -> ApiResult<Json<serde_json::Value>> {
    let settings = current_settings(&state).await?;
    let anki = witt_core::anki_connect::check_anki(&settings.anki_endpoint).await;
    Ok(Json(serde_json::json!({
        "ok": true,
        "anki": anki,
    })))
}

async fn get_settings(State(state): State<AppState>) -> ApiResult<Json<AppSettings>> {
    Ok(Json(current_settings(&state).await?))
}

async fn save_settings(
    State(state): State<AppState>,
    Json(settings): Json<AppSettings>,
) -> ApiResult<StatusCode> {
    let conn = state.conn.lock().await;
    db::save_settings(&conn, &settings)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn get_app_config(State(state): State<AppState>) -> ApiResult<Json<AppConfig>> {
    Ok(Json(ensure_app_config(&state).await?))
}

async fn save_app_config(
    State(state): State<AppState>,
    Json(config): Json<AppConfig>,
) -> ApiResult<Json<AppConfig>> {
    write_app_config(&state, &config)?;
    let config = read_app_config(&state)?;
    let settings = witt_core::app_config::settings_from_config(&config);
    let conn = state.conn.lock().await;
    db::save_settings(&conn, &settings)?;
    Ok(Json(config))
}

async fn reload_app_config(State(state): State<AppState>) -> ApiResult<Json<AppSettings>> {
    let config = ensure_app_config(&state).await?;
    let settings = witt_core::app_config::settings_from_config(&config);
    let conn = state.conn.lock().await;
    db::save_settings(&conn, &settings)?;
    Ok(Json(settings))
}

async fn list_prompt_profiles(
    State(state): State<AppState>,
) -> ApiResult<Json<Vec<PromptProfile>>> {
    let config = ensure_app_config(&state).await?;
    Ok(Json(witt_core::app_config::list_prompts(
        &config,
        state.config_path.to_string_lossy().to_string(),
    )))
}

async fn list_pipeline_profiles(
    State(state): State<AppState>,
) -> ApiResult<Json<Vec<PipelineProfile>>> {
    let config = ensure_app_config(&state).await?;
    Ok(Json(witt_core::app_config::list_pipelines(
        &config,
        state.config_path.to_string_lossy().to_string(),
    )))
}

async fn read_prompt_profile(
    State(state): State<AppState>,
    Path(prompt_id): Path<String>,
) -> ApiResult<String> {
    let config = ensure_app_config(&state).await?;
    witt_core::app_config::read_prompt(&config, &prompt_id).map_err(ApiError::bad_request)
}

async fn save_prompt_profile(
    State(state): State<AppState>,
    Path(prompt_id): Path<String>,
    body: String,
) -> ApiResult<StatusCode> {
    let mut config = ensure_app_config(&state).await?;
    witt_core::app_config::save_prompt(&mut config, &prompt_id, &body)
        .map_err(ApiError::bad_request)?;
    write_app_config(&state, &config)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn read_pipeline_profile(
    State(state): State<AppState>,
    Path(pipeline_id): Path<String>,
) -> ApiResult<String> {
    let config = ensure_app_config(&state).await?;
    witt_core::app_config::read_pipeline(&config, &pipeline_id).map_err(ApiError::bad_request)
}

async fn save_pipeline_profile(
    State(state): State<AppState>,
    Path(pipeline_id): Path<String>,
    body: String,
) -> ApiResult<StatusCode> {
    let mut config = ensure_app_config(&state).await?;
    witt_core::app_config::save_pipeline(&mut config, &pipeline_id, &body)
        .map_err(ApiError::bad_request)?;
    write_app_config(&state, &config)?;
    Ok(StatusCode::NO_CONTENT)
}

async fn load_pipeline_profile(
    State(state): State<AppState>,
    Path(pipeline_id): Path<String>,
) -> ApiResult<Json<AppSettings>> {
    let mut config = ensure_app_config(&state).await?;
    let settings = witt_core::app_config::load_pipeline_settings(&mut config, &pipeline_id);
    write_app_config(&state, &config)?;
    let conn = state.conn.lock().await;
    db::save_settings(&conn, &settings)?;
    Ok(Json(settings))
}

async fn list_books(State(state): State<AppState>) -> ApiResult<Json<Vec<Book>>> {
    let conn = state.conn.lock().await;
    Ok(Json(db::list_books(&conn)?))
}

async fn upload_book(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> ApiResult<Json<Book>> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|error| ApiError::bad_request(error.to_string()))?
    {
        if field.name() != Some("file") {
            continue;
        }
        let filename = field
            .file_name()
            .map(str::to_string)
            .unwrap_or_else(|| "upload.epub".to_string());
        if !filename.to_lowercase().ends_with(".epub") {
            return Err(ApiError::bad_request("Only EPUB files can be imported"));
        }
        let bytes = field
            .bytes()
            .await
            .map_err(|error| ApiError::bad_request(error.to_string()))?;
        let imported = import_uploaded_book(&state.books_dir, &filename, &bytes)?;
        let conn = state.conn.lock().await;
        db::insert_book(&conn, &imported)?;
        return Ok(Json(imported));
    }
    Err(ApiError::bad_request("Missing multipart file field"))
}

async fn get_book(
    State(state): State<AppState>,
    Path(book_id): Path<String>,
) -> ApiResult<Json<Book>> {
    let conn = state.conn.lock().await;
    let book =
        db::get_book(&conn, &book_id)?.ok_or_else(|| ApiError::not_found("Book not found"))?;
    Ok(Json(book))
}

async fn remove_book(
    State(state): State<AppState>,
    Path(book_id): Path<String>,
) -> ApiResult<StatusCode> {
    let book = {
        let conn = state.conn.lock().await;
        let book = db::get_book(&conn, &book_id)?;
        db::remove_book(&conn, &book_id)?;
        book
    };
    if let Some(book) = book {
        let _ = std::fs::remove_file(book.file_path);
    }
    Ok(StatusCode::NO_CONTENT)
}

async fn get_book_file(
    State(state): State<AppState>,
    Path(book_id): Path<String>,
) -> ApiResult<Response> {
    let book = {
        let conn = state.conn.lock().await;
        db::get_book(&conn, &book_id)?.ok_or_else(|| ApiError::not_found("Book not found"))?
    };
    let bytes = books::read_book_bytes(&book.file_path)?;
    let mut response = Response::new(Body::from(bytes));
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/epub+zip"),
    );
    Ok(response)
}

async fn get_progress(
    State(state): State<AppState>,
    Path(book_id): Path<String>,
) -> ApiResult<Json<Option<ReadingProgress>>> {
    let conn = state.conn.lock().await;
    Ok(Json(db::get_progress(&conn, &book_id)?))
}

async fn save_progress(
    State(state): State<AppState>,
    Path(book_id): Path<String>,
    Json(mut progress): Json<ReadingProgress>,
) -> ApiResult<StatusCode> {
    progress.book_id = book_id;
    progress.updated_at = Utc::now().to_rfc3339();
    let conn = state.conn.lock().await;
    db::save_progress(&conn, &progress)?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
struct AnnotationQuery {
    book_id: Option<String>,
}

async fn list_annotations(
    State(state): State<AppState>,
    Query(query): Query<AnnotationQuery>,
) -> ApiResult<Json<Vec<Annotation>>> {
    let conn = state.conn.lock().await;
    Ok(Json(db::list_annotations(&conn, query.book_id.as_deref())?))
}

async fn create_annotation(
    State(state): State<AppState>,
    Json(draft): Json<AnnotationDraft>,
) -> ApiResult<Json<Annotation>> {
    let now = Utc::now().to_rfc3339();
    let annotation = Annotation {
        id: Uuid::new_v4().to_string(),
        book_id: draft.book_id,
        word: draft.word,
        sentence: draft.sentence,
        chapter_title: draft.chapter_title,
        epub_cfi: draft.epub_cfi,
        status: "queued".to_string(),
        anki_note_id: None,
        created_at: now.clone(),
        updated_at: now,
    };
    let conn = state.conn.lock().await;
    db::insert_annotation(&conn, &annotation)?;
    Ok(Json(annotation))
}

async fn update_annotation(
    State(state): State<AppState>,
    Path(annotation_id): Path<String>,
    Json(mut update): Json<AnnotationUpdate>,
) -> ApiResult<Json<Annotation>> {
    update.id = annotation_id;
    let conn = state.conn.lock().await;
    Ok(Json(db::update_annotation(
        &conn,
        &update,
        &Utc::now().to_rfc3339(),
    )?))
}

async fn delete_annotation(
    State(state): State<AppState>,
    Path(annotation_id): Path<String>,
) -> ApiResult<StatusCode> {
    let conn = state.conn.lock().await;
    db::delete_queued_annotation(&conn, &annotation_id)?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
struct VocabularyQuery {
    query: Option<String>,
    book_id: Option<String>,
}

async fn list_vocabulary(
    State(state): State<AppState>,
    Query(query): Query<VocabularyQuery>,
) -> ApiResult<Json<Vec<VocabularyEntry>>> {
    let conn = state.conn.lock().await;
    Ok(Json(db::list_vocabulary(
        &conn,
        query.query.as_deref(),
        query.book_id.as_deref(),
    )?))
}

#[derive(Deserialize)]
struct VocabularyStatusPayload {
    status: String,
}

async fn update_vocabulary_status(
    State(state): State<AppState>,
    Path(word): Path<String>,
    Json(payload): Json<VocabularyStatusPayload>,
) -> ApiResult<Json<Option<VocabularyEntry>>> {
    let conn = state.conn.lock().await;
    Ok(Json(db::update_vocabulary_status(
        &conn,
        &word,
        &payload.status,
        &Utc::now().to_rfc3339(),
    )?))
}

async fn list_word_occurrences(
    State(state): State<AppState>,
    Path(word): Path<String>,
) -> ApiResult<Json<Vec<WordOccurrence>>> {
    let conn = state.conn.lock().await;
    Ok(Json(db::list_word_occurrences(&conn, &word)?))
}

async fn list_meaning_groups(
    State(state): State<AppState>,
    Path(word): Path<String>,
) -> ApiResult<Json<Vec<MeaningGroup>>> {
    let conn = state.conn.lock().await;
    Ok(Json(db::list_meaning_groups(&conn, &word)?))
}

#[derive(Deserialize)]
struct DictionaryQuery {
    word: String,
    prompt_id: Option<String>,
}

async fn get_dictionary_cache(
    State(state): State<AppState>,
    Query(query): Query<DictionaryQuery>,
) -> ApiResult<Json<Option<DictionaryCacheEntry>>> {
    let conn = state.conn.lock().await;
    Ok(Json(db::get_dictionary_cache(
        &conn,
        &query.word,
        query.prompt_id.as_deref(),
    )?))
}

async fn save_dictionary_cache(
    State(state): State<AppState>,
    Json(draft): Json<DictionaryCacheDraft>,
) -> ApiResult<Json<DictionaryCacheEntry>> {
    let conn = state.conn.lock().await;
    Ok(Json(db::save_dictionary_cache(
        &conn,
        &draft,
        &Utc::now().to_rfc3339(),
    )?))
}

async fn check_anki(State(state): State<AppState>) -> ApiResult<Json<AnkiStatus>> {
    let settings = current_settings(&state).await?;
    Ok(Json(
        witt_core::anki_connect::check_anki(&settings.anki_endpoint).await,
    ))
}

async fn list_anki_decks(State(state): State<AppState>) -> ApiResult<Json<Vec<AnkiDeck>>> {
    let settings = current_settings(&state).await?;
    if let Ok(remote_decks) = witt_core::anki_connect::fetch_decks(&settings.anki_endpoint).await {
        let conn = state.conn.lock().await;
        let selected = db::selected_deck(&conn)?;
        for name in remote_decks {
            db::upsert_deck(
                &conn,
                &AnkiDeck {
                    selected: selected.as_deref() == Some(name.as_str()),
                    name,
                    synced_at: None,
                },
            )?;
        }
    }
    let conn = state.conn.lock().await;
    Ok(Json(db::list_decks(&conn)?))
}

async fn list_anki_models(State(state): State<AppState>) -> ApiResult<Json<Vec<AnkiModelInfo>>> {
    let settings = current_settings(&state).await?;
    Ok(Json(
        witt_core::anki_connect::fetch_models(&settings.anki_endpoint).await?,
    ))
}

#[derive(Deserialize)]
struct SelectDeckPayload {
    deck_name: String,
}

async fn select_anki_deck(
    State(state): State<AppState>,
    Json(payload): Json<SelectDeckPayload>,
) -> ApiResult<StatusCode> {
    let conn = state.conn.lock().await;
    db::select_deck(&conn, &payload.deck_name)?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
struct RefreshCachePayload {
    deck_name: String,
}

async fn refresh_anki_cache(
    State(state): State<AppState>,
    Json(payload): Json<RefreshCachePayload>,
) -> ApiResult<Json<Vec<AnkiNote>>> {
    let settings = current_settings(&state).await?;
    let notes =
        witt_core::anki_connect::fetch_notes(&settings.anki_endpoint, &payload.deck_name).await?;
    let synced_at = Utc::now().to_rfc3339();
    let mut conn = state.conn.lock().await;
    db::replace_anki_notes(
        &mut conn,
        &payload.deck_name,
        &settings.anki_model_name,
        &notes,
        &synced_at,
    )?;
    Ok(Json(notes))
}

#[derive(Deserialize)]
struct SearchNotesQuery {
    deck_name: Option<String>,
    query: Option<String>,
}

async fn search_anki_notes(
    State(state): State<AppState>,
    Query(query): Query<SearchNotesQuery>,
) -> ApiResult<Json<Vec<AnkiNote>>> {
    let conn = state.conn.lock().await;
    let selected = if query.deck_name.is_none() {
        db::selected_deck(&conn)?
    } else {
        query.deck_name
    };
    Ok(Json(db::search_anki_notes(
        &conn,
        selected.as_deref(),
        query.query.as_deref(),
    )?))
}

async fn get_anki_note(
    State(state): State<AppState>,
    Path(note_id): Path<i64>,
) -> ApiResult<Json<Option<AnkiNote>>> {
    let conn = state.conn.lock().await;
    Ok(Json(db::get_anki_note(&conn, note_id)?))
}

async fn list_anki_sync_conflicts(
    State(state): State<AppState>,
) -> ApiResult<Json<Vec<AnkiSyncConflict>>> {
    let conn = state.conn.lock().await;
    let selected = db::selected_deck(&conn)?;
    Ok(Json(db::list_anki_sync_conflicts(
        &conn,
        selected.as_deref(),
    )?))
}

async fn sync_annotations_to_anki(State(state): State<AppState>) -> ApiResult<Json<SyncSummary>> {
    let (settings, deck_name, annotations) = {
        let conn = state.conn.lock().await;
        let settings = db::get_settings(&conn)?;
        let deck_name = db::selected_deck(&conn)?
            .ok_or_else(|| ApiError::bad_request("Select an Anki deck first"))?;
        let annotations = db::list_annotations(&conn, None)?
            .into_iter()
            .filter(|annotation| annotation.status != "synced")
            .collect::<Vec<_>>();
        (settings, deck_name, annotations)
    };
    if annotations.is_empty() {
        return Ok(Json(SyncSummary {
            created: 0,
            failed: Vec::new(),
            anki_web_sync: AnkiWebSyncState::NotRequested,
            anki_web_sync_error: None,
        }));
    }
    let (summary, synced) = core_sync_annotations_to_anki(SyncInput {
        push_anki_web: settings.anki_auto_sync_web,
        settings,
        deck_name,
        annotations,
        llm_api_key: state.llm_api_key.lock().await.clone(),
    })
    .await?;
    let now = Utc::now().to_rfc3339();
    let conn = state.conn.lock().await;
    for (annotation_id, note_id) in synced {
        db::mark_annotation_synced(&conn, &annotation_id, note_id, &now)?;
    }
    Ok(Json(summary))
}

async fn sync_anki_web(State(state): State<AppState>) -> ApiResult<Json<SyncSummary>> {
    let settings = current_settings(&state).await?;
    let mut summary = SyncSummary {
        created: 0,
        failed: Vec::new(),
        anki_web_sync: AnkiWebSyncState::NotRequested,
        anki_web_sync_error: None,
    };
    match witt_core::anki_connect::sync_anki_web(&settings.anki_endpoint).await {
        Ok(()) => summary.anki_web_sync = AnkiWebSyncState::Synced,
        Err(error) => {
            summary.anki_web_sync = AnkiWebSyncState::Failed;
            summary.anki_web_sync_error = Some(error);
        }
    }
    Ok(Json(summary))
}

async fn export_annotations_tsv(State(state): State<AppState>) -> ApiResult<Response> {
    let (settings, annotations) = {
        let conn = state.conn.lock().await;
        let settings = db::get_settings(&conn)?;
        let annotations = db::list_annotations(&conn, None)?
            .into_iter()
            .filter(|a| a.status != "synced")
            .collect::<Vec<_>>();
        (settings, annotations)
    };
    let fields: Vec<&str> = [
        settings.anki_word_field.as_str(),
        settings.anki_sentence_field.as_str(),
        settings.anki_book_field.as_str(),
        settings.anki_chapter_field.as_str(),
        settings.anki_meaning_field.as_str(),
    ]
    .into_iter()
    .filter(|f| !f.trim().is_empty())
    .collect();
    let mut tsv = String::from(fields.join("\t"));
    tsv.push('\n');
    for annotation in &annotations {
        let values = witt_core::anki_notes::export_fields(&settings, annotation);
        let row: Vec<String> = fields
            .iter()
            .map(|f| {
                let v = values.get(*f).map(String::as_str).unwrap_or_default();
                v.replace(['\t', '\r'], " ").replace('\n', "<br>")
            })
            .collect();
        tsv.push_str(&row.join("\t"));
        tsv.push('\n');
    }
    Ok(Response::builder()
        .header("Content-Type", "text/tab-separated-values; charset=utf-8")
        .header(
            "Content-Disposition",
            format!(
                "attachment; filename=\"witt-anki-export-{}.tsv\"",
                Utc::now().format("%Y%m%d-%H%M%S")
            ),
        )
        .body(Body::from(tsv))
        .unwrap())
}

async fn ask_llm_about_selection(
    State(state): State<AppState>,
    Json(request): Json<SelectionLlmRequest>,
) -> ApiResult<Json<String>> {
    let api_key_guard = state.llm_api_key.lock().await;
    let api_key = api_key_guard
        .as_deref()
        .ok_or_else(|| ApiError::bad_request("Set WITT_LLM_API_KEY before using Ask AI"))?;
    let settings = current_settings(&state).await?;
    Ok(Json(
        witt_core::llm::ask_selection(&settings, api_key, &request).await?,
    ))
}

#[derive(Deserialize)]
struct LlmKeyPayload {
    api_key: String,
}

#[derive(Serialize)]
struct LlmKeyStatus {
    configured: bool,
}

async fn get_llm_key(State(state): State<AppState>) -> ApiResult<Json<LlmKeyStatus>> {
    let configured = state.llm_api_key.lock().await.is_some();
    Ok(Json(LlmKeyStatus { configured }))
}

async fn save_llm_key(
    State(state): State<AppState>,
    Json(payload): Json<LlmKeyPayload>,
) -> ApiResult<StatusCode> {
    let mut key = state.llm_api_key.lock().await;
    *key = Some(payload.api_key);
    Ok(StatusCode::NO_CONTENT)
}

async fn current_settings(state: &AppState) -> ApiResult<AppSettings> {
    let conn = state.conn.lock().await;
    Ok(db::get_settings(&conn)?)
}

async fn ensure_app_config(state: &AppState) -> ApiResult<AppConfig> {
    if state.config_path.exists() {
        return read_app_config(state);
    }
    let settings = current_settings(state).await?;
    let config = witt_core::app_config::config_from_settings(&settings);
    write_app_config(state, &config)?;
    read_app_config(state)
}

fn read_app_config(state: &AppState) -> ApiResult<AppConfig> {
    let raw = std::fs::read_to_string(&state.config_path)
        .map_err(|error| ApiError::internal(error.to_string()))?;
    let mut config: AppConfig =
        toml::from_str(&raw).map_err(|error| ApiError::bad_request(error.to_string()))?;
    witt_core::app_config::normalize_config(&mut config);
    Ok(config)
}

fn write_app_config(state: &AppState, config: &AppConfig) -> ApiResult<()> {
    let mut normalized = config.clone();
    witt_core::app_config::normalize_config(&mut normalized);
    let content = toml::to_string_pretty(&normalized)
        .map_err(|error| ApiError::internal(error.to_string()))?;
    if let Some(parent) = state.config_path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| ApiError::internal(error.to_string()))?;
    }
    std::fs::write(&state.config_path, content)
        .map_err(|error| ApiError::internal(error.to_string()))
}

fn import_uploaded_book(books_dir: &FsPath, filename: &str, bytes: &[u8]) -> ApiResult<Book> {
    std::fs::create_dir_all(books_dir).map_err(|error| ApiError::internal(error.to_string()))?;
    let id = Uuid::new_v4().to_string();
    let target = books_dir.join(format!("{id}.epub"));
    std::fs::write(&target, bytes).map_err(|error| ApiError::internal(error.to_string()))?;
    let title = FsPath::new(filename)
        .file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("Untitled")
        .to_string();
    let now = Utc::now().to_rfc3339();
    Ok(Book {
        id,
        title,
        author: "Unknown author".to_string(),
        file_path: target.to_string_lossy().to_string(),
        cover_path: None,
        imported_at: now.clone(),
        updated_at: now,
    })
}

#[cfg(test)]
mod tests {
    use super::{router_for_tests, router_from_state_for_tests, test_state};
    use axum::body::Body;
    use axum::http::{header, Request, StatusCode};
    use axum::Json;
    use serde_json::{json, Value};
    use tokio::net::TcpListener;
    use tower::ServiceExt;
    use witt_core::models::{Annotation, AnnotationDraft, Book, SyncSummary};
    use witt_storage::db;

    #[tokio::test]
    async fn rejects_missing_bearer_token() {
        let dir = std::env::temp_dir().join(format!("witt-server-test-{}", uuid::Uuid::new_v4()));
        let app = router_for_tests(dir.clone(), "secret".to_string()).expect("router");
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/books")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        let _ = std::fs::remove_dir_all(dir);
    }

    #[tokio::test]
    async fn accepts_correct_bearer_token() {
        let dir = std::env::temp_dir().join(format!("witt-server-test-{}", uuid::Uuid::new_v4()));
        let app = router_for_tests(dir.clone(), "secret".to_string()).expect("router");
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/books")
                    .header(header::AUTHORIZATION, "Bearer secret")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);
        let _ = std::fs::remove_dir_all(dir);
    }

    #[tokio::test]
    async fn uploads_and_serves_epub_bytes() {
        let dir = std::env::temp_dir().join(format!("witt-server-test-{}", uuid::Uuid::new_v4()));
        let app = router_for_tests(dir.clone(), "secret".to_string()).expect("router");
        let boundary = "witt-boundary";
        let body = format!(
            "--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"Example.epub\"\r\nContent-Type: application/epub+zip\r\n\r\nepub-bytes\r\n--{boundary}--\r\n"
        );
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/books")
                    .header(header::AUTHORIZATION, "Bearer secret")
                    .header(
                        header::CONTENT_TYPE,
                        format!("multipart/form-data; boundary={boundary}"),
                    )
                    .body(Body::from(body))
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);
        let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("body");
        let book: Book = serde_json::from_slice(&bytes).expect("book json");
        assert_eq!(book.title, "Example");

        let response = app
            .oneshot(
                Request::builder()
                    .uri(format!("/api/books/{}/file", book.id))
                    .header(header::AUTHORIZATION, "Bearer secret")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);
        let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("body");
        assert_eq!(&bytes[..], b"epub-bytes");
        let _ = std::fs::remove_dir_all(dir);
    }

    #[tokio::test]
    #[ignore = "binds a localhost mock AnkiConnect server"]
    async fn syncs_annotation_to_mock_anki_connect_and_marks_synced() {
        let anki_url = start_mock_anki_connect().await;
        let dir = std::env::temp_dir().join(format!("witt-server-test-{}", uuid::Uuid::new_v4()));
        let state = test_state(dir.clone(), "secret".to_string()).expect("state");
        {
            let conn = state.conn.lock().await;
            let mut settings = db::get_settings(&conn).expect("settings");
            settings.anki_endpoint = anki_url;
            settings.anki_auto_sync_web = false;
            db::save_settings(&conn, &settings).expect("save settings");
            db::insert_book(
                &conn,
                &Book {
                    id: "book-1".to_string(),
                    title: "Book".to_string(),
                    author: "Author".to_string(),
                    file_path: dir.join("book-1.epub").to_string_lossy().to_string(),
                    cover_path: None,
                    imported_at: "now".to_string(),
                    updated_at: "now".to_string(),
                },
            )
            .expect("insert book");
            db::select_deck(&conn, "Default").expect("select deck");
        }
        let app = router_from_state_for_tests(state);
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/annotations")
                    .header(header::AUTHORIZATION, "Bearer secret")
                    .header(header::CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&AnnotationDraft {
                            book_id: "book-1".to_string(),
                            word: "example".to_string(),
                            sentence: "An example sentence.".to_string(),
                            chapter_title: Some("Chapter".to_string()),
                            epub_cfi: Some("epubcfi(/6/2)".to_string()),
                        })
                        .expect("draft json"),
                    ))
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/anki/sync")
                    .header(header::AUTHORIZATION, "Bearer secret")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);
        let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("body");
        let summary: SyncSummary = serde_json::from_slice(&bytes).expect("sync summary");
        assert_eq!(summary.created, 1);
        assert!(summary.failed.is_empty());

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/annotations?book_id=book-1")
                    .header(header::AUTHORIZATION, "Bearer secret")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);
        let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("body");
        let annotations: Vec<Annotation> = serde_json::from_slice(&bytes).expect("annotations");
        assert_eq!(annotations.len(), 1);
        assert_eq!(annotations[0].status, "synced");
        assert_eq!(annotations[0].anki_note_id, Some(4242));
        let _ = std::fs::remove_dir_all(dir);
    }

    async fn start_mock_anki_connect() -> String {
        let app = axum::Router::new().route("/", axum::routing::post(mock_anki_connect_handler));
        let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind mock");
        let addr = listener.local_addr().expect("mock addr");
        tokio::spawn(async move {
            axum::serve(listener, app).await.expect("mock serve");
        });
        format!("http://{addr}")
    }

    async fn mock_anki_connect_handler(Json(payload): Json<Value>) -> Json<Value> {
        let action = payload
            .get("action")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let result = match action {
            "createDeck" => json!(1),
            "modelNames" => json!(["Witt EPUB Sentence"]),
            "addNotes" => json!([4242]),
            "version" => json!(6),
            other => panic!("unexpected AnkiConnect action: {other}"),
        };
        Json(json!({ "result": result, "error": null }))
    }
}
