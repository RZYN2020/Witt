# 核心架构（Core Infrastructure）

## 概述

将 Witt 应用从当前的扁平 Card 模型重构为 Note-Context 关系型模型，实现 WittCore 核心逻辑，并集成 Anki 卡片生成与同步功能。

## 当前问题

### 1. 数据模型局限性
- 当前的扁平 Card 模型无法体现单词在不同语境中的意义关联
- 相同单词在不同句子中的重复捕获会创建冗余卡片
- 缺乏对单词原型（Lemma）的集中管理

### 2. Anki 集成缺失
- 目前没有与 Anki 进行有效集成的方案
- 用户需要手动复制/粘贴内容到 Anki
- 无法利用 Anki 的间隔重复学习功能

### 3. 架构不清晰
- 业务逻辑分散在 UI 组件和简单的 backend 命令中
- 缺乏可复用的核心逻辑层
- 难以进行单元测试和维护

## 解决方案：WittCore 架构

### 1. 核心设计理念
**Meaning through use** — 单词的意义通过其在不同语境中的使用模式来体现。

### 2. 数据模型重构
```rust
// 单词原型（Lemma）作为主键
struct WittNote {
    lemma: string,       // 单词原型
    definition: string,  // 核心释义
    pronunciation: Audio, // 原型读音
    phonetics: string,    // 音标
    tags: Vec<string>,   // 领域标签
    comment: string,
    deck: string,        // Anki 牌组
    contexts: Vec<WittContext>, // 最多 5 个语境槽位
}

// 语境（Context）
struct WittContext {
    wordForm: string,    // 语境中具体的变体（如 "implemented"）
    sentence: string,    // 包含挖空的句子
    audio: Audio?,       // 该特定语境的读音
    image: Image?,       // 该语境的截图/示意图
    source: Source,      // 来源：如 "abc.mp4"
}
```

### 3. 核心功能

#### A. Note-Context 管理
- 单词原型的集中管理
- 语境槽位管理（最多 5 个）
- 自动去重和合并
- 数据导入/导出

#### B. Anki 集成
- 自动卡片生成：1 个基础卡片 + 最多 5 个语境卡片
- AnkiConnect 增量同步
- 牌组管理
- 卡片模板定制

#### C. 数据存储
- SQLite 数据库用于结构化数据
- 文件系统存储音频和图像资源
- 与 Anki media 文件夹结构兼容

#### D. API 设计
- 统一的 WittCore API 层
- Tauri 命令暴露给 UI
- 可扩展为 HTTP API

## 技术方案

### 1. 架构层次
```
┌─────────────────────────────────┐
│  UI Layer (React + Tauri)       │
├─────────────────────────────────┤
│  WittCore API (Tauri Commands)  │
├─────────────────────────────────┤
│  Core Logic (Note/Context mgmt) │
├─────────────────────────────────┤
│  Data Access Layer (SQLite)     │
└─────────────────────────────────┘
```

### 2. 关键技术选择
- **数据库**：SQLite + sqlx
- **音频/图像**：文件路径存储，与 Anki media 兼容
- **Anki 集成**：AnkiConnect (HTTP API)
- **HTTP 服务**：可选的 axum 服务器
- **缓存**：内存缓存 + SQLite WAL 模式

## 变更范围

### 受影响的组件
- [x] 后端数据模型
- [x] Tauri 命令
- [x] 前端状态管理（Zustand stores）
- [x] 捕获 popup UI
- [x] 卡片展示组件
- [x] 视频播放器集成
- [x] 全局快捷键

### 新增功能
- [ ] WittCore 核心库
- [ ] AnkiConnect 集成
- [ ] 数据迁移工具
- [ ] 导出功能（APKG + CSV）

## 实施计划

### 阶段 1：基础架构
1. 设计并实现 WittCore 核心接口
2. 重构数据模型为 Note-Context
3. 实现 SQLite 数据存储
4. 开发数据迁移工具

### 阶段 2：核心功能
1. 实现 Note-Context 管理
2. 开发 Anki 卡片生成
3. 实现 AnkiConnect 同步
4. 集成音频/图像处理

### 阶段 3：UI 重构
1. 重构 Zustand stores
2. 重写捕获 popup UI
3. 重写卡片展示组件
4. 优化搜索和过滤功能

### 阶段 4：测试与优化
1. 编写单元测试
2. 性能优化
3. 用户体验测试
4. 文档完善

## 成功标准

- [x] 单词原型管理功能正常
- [x] 语境槽位管理（最多 5 个）
- [x] Anki 卡片自动生成
- [x] AnkiConnect 增量同步
- [x] 与 Anki media 文件夹兼容
- [x] 数据导入/导出功能
- [x] 前端 UI 响应式和美观

## 风险评估

### 高风险
1. **数据迁移**：从旧 Card 模型到新 Note-Context 模型的一次性迁移
2. **AnkiConnect 稳定性**：依赖 AnkiConnect 插件的稳定性
3. **性能**：处理大量 Note-Context 关系时的查询优化

### 缓解策略
1. 数据迁移前进行完整备份
2. 实现迁移失败的回滚机制
3. 对 AnkiConnect 调用进行错误处理和重试
4. 优化 SQL 查询和缓存策略

## 未来扩展

### 1. 语义分析
- 利用 LLM 分析单词在不同语境中的语义变化
- 自动识别单词的搭配模式
- 提供语境相似度评分

### 2. 云同步
- 支持多设备间的数据同步
- 云端备份和恢复
- 共享笔记库功能

### 3. 多语言支持
- 更好的多语言 Lemma 提取
- 语言特定的发音和音标
- 跨语言的语境关联

### 4. 社区功能
- 共享 Note 库
- 语境贡献和投票
- 标签分类和搜索
