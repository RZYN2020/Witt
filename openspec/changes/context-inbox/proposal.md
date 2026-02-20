# Context Inbox 功能提案

## 概述

添加 Context Inbox 功能，允许用户快速捕获上下文而暂时不选择单词，稍后在管理页面统一处理这些上下文并选择相关单词。每个上下文可以关联多个单词。

## 当前问题

### 1. 捕获流程中断
- 当前捕获流程要求立即选择单词，中断阅读体验
- 用户需要在捕获时做出决定，降低了捕获效率
- 不适合处理包含多个重要单词的复杂上下文

### 2. 多单词上下文处理困难
- 一个上下文中如果有多个生词，需要多次单独捕获
- 重复捕获同一个上下文会造成数据冗余
- 无法体现单词在同一语境中的语义关联

### 3. 批量处理需求
- 阅读大量内容后需要逐一处理每个捕获的卡片
- 缺乏统一管理和批量操作的界面

## 解决方案：Context Inbox

### 1. 核心设计理念
**快速捕获，集中处理** — 允许用户在阅读时快速捕获感兴趣的上下文，稍后在专门的 Inbox 页面中统一处理这些上下文，为每个上下文选择一个或多个单词。

### 2. 主要功能

#### A. 快速捕获入口
- **独立快捷键**：`Ctrl+Alt+I`（可配置）
- **极简弹窗**：只有上下文输入和保存按钮
- **自动提取源信息**：从浏览器、视频、PDF 等源自动捕获元数据

#### B. Inbox 管理界面
- **列表视图**：显示所有未处理的上下文
- **搜索和过滤**：按时间、源类型、关键词搜索
- **分页显示**：处理大量上下文时提供分页支持
- **批量操作**：支持批量选择、批量处理

#### C. 上下文处理
- **单词选择**：从上下文中自动提取单词，支持用户选择
- **多单词关联**：一个上下文可以关联多个单词
- **单词自动提取**：使用 NLP 技术自动识别可能的单词
- **手动添加**：支持用户手动输入不在自动列表中的单词

#### D. 数据流转
- **未处理状态**：捕获后进入 Inbox，标记为未处理
- **处理过程**：选择单词后，将上下文关联到对应的 Note
- **处理后状态**：标记为已处理，可以选择保留或删除
- **恢复功能**：允许从已处理项目中恢复

### 3. 架构设计

#### A. 数据模型
```typescript
interface InboxItem {
  id: string;
  context: string;
  source: Source;
  capturedAt: string;
  processed: boolean;
  processingNotes?: string;
}

// Note 和 Context 保持现有结构，但支持一个 Context 关联多个 Note
interface WittContext {
  id: string;
  wordForm: string;
  sentence: string;
  source: Source;
  // 保持与多个 Note 的关联（通过关联表或数组）
}
```

#### B. 存储方案
- 在 SQLite 中创建 `inbox` 表专门存储未处理的上下文
- 添加 `context_to_note` 关联表来支持一个上下文关联多个 Note
- 实现高效的查询和分页机制

#### C. API 设计
```rust
#[tauri::command]
pub async fn add_to_inbox(context: String, source: Source) -> Result<InboxItem, String>;

#[tauri::command]
pub async fn get_inbox_items(page: usize, page_size: usize, search: Option<String>, source_type: Option<String>) -> Result<Vec<InboxItem>, String>;

#[tauri::command]
pub async fn process_inbox_item(inbox_id: &str, lemmas: Vec<String>) -> Result<Vec<WittContext>, String>;

#[tauri::command]
pub async fn delete_inbox_item(inbox_id: &str) -> Result<bool, String>;

#[tauri::command]
pub async fn clear_processed_items() -> Result<bool, String>;

#[tauri::command]
pub async fn extract_words_from_context(context: &str) -> Result<Vec<String>, String>;
```

### 4. 变更范围

### 受影响的组件
- [x] 后端数据模型
- [x] Tauri 命令
- [x] 前端状态管理（Zustand stores）
- [x] 捕获 popup UI（新增 Inbox 版本）
- [x] 库视图（新增 Inbox 标签页）
- [x] 全局快捷键

### 新增功能
- [ ] Inbox 管理界面
- [ ] 上下文处理对话框
- [ ] 单词自动提取功能
- [ ] 批量操作功能
- [ ] 搜索和分页功能

## 实施计划

### 阶段 1：基础架构（后端）
1. 创建 `inbox.rs` 模块
2. 设计和实现 SQLite 表结构
3. 实现基本的 CRUD API
4. 添加单词提取和处理逻辑

### 阶段 2：前端状态管理
1. 创建 `useInboxStore.ts` 状态管理
2. 实现与后端 API 的通信
3. 添加搜索、过滤和分页状态

### 阶段 3：UI 组件
1. 创建快速捕获弹窗（Inbox 版本）
2. 开发 Inbox 管理页面组件
3. 实现上下文处理对话框
4. 在库视图中添加 Inbox 标签页

### 阶段 4：优化和测试
1. 实现单词自动提取功能
2. 添加搜索和过滤功能
3. 优化分页加载
4. 编写单元测试和集成测试

## 成功标准

- [x] 用户可以使用独立快捷键快速捕获上下文到 Inbox
- [x] Inbox 界面显示所有未处理的上下文
- [x] 用户可以为每个上下文选择一个或多个单词
- [x] 支持搜索和分页功能
- [x] 处理后的上下文正确关联到对应的 Note
- [x] 保持与现有功能的兼容性

## 风险评估

### 高风险
1. **单词提取准确性**：NLP 技术可能无法完美识别所有重要单词
2. **性能问题**：Inbox 中大量上下文可能影响查询性能

### 缓解策略
1. 提供手动添加单词功能作为补充
2. 实现分页查询和搜索优化
3. 添加单词频率统计和重要性评分

### 中风险
1. **数据一致性**：处理过程中的并发操作可能导致数据不一致
2. **用户体验**：复杂的上下文处理流程可能影响用户体验

### 缓解策略
1. 使用事务确保数据一致性
2. 设计简洁直观的用户界面
3. 提供详细的帮助文档和示例

## 未来扩展

### 1. 智能优化
- 使用 LLM 分析上下文，自动提取可能的单词
- 提供单词重要性评分和推荐
- 自动识别多单词的语义关联

### 2. 协作功能
- 允许用户共享未处理的上下文
- 提供团队 Inbox 功能
- 支持评论和标注功能

### 3. 导入导出
- 支持从外部文件导入上下文
- 导出 Inbox 内容为 CSV/JSON
- 与其他笔记系统集成

---

## 快捷键设计

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Ctrl+Alt+C` | 立即捕获（原功能） | 捕获上下文并立即选择单词 |
| `Ctrl+Alt+I` | 快速捕获到 Inbox | 新增：快速捕获上下文到 Inbox，不选择单词 |
| `Ctrl+Alt+L` | 打开库视图 | 包含 Inbox 标签页 |
