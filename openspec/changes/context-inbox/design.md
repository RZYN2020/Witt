# Context Inbox 架构设计

## 1. 系统架构

### 1.1 层次结构

Context Inbox 功能遵循 Witt 项目的三层架构，但在业务逻辑层和 UI 层添加了新的组件：

```
┌─────────────────────────────────────────────────────────────┐
│                   UI Layer                                  │
├─────────────────────────────────────────────────────────────┤
│  • QuickCapturePopup (Inbox version)                         │
│  • InboxManagementPage (Library -> Inbox tab)                │
│  • ProcessContextDialog                                     │
│  • Zustand Store: useInboxStore.ts                          │
│  • Tauri Command Callers                                    │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              WittCore API Layer                             │
├─────────────────────────────────────────────────────────────┤
│  • Tauri Command Handlers (commands.rs)                      │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│            Core Logic Layer (WittCore)                       │
├─────────────────────────────────────────────────────────────┤
│  • Inbox Management: inbox.rs                               │
│  • Word Extraction: extraction.rs                           │
│  • Note/Context Management: note.rs                         │
│  • Data Access Layer: db/sqlite.rs                          │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 模块依赖图

```
┌─────────────────┐      ┌─────────────────┐
│  ui-inbox       │─────▶│  core-api       │
└─────────────────┘      └─────────────────┘
                             │
                ┌───────────┴───────────┐
                ▼                       ▼
        ┌─────────────────┐      ┌─────────────────┐
        │  inbox.rs        │      │  extraction.rs  │
        └─────────────────┘      └─────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
                    ┌─────────────────┐
                    │  note.rs        │
                    └─────────────────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │  db/sqlite.rs   │
                    └─────────────────┘
```

## 2. 数据模型设计

### 2.1 Inbox Item

**文件：** `witt-core/src/inbox.rs`

```rust
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, FromRow, Serialize, Deserialize, Clone)]
pub struct InboxItem {
    pub id: Uuid,
    pub context: String,
    pub source: Source,
    pub captured_at: DateTime<Utc>,
    pub processed: bool,
    pub processing_notes: Option<String>,
}

impl InboxItem {
    pub fn new(context: String, source: Source) -> Self {
        Self {
            id: Uuid::new_v4(),
            context,
            source,
            captured_at: Utc::now(),
            processed: false,
            processing_notes: None,
        }
    }

    pub fn mark_processed(&mut self) {
        self.processed = true;
    }

    pub fn set_processing_notes(&mut self, notes: &str) {
        self.processing_notes = Some(notes.to_string());
    }
}
```

### 2.2 Source 类型

保持与现有 `Source` 类型一致，支持：
- Web（网页）
- Video（视频）
- PDF（文档）
- App（其他应用程序）

### 2.3 数据库 Schema

**SQLite 表定义：**

```sql
-- Inbox Table
CREATE TABLE IF NOT EXISTS inbox_items (
    id TEXT PRIMARY KEY,
    context TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_data TEXT NOT NULL,
    captured_at DATETIME NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT 0,
    processing_notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Context to Note Association Table
CREATE TABLE IF NOT EXISTS context_note_associations (
    context_id TEXT NOT NULL,
    lemma TEXT NOT NULL,
    PRIMARY KEY (context_id, lemma),
    FOREIGN KEY (lemma) REFERENCES notes(lemma) ON DELETE CASCADE,
    FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inbox_items_captured ON inbox_items(captured_at);
CREATE INDEX IF NOT EXISTS idx_inbox_items_processed ON inbox_items(processed);
CREATE INDEX IF NOT EXISTS idx_context_note_lemma ON context_note_associations(lemma);
CREATE INDEX IF NOT EXISTS idx_context_note_context ON context_note_associations(context_id);
```

## 3. 核心功能实现

### 3.1 Inbox 管理

**文件：** `witt-core/src/inbox.rs`

```rust
use crate::db::sqlite::SqliteDb;
use crate::note::Note;
use crate::error::WittCoreError;

impl SqliteDb {
    // 获取 Inbox 列表（支持分页和过滤）
    pub async fn get_inbox_items(
        &self,
        page: usize,
        page_size: usize,
        search: Option<&str>,
        source_type: Option<&str>,
        processed: Option<bool>,
    ) -> Result<Vec<InboxItem>, WittCoreError> {
        let offset = page * page_size;

        // 构建基础查询
        let mut query = "SELECT * FROM inbox_items".to_string();
        let mut params = Vec::new();

        // 添加过滤条件
        let mut conditions = Vec::new();
        if let Some(search_term) = search {
            conditions.push("context LIKE ?");
            params.push(format!("%{}%", search_term));
        }
        if let Some(st) = source_type {
            conditions.push("source_type = ?");
            params.push(st.to_string());
        }
        if let Some(p) = processed {
            conditions.push("processed = ?");
            params.push(p.to_string());
        }

        if !conditions.is_empty() {
            query.push_str(" WHERE ");
            query.push_str(&conditions.join(" AND "));
        }

        // 添加排序和分页
        query.push_str(" ORDER BY captured_at DESC LIMIT ? OFFSET ?");
        params.push(page_size.to_string());
        params.push(offset.to_string());

        // 执行查询
        let items = sqlx::query_as::<_, InboxItem>(&query)
            .fetch_all(&self.pool)
            .await?;

        Ok(items)
    }

    // 添加到 Inbox
    pub async fn add_inbox_item(&self, item: &InboxItem) -> Result<(), WittCoreError> {
        sqlx::query!(
            r#"
            INSERT INTO inbox_items (id, context, source_type, source_data, captured_at, processed, processing_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
            item.id.to_string(),
            item.context,
            item.source.get_type(),
            item.source.to_json(),
            item.captured_at,
            item.processed,
            item.processing_notes
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // 删除 Inbox 项
    pub async fn delete_inbox_item(&self, id: &Uuid) -> Result<(), WittCoreError> {
        sqlx::query!(
            r#"
            DELETE FROM inbox_items WHERE id = ?
            "#,
            id.to_string()
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // 标记为已处理
    pub async fn mark_inbox_item_processed(&self, id: &Uuid, notes: Option<&str>) -> Result<(), WittCoreError> {
        sqlx::query!(
            r#"
            UPDATE inbox_items
            SET processed = 1, processing_notes = ?
            WHERE id = ?
            "#,
            notes,
            id.to_string()
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // 清空已处理的项
    pub async fn clear_processed_items(&self) -> Result<(), WittCoreError> {
        sqlx::query!(
            r#"
            DELETE FROM inbox_items WHERE processed = 1
            "#
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
```

### 3.2 单词提取

**文件：** `witt-core/src/extraction.rs`

```rust
use std::collections::HashSet;

/// 从上下文中提取可能的单词
pub fn extract_words(context: &str) -> Vec<String> {
    let mut words = HashSet::new();

    // 简单的分词逻辑（实际中可使用更复杂的 NLP 库）
    let word_regex = regex::Regex::new(r"\b[a-zA-Z]{3,}\b").unwrap();

    for capture in word_regex.captures_iter(context) {
        if let Some(word) = capture.get(0) {
            words.insert(word.as_str().to_lowercase());
        }
    }

    words.into_iter().collect()
}

/// 从上下文中提取可能的单词，并按频率排序
pub fn extract_words_with_frequency(context: &str) -> Vec<(String, usize)> {
    let mut word_counts = std::collections::HashMap::new();

    let word_regex = regex::Regex::new(r"\b[a-zA-Z]{3,}\b").unwrap();

    for capture in word_regex.captures_iter(context) {
        if let Some(word) = capture.get(0) {
            let word_str = word.as_str().to_lowercase();
            *word_counts.entry(word_str).or_insert(0) += 1;
        }
    }

    let mut sorted_words: Vec<(String, usize)> = word_counts.into_iter().collect();
    sorted_words.sort_by(|a, b| b.1.cmp(&a.1));

    sorted_words
}
```

### 3.3 上下文处理

**文件：** `witt-core/src/inbox.rs`

```rust
impl SqliteDb {
    /// 处理 Inbox 项，为其关联多个单词
    pub async fn process_inbox_item(
        &self,
        item_id: &Uuid,
        lemmas: Vec<&str>,
    ) -> Result<Vec<Note>, WittCoreError> {
        // 1. 获取 Inbox 项
        let item = self.get_inbox_item(item_id).await?
            .ok_or(WittCoreError::InboxItemNotFound(item_id.to_string()))?;

        // 2. 为每个单词创建或更新 Note，并添加 Context
        let mut processed_notes = Vec::new();

        for lemma in lemmas {
            // 查找或创建 Note
            let mut note = match self.get_note_by_lemma(lemma).await? {
                Some(note) => note,
                None => Note::new(lemma.to_string(), "".to_string()), // 空定义，后续用户可编辑
            };

            // 创建 Context
            let context = crate::note::Context {
                id: Uuid::new_v4(),
                word_form: extract_word_form(item.context.as_str(), lemma), // 简单提取
                sentence: item.context.clone(),
                audio: None,
                image: None,
                source: item.source.clone(),
                created_at: Utc::now(),
            };

            // 添加 Context 到 Note（最多 5 个）
            if note.contexts.len() < 5 {
                note.contexts.push(context);
                self.save_note(&note).await?;
                processed_notes.push(note);
            }
        }

        // 3. 标记为已处理
        self.mark_inbox_item_processed(item_id, Some(&format!("Processed with {} words", lemmas.len()))).await?;

        Ok(processed_notes)
    }
}
```

## 4. API 设计

### 4.1 Tauri 命令

**文件：** `witt-tauri/src-tauri/src/commands.rs`

```rust
use witt_core::inbox::InboxItem;
use witt_core::note::Note;
use witt_core::error::WittCoreError;

#[tauri::command]
pub async fn add_to_inbox(
    context: String,
    source: Source,
) -> Result<InboxItem, String> {
    let core = get_witt_core()?;
    let item = InboxItem::new(context, source);
    core.add_inbox_item(&item).await?;
    Ok(item)
}

#[tauri::command]
pub async fn get_inbox_items(
    page: usize,
    page_size: usize,
    search: Option<String>,
    source_type: Option<String>,
    processed: Option<bool>,
) -> Result<Vec<InboxItem>, String> {
    let core = get_witt_core()?;
    core.get_inbox_items(page, page_size, search.as_deref(), source_type.as_deref(), processed).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn process_inbox_item(
    item_id: String,
    lemmas: Vec<String>,
) -> Result<Vec<Note>, String> {
    let core = get_witt_core()?;
    let item_uuid = uuid::Uuid::parse_str(&item_id).map_err(|e| e.to_string())?;
    core.process_inbox_item(&item_uuid, lemmas.iter().map(|s| s.as_str()).collect()).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_inbox_item(item_id: String) -> Result<bool, String> {
    let core = get_witt_core()?;
    let item_uuid = uuid::Uuid::parse_str(&item_id).map_err(|e| e.to_string())?;
    core.delete_inbox_item(&item_uuid).await?;
    Ok(true)
}

#[tauri::command]
pub async fn mark_inbox_item_processed(
    item_id: String,
    notes: Option<String>,
) -> Result<bool, String> {
    let core = get_witt_core()?;
    let item_uuid = uuid::Uuid::parse_str(&item_id).map_err(|e| e.to_string())?;
    core.mark_inbox_item_processed(&item_uuid, notes.as_deref()).await?;
    Ok(true)
}

#[tauri::command]
pub async fn clear_processed_items() -> Result<bool, String> {
    let core = get_witt_core()?;
    core.clear_processed_items().await?;
    Ok(true)
}

#[tauri::command]
pub async fn extract_words(context: String) -> Result<Vec<String>, String> {
    Ok(witt_core::extraction::extract_words(&context))
}

#[tauri::command]
pub async fn extract_words_with_frequency(context: String) -> Result<Vec<(String, usize)>, String> {
    Ok(witt_core::extraction::extract_words_with_frequency(&context))
}
```

## 5. 前端实现

### 5.1 状态管理

**文件：** `witt-tauri/ui/src/stores/useInboxStore.ts`

```typescript
import { create } from 'zustand';
import type { InboxItem } from '@/types';
import * as commands from '@/lib/commands';
import { useToastStore } from './useToastStore';

interface InboxSlice {
  // State
  items: InboxItem[];
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  searchTerm: string;
  sourceType: string | null;
  showProcessed: boolean;

  // Actions
  loadItems: () => Promise<void>;
  search: (term: string) => Promise<void>;
  filterBySource: (sourceType: string | null) => Promise<void>;
  toggleShowProcessed: () => Promise<void>;
  addToInbox: (context: string, source: Source) => Promise<void>;
  processItem: (itemId: string, lemmas: string[]) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  markProcessed: (itemId: string, notes?: string) => Promise<void>;
  clearProcessed: () => Promise<void>;
  extractWords: (context: string) => Promise<string[]>;
}

export const useInboxStore = create<InboxSlice>((set, get) => ({
  // Initial state
  items: [],
  isLoading: false,
  isProcessing: false,
  error: null,
  currentPage: 0,
  totalPages: 0,
  pageSize: 10,
  searchTerm: '',
  sourceType: null,
  showProcessed: false,

  // Actions...
}));
```

### 5.2 UI 组件架构

**主要组件：**

1. **QuickCapturePopup** - 快速捕获弹窗
2. **InboxPage** - Inbox 管理页面
3. **ProcessContextDialog** - 上下文处理对话框
4. **InboxItem** - 单个 Inbox 项展示

**分页和搜索组件：**
```typescript
// 分页组件
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// 搜索组件
interface SearchBarProps {
  searchTerm: string;
  onSearch: (term: string) => void;
}
```

## 6. 性能优化

### 6.1 查询优化
- **分页加载**：避免一次加载所有 Inbox 项
- **索引**：为查询条件和排序字段添加适当索引
- **搜索优化**：使用 SQLite 的全文搜索功能（FTS5）

### 6.2 单词提取优化
- **缓存**：缓存已提取的单词
- **分块处理**：对大文本进行分块提取
- **异步处理**：使用 Web Workers 处理复杂的 NLP 任务

### 6.3 UI 优化
- **虚拟滚动**：处理大量 Inbox 项时使用虚拟滚动
- **懒加载**：只加载可见的内容
- **响应式设计**：确保在不同设备上的性能

## 7. 错误处理

### 7.1 统一错误类型

**文件：** `witt-core/src/error.rs`

```rust
#[derive(thiserror::Error, Debug)]
pub enum WittCoreError {
    // Inbox 相关错误
    #[error("Inbox item not found: {0}")]
    InboxItemNotFound(String),

    #[error("Inbox page out of range")]
    InboxPageOutOfRange,

    #[error("Failed to extract words from context: {0}")]
    WordExtractionError(String),

    #[error("No words selected to process context")]
    NoWordsSelected,

    // ... 其他错误类型
}
```

### 7.2 前端错误处理

```typescript
// 在 useInboxStore.ts 中的错误处理
const handleError = (error: any) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  set({ error: errorMessage });
  useToastStore.getState().addToast({
    message: errorMessage,
    type: 'error',
    duration: 5000,
  });
};
```

## 8. 测试策略

### 8.1 单元测试

**Inbox 管理**：
- 创建、读取、更新、删除 Inbox 项
- 分页和搜索功能
- 处理 Inbox 项

**单词提取**：
- 测试各种文本的单词提取
- 处理边界情况（如空文本）

### 8.2 集成测试

**完整流程**：
- 快速捕获到 Inbox
- 查询和过滤
- 处理 Inbox 项
- 关联到 Note

### 8.3 端到端测试

**用户场景**：
1. 阅读网页时快速捕获多个上下文到 Inbox
2. 打开 Inbox 管理页面，查看所有未处理的上下文
3. 为每个上下文选择单词并处理
4. 验证 Note 中的 Context 关联

## 9. 版本兼容性

### 9.1 数据迁移

```rust
// 从无 Inbox 到有 Inbox 的迁移
pub async fn migrate_to_inbox(db: &SqliteDb) -> Result<()> {
    // 创建 Inbox 表（如果不存在）
    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS inbox_items (
            id TEXT PRIMARY KEY,
            context TEXT NOT NULL,
            source_type TEXT NOT NULL,
            source_data TEXT NOT NULL,
            captured_at DATETIME NOT NULL,
            processed BOOLEAN NOT NULL DEFAULT 0,
            processing_notes TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#
    )
    .execute(&db.pool)
    .await?;

    // 创建关联表
    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS context_note_associations (
            context_id TEXT NOT NULL,
            lemma TEXT NOT NULL,
            PRIMARY KEY (context_id, lemma),
            FOREIGN KEY (lemma) REFERENCES notes(lemma) ON DELETE CASCADE,
            FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE
        )
        "#
    )
    .execute(&db.pool)
    .await?;

    Ok(())
}
```
