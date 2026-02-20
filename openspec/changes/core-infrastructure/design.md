# WittCore 架构设计

## 1. 系统架构

### 1.1 层次结构
```
┌─────────────────────────────────────────────────────────────┐
│                   UI Layer                                  │
├─────────────────────────────────────────────────────────────┤
│  • React Components (witt-tauri/ui/src/components)          │
│  • Zustand Stores (witt-tauri/ui/src/stores)                │
│  • Tauri Command Callers (witt-tauri/ui/src/lib/commands.ts)│
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              WittCore API Layer                             │
├─────────────────────────────────────────────────────────────┤
│  • Tauri Command Handlers (witt-tauri/src-tauri/src/commands.rs) │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│            Core Logic Layer (WittCore)                       │
├─────────────────────────────────────────────────────────────┤
│  • Note/Context Management (witt-core/src/note.rs)          │
│  • Anki Integration (witt-core/src/anki.rs)                  │
│  • Media Management (witt-core/src/media.rs)                 │
│  • Search/Query (witt-core/src/search.rs)                    │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│             Data Access Layer                               │
├─────────────────────────────────────────────────────────────┤
│  • SQLite Database (witt-core/src/db/sqlite.rs)              │
│  • File Storage (witt-core/src/storage/file.rs)              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 模块依赖图
```
┌─────────────────┐      ┌─────────────────┐
│  witt-tauri-ui  │─────▶│  witt-core-api  │
└─────────────────┘      └─────────────────┘
                             │
                             ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  note.rs        │      │  anki.rs        │      │  media.rs       │
└─────────────────┘      └─────────────────┘      └─────────────────┘
          │                      │                      │
          └──────────┬───────────┘                      │
                     ▼                                  ▼
            ┌─────────────────┐              ┌─────────────────┐
            │  search.rs      │              │  storage.rs     │
            └─────────────────┘              └─────────────────┘
                     │                                  │
                     └──────────┬───────────────────────┘
                                ▼
                        ┌─────────────────┐
                        │  db/sqlite.rs   │
                        └─────────────────┘
```

## 2. WittCore 核心模块设计

### 2.1 Note 管理
**文件：** `witt-core/src/note.rs`

```rust
pub struct Note {
    pub lemma: String,
    pub definition: String,
    pub pronunciation: Option<Audio>,
    pub phonetics: Option<String>,
    pub tags: Vec<String>,
    pub comment: String,
    pub deck: String,
    pub contexts: Vec<Context>,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

pub struct Context {
    pub id: Uuid,
    pub word_form: String,
    pub sentence: String,
    pub audio: Option<Audio>,
    pub image: Option<Image>,
    pub source: Source,
    pub created_at: DateTime<Utc>,
}

pub enum Source {
    Web {
        title: String,
        url: String,
        icon: Option<String>,
    },
    Video {
        filename: String,
        timestamp: String,
        frame: Option<u32>,
    },
    Pdf {
        filename: String,
        page: Option<u32>,
    },
    App {
        name: String,
        title: Option<String>,
    },
}

pub struct Audio {
    pub file_path: PathBuf,
}

pub struct Image {
    pub file_path: PathBuf,
}
```

**Key Features：**
- 单例 lemma 管理
- Context 槽位管理（最多 5 个）
- 自动去重逻辑
- 增量更新策略

### 2.2 Anki 集成
**文件：** `witt-core/src/anki.rs`

**依赖库：**
- `genanki-rs` - 用于生成 Anki 包（APKG）文件
- `anki_bridge` - 用于与 AnkiConnect 通信

```rust
use anki_bridge::*;
use genanki_rs::*;

pub struct AnkiNote {
    pub note_type: String,
    pub deck_name: String,
    pub fields: HashMap<String, String>,
    pub tags: Vec<String>,
}

pub struct AnkiCardTemplate {
    pub name: String,
    pub front: String,
    pub back: String,
    pub css: String,
}

pub enum CardType {
    Basic,          // 基础卡片（单词原型）
    Context(usize), // 语境卡片（槽位索引）
}

impl Note {
    pub fn to_anki_notes(&self) -> Vec<AnkiNote> {
        let mut notes = Vec::new();

        // 1. 基础卡片
        notes.push(self.create_basic_anki_note());

        // 2. 语境卡片（最多 5 个）
        for (i, context) in self.contexts.iter().enumerate().take(5) {
            notes.push(self.create_context_anki_note(context, i));
        }

        notes
    }
}

// 使用 anki_bridge 与 AnkiConnect 通信
pub async fn sync_with_anki(notes: Vec<AnkiNote>) -> Result<(), AnkiError> {
    let client = AnkiClient::new("http://localhost:8765".to_string());

    // 检查连接
    let version = client.version().await?;
    println!("Connected to AnkiConnect v{}", version);

    // 创建笔记类型（如果需要）
    ensure_note_types_exists(&client).await?;

    // 创建牌组（如果需要）
    for note in &notes {
        ensure_deck_exists(&client, &note.deck_name).await?;
    }

    // 添加笔记
    let add_notes_params = AddNotesParams {
        notes: notes.into_iter().map(|n| Note {
            deck_name: n.deck_name,
            model_name: n.note_type,
            fields: n.fields,
            tags: n.tags,
            ..Default::default()
        }).collect(),
    };

    let add_notes_response = client.add_notes(add_notes_params).await?;

    // 处理结果
    for (i, result) in add_notes_response.results.iter().enumerate() {
        match result {
            Ok(note_id) => println!("Note {} added successfully (ID: {})", i, note_id),
            Err(msg) => println!("Failed to add note {}: {}", i, msg),
        }
    }

    Ok(())
}

// 使用 genanki-rs 生成 APKG 文件
pub fn generate_apkg(notes: Vec<AnkiNote>, output_path: &Path) -> Result<(), GenAnkiError> {
    let mut deck = Deck::new("Witt Export".to_string(), "1234567890".to_string());

    for note in notes {
        let mut fields = Vec::new();
        fields.push(note.fields.get("Lemma").cloned().unwrap_or_default());
        fields.push(note.fields.get("Phonetics").cloned().unwrap_or_default());
        fields.push(note.fields.get("Pronunciation").cloned().unwrap_or_default());
        fields.push(note.fields.get("Definition").cloned().unwrap_or_default());
        fields.push(note.fields.get("Contexts").cloned().unwrap_or_default());
        fields.push(note.fields.get("Comment").cloned().unwrap_or_default());

        let genanki_note = Note::new(
            "Witt - Basic".to_string(),
            fields,
            note.tags,
            Vec::new(),
        );

        deck.add_note(genanki_note);
    }

    let package = Package::new(deck);
    package.write_to_file(output_path)?;

    Ok(())
}
```

**Card Templates：**

基础卡片：
```html
<!-- Front -->
<div class="card">
  <h1>{{Lemma}}</h1>
  <div class="phonetics">{{Phonetics}}</div>
  {{#Pronunciation}}
  <audio src="{{Pronunciation}}" autoplay></audio>
  {{/Pronunciation}}
</div>

<!-- Back -->
<div class="card">
  <h1>{{Lemma}}</h1>
  <div class="definition">{{Definition}}</div>
  <div class="contexts">{{Contexts}}</div>
  {{#Comment}}
  <div class="comment">{{Comment}}</div>
  {{/Comment}}
</div>
```

语境卡片：
```html
<!-- Front -->
<div class="card">
  <div class="sentence">{{Sentence}}</div>
  {{#Image}}
  <img src="{{Image}}" class="context-image">
  {{/Image}}
  {{#Source}}
  <div class="source">{{Source}}</div>
  {{/Source}}
</div>

<!-- Back -->
<div class="card">
  <h1>{{Lemma}}</h1>
  <div class="phonetics">{{Phonetics}}</div>
  {{#Pronunciation}}
  <audio src="{{Pronunciation}}" autoplay></audio>
  {{/Pronunciation}}
  {{#ContextAudio}}
  <audio src="{{ContextAudio}}" autoplay></audio>
  {{/ContextAudio}}
  <div class="definition">{{Definition}}</div>
  {{#Comment}}
  <div class="comment">{{Comment}}</div>
  {{/Comment}}
  <div class="other-contexts">{{OtherContexts}}</div>
</div>
```

### 2.3 媒体管理
**文件：** `witt-core/src/media.rs`

```rust
pub struct MediaManager {
    pub media_dir: PathBuf,
}

impl MediaManager {
    pub fn new(data_dir: &Path) -> Self {
        let media_dir = data_dir.join("media");
        std::fs::create_dir_all(&media_dir).ok();
        Self { media_dir }
    }

    pub fn save_audio(&self, audio_data: Vec<u8>, filename: &str) -> Result<PathBuf> {
        let file_path = self.media_dir.join(filename);
        std::fs::write(&file_path, audio_data)?;
        Ok(file_path)
    }

    pub fn save_image(&self, image_data: Vec<u8>, filename: &str) -> Result<PathBuf> {
        let file_path = self.media_dir.join(filename);
        std::fs::write(&file_path, image_data)?;
        Ok(file_path)
    }

    pub fn find_file(&self, filename: &str) -> Option<PathBuf> {
        let file_path = self.media_dir.join(filename);
        if file_path.exists() {
            Some(file_path)
        } else {
            None
        }
    }
}
```

与 Anki 媒体目录的兼容性：
- 使用 UUID 作为文件名以避免冲突
- 支持常见音频格式（mp3, wav, ogg）
- 支持常见图像格式（png, jpg, gif）

### 2.4 搜索模块
**文件：** `witt-core/src/search.rs`

```rust
pub enum SearchType {
    Lemma,
    WordForm,
    Sentence,
    Tag,
    Source,
}

pub struct SearchQuery {
    pub query: String,
    pub search_types: Vec<SearchType>,
    pub language: Option<String>,
    pub tags: Vec<String>,
    pub deck: Option<String>,
}

impl SearchQuery {
    pub fn execute(&self, db: &SqliteDb) -> Vec<Note> {
        // 构建 SQL 查询
        // 支持模糊搜索
        // 按匹配度排序
        // 支持过滤条件
    }
}
```

### 2.5 数据访问层
**文件：** `witt-core/src/db/sqlite.rs`

```rust
pub struct SqliteDb {
    pool: sqlx::SqlitePool,
}

impl SqliteDb {
    pub async fn connect(db_path: &Path) -> Result<Self> {
        let url = format!("sqlite:{}", db_path.display());
        let pool = sqlx::SqlitePool::connect(&url).await?;

        // 初始化数据库 schema
        sqlx::migrate!().run(&pool).await?;

        Ok(Self { pool })
    }

    pub async fn get_note_by_lemma(&self, lemma: &str) -> Result<Option<Note>> {
        // SELECT * FROM notes WHERE lemma = ?
    }

    pub async fn save_note(&self, note: &Note) -> Result<()> {
        // INSERT OR UPDATE notes
        // INSERT contexts
    }

    pub async fn search_notes(&self, query: &SearchQuery) -> Result<Vec<Note>> {
        // 复杂的 SQL 查询
    }
}
```

**数据库 Schema：**

```sql
-- Notes Table
CREATE TABLE IF NOT EXISTS notes (
    lemma TEXT PRIMARY KEY,
    definition TEXT NOT NULL,
    pronunciation TEXT,
    phonetics TEXT,
    tags TEXT,
    comment TEXT,
    deck TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME
);

-- Contexts Table
CREATE TABLE IF NOT EXISTS contexts (
    id TEXT PRIMARY KEY,
    lemma TEXT NOT NULL,
    word_form TEXT NOT NULL,
    sentence TEXT NOT NULL,
    audio TEXT,
    image TEXT,
    source_type TEXT NOT NULL,
    source_data TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (lemma) REFERENCES notes(lemma) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contexts_lemma ON contexts(lemma);
CREATE INDEX IF NOT EXISTS idx_contexts_word_form ON contexts(word_form);
CREATE INDEX IF NOT EXISTS idx_contexts_source ON contexts(source_type);
```

## 3. API 设计

### 3.1 Tauri 命令
**文件：** `witt-tauri/src-tauri/src/commands.rs`

```rust
#[tauri::command]
pub async fn create_note(note_data: NoteData) -> Result<Note, String> {
    let core = get_witt_core()?;
    core.create_note(note_data).await
}

#[tauri::command]
pub async fn get_note(lemma: &str) -> Result<Option<Note>, String> {
    let core = get_witt_core()?;
    core.get_note(lemma).await
}

#[tauri::command]
pub async fn add_context(lemma: &str, context: ContextData) -> Result<Context, String> {
    let core = get_witt_core()?;
    core.add_context(lemma, context).await
}

#[tauri::command]
pub async fn remove_context(lemma: &str, context_id: &str) -> Result<bool, String> {
    let core = get_witt_core()?;
    core.remove_context(lemma, context_id).await
}

#[tauri::command]
pub async fn sync_with_anki() -> Result<SyncResult, String> {
    let core = get_witt_core()?;
    core.sync_with_anki().await
}

#[tauri::command]
pub async fn search_notes(query: SearchQuery) -> Result<Vec<Note>, String> {
    let core = get_witt_core()?;
    core.search_notes(query).await
}
```

### 3.2 HTTP API（可选）
**文件：** `witt-core/src/server.rs`

```rust
pub async fn start_server(addr: SocketAddr, core: WittCore) -> Result<()> {
    let app = Router::new()
        .route("/api/notes", get(get_notes))
        .route("/api/notes", post(create_note))
        .route("/api/notes/:lemma", get(get_note))
        .route("/api/notes/:lemma/contexts", post(add_context))
        .route("/api/notes/:lemma/contexts/:id", delete(remove_context))
        .route("/api/anki/sync", post(sync_anki))
        .route("/api/search", get(search_notes))
        .with_state(core);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
}
```

## 4. 数据迁移

### 4.1 从旧 Card 模型迁移
**文件：** `witt-core/src/migration.rs`

```rust
pub async fn migrate_old_cards(old_db_path: &Path, new_db_path: &Path) -> Result<()> {
    let old_cards = load_old_cards(old_db_path).await?;

    // 转换为新模型
    let mut notes = HashMap::new();
    for card in old_cards {
        let lemma = card.lemma;

        if !notes.contains_key(&lemma) {
            notes.insert(lemma.clone(), Note {
                lemma,
                definition: card.definitions.first().map(|d| d.text.clone()).unwrap_or_default(),
                pronunciation: None, // 需要使用新的发音服务获取
                phonetics: None,    // 需要使用新的音标服务获取
                tags: card.tags,
                comment: card.notes.unwrap_or_default(),
                deck: "Default".to_string(), // 默认牌组
                contexts: Vec::new(),
                created_at: card.created_at,
                updated_at: card.updated_at,
            });
        }

        // 添加到 Context 槽位（最多 5 个）
        if let Some(note) = notes.get_mut(&card.lemma) {
            if note.contexts.len() < 5 {
                note.contexts.push(Context {
                    id: card.id,
                    word_form: card.word,
                    sentence: card.context,
                    audio: None,
                    image: None,
                    source: card.source,
                    created_at: card.created_at,
                });
            }
        }
    }

    // 保存到新数据库
    let db = SqliteDb::connect(new_db_path).await?;
    for note in notes.values() {
        db.save_note(note).await?;
    }

    Ok(())
}
```

## 5. 错误处理

### 5.1 统一错误类型
**文件：** `witt-core/src/error.rs`

```rust
#[derive(thiserror::Error, Debug)]
pub enum WittCoreError {
    #[error("Note not found: {0}")]
    NoteNotFound(String),

    #[error("Context not found: {0}")]
    ContextNotFound(String),

    #[error("Max contexts (5) reached for lemma: {0}")]
    MaxContextsReached(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("AnkiConnect error: {0}")]
    AnkiConnect(String),

    #[error("Media not found: {0}")]
    MediaNotFound(String),

    #[error("Migration failed: {0}")]
    Migration(String),

    #[error("Invalid data: {0}")]
    InvalidData(String),
}

impl From<WittCoreError> for String {
    fn from(err: WittCoreError) -> Self {
        format!("{}", err)
    }
}
```

### 5.2 日志系统
**文件：** `witt-core/src/logging.rs`

```rust
pub fn init_logging() {
    fern::Dispatch::new()
        .level(log::LevelFilter::Info)
        .level_for("witt_core", log::LevelFilter::Debug)
        .chain(std::io::stdout())
        .chain(fern::log_file("witt-core.log").unwrap())
        .format(|out, message, record| {
            out.finish(format_args!(
                "[{}][{}] {}",
                chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
                record.level(),
                message
            ))
        })
        .apply()
        .unwrap();
}
```

## 6. 性能优化

### 6.1 缓存策略
- **内存缓存**：常用 Note 和 Context 缓存到内存
- **SQLite WAL 模式**：提高并发写入性能
- **查询优化**：适当的索引设计

### 6.2 延迟加载
- **Context 媒体**：只在需要时加载音频和图像
- **搜索结果**：分页加载

### 6.3 批量操作
- **Anki 同步**：批量处理卡片
- **数据导入**：支持 CSV 和 JSON 批量导入

## 7. 安全考虑

### 7.1 数据安全
- **SQL 注入防护**：使用 sqlx 参数化查询
- **媒体文件验证**：检查文件类型和大小
- **路径遍历防护**：限制媒体文件访问路径

### 7.2 Anki 安全性
- **AnkiConnect 权限**：最小化所需的权限
- **数据验证**：验证发送到 Anki 的数据格式

## 8. 测试策略

### 8.1 单元测试
- **Note 管理**：测试创建、删除、更新操作
- **Context 管理**：测试槽位管理、删除逻辑
- **搜索**：测试各种搜索场景
- **Anki 集成**：测试卡片生成

### 8.2 集成测试
- **Tauri 命令**：测试 UI 到 backend 的完整流程
- **数据库操作**：测试数据持久化
- **媒体管理**：测试音频和图像操作

### 8.3 端到端测试
- **用户流程**：从捕获到 Anki 同步的完整流程
- **数据迁移**：测试从旧卡片到新笔记的迁移
