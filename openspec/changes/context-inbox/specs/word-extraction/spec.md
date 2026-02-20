# Word Extraction Spec

## 概述

单词提取是 Context Inbox 功能的核心部分，负责从捕获的上下文中自动识别和提取可能的单词。该功能使用户能够快速为捕获的上下文选择相关单词，而无需手动输入每个单词。

## 功能描述

### 1. 单词提取算法

#### 1.1 基础提取算法
- **使用正则表达式**：`\b[a-zA-Z]{3,}\b`
- **提取规则**：
  - 单词长度至少为 3 个字符
  - 只提取字母字符
  - 转换为小写以避免重复
- **限制条件**：
  - 忽略常见停用词（如 "the", "and", "for" 等）
  - 忽略数字和特殊字符

#### 1.2 高级提取（使用 NLP 库）
- **词性识别**：优先提取名词、动词和形容词
- **命名实体识别**：识别专有名词和短语
- **词频统计**：计算每个单词的出现频率

### 2. 提取结果排序

#### 2.1 基础排序
- **按字母顺序**：A-Z 排序
- **频率排序**：出现次数多的单词优先
- **长度排序**：按单词长度排序

#### 2.2 智能排序
- **使用机器学习模型**：根据单词在学习材料中的重要性排序
- **用户偏好排序**：根据用户的学习历史调整排序

### 3. 单词过滤

#### 3.1 停用词过滤
- **使用标准停用词列表**：包含常见的无意义单词
- **用户自定义停用词**：允许用户添加自己的停用词列表

#### 3.2 已学单词过滤
- **排除已掌握的单词**：使用用户的学习历史
- **阈值设置**：允许用户设置掌握的阈值

### 4. 单词匹配

#### 4.1 部分匹配
- **子字符串匹配**：提取包含关键词的单词
- **模糊匹配**：处理拼写错误和变体

#### 4.2 多语言支持
- **语言识别**：自动识别上下文的语言
- **多语言词典**：使用对应语言的词典进行识别
- **当前支持的语言**：
  - 英语（en）
  - 德语（de）
  - 日语（ja）
  - 韩语（ko）
  - 中文（zh）

### 5. 单词建议

#### 5.1 单词建议算法
- **基于上下文的建议**：
  - 使用 NLP 模型提供最相关的单词
  - 考虑单词之间的语义关系

#### 5.2 短语建议
- **识别常见短语**：
  - 如 "break down" 或 "make sense"
  - 在上下文中特别重要的短语

### 6. 用户交互

#### 6.1 手动输入
- **文本输入框**：允许用户输入未被识别的单词
- **建议列表**：提供实时搜索和建议

#### 6.2 选择和确认
- **多选支持**：允许用户选择多个单词
- **取消选择**：允许用户取消选择单词
- **全选/反选**：提供批量选择功能

### 7. 单词定义

#### 7.1 自动定义获取
- **词典 API**：使用外部词典 API 获取单词定义
- **缓存机制**：缓存已查询过的单词定义
- **离线支持**：提供基本的离线词典

#### 7.2 用户自定义定义
- **支持用户添加自定义定义**：
  - 允许用户编辑单词定义
  - 支持 Markdown 格式

### 8. 单词提取反馈

#### 8.1 反馈机制
- **用户标记不准确提取**：
  - 允许用户标记错误的单词提取
  - 用于改进算法

#### 8.2 学习改进
- **使用用户反馈优化提取**：
  - 记录用户的选择
  - 调整算法以更好地匹配用户的兴趣

## 技术实现

### 1. 基础实现（使用正则表达式）

```rust
use std::collections::HashSet;
use regex::Regex;

pub fn extract_words(context: &str) -> Vec<String> {
    let mut words = HashSet::new();

    let word_regex = Regex::new(r"\b[a-zA-Z]{3,}\b").unwrap();

    for capture in word_regex.captures_iter(context) {
        if let Some(word) = capture.get(0) {
            let word_str = word.as_str().to_lowercase();
            if !is_stop_word(&word_str) {
                words.insert(word_str);
            }
        }
    }

    words.into_iter().collect()
}

fn is_stop_word(word: &str) -> bool {
    let stop_words = [
        "the", "and", "for", "but", "that", "with", "this", "from",
        "have", "they", "their", "there", "your", "which", "when",
        "what", "where", "would", "could", "should", "might"
    ];

    stop_words.contains(&word)
}
```

### 2. 词频统计

```rust
use std::collections::HashMap;
use regex::Regex;

pub fn extract_words_with_frequency(context: &str) -> Vec<(String, usize)> {
    let mut word_counts = HashMap::new();

    let word_regex = Regex::new(r"\b[a-zA-Z]{3,}\b").unwrap();

    for capture in word_regex.captures_iter(context) {
        if let Some(word) = capture.get(0) {
            let word_str = word.as_str().to_lowercase();
            if !is_stop_word(&word_str) {
                *word_counts.entry(word_str).or_insert(0) += 1;
            }
        }
    }

    let mut sorted_words: Vec<(String, usize)> = word_counts.into_iter().collect();
    sorted_words.sort_by(|a, b| b.1.cmp(&a.1));

    sorted_words
}
```

### 3. NLP 集成（使用 spaCy 或其他库）

```rust
// 这是一个简化的示例
pub fn extract_with_nlp(context: &str) -> Vec<String> {
    // 实际实现会使用 spaCy 或其他 NLP 库
    // 这个示例展示了概念
    let processed_text = nlp::process_text(context);

    processed_text
        .tokens()
        .filter(|token| {
            // 只保留名词、动词和形容词
            token.pos().is_verb() ||
            token.pos().is_noun() ||
            token.pos().is_adjective()
        })
        .map(|token| token.lemma().to_lowercase())
        .collect()
}
```

## 性能优化

### 1. 缓存机制

```rust
use std::collections::HashMap;
use std::sync::RwLock;

static WORD_EXTRACTION_CACHE: RwLock<HashMap<String, Vec<String>>> = RwLock::new(HashMap::new());

pub fn extract_words_with_cache(context: &str) -> Vec<String> {
    // 尝试从缓存中获取结果
    if let Ok(read) = WORD_EXTRACTION_CACHE.read() {
        if let Some(result) = read.get(context) {
            return result.clone();
        }
    }

    // 执行实际的单词提取
    let result = extract_words(context);

    // 保存到缓存（使用写锁）
    if let Ok(mut write) = WORD_EXTRACTION_CACHE.write() {
        write.insert(context.to_string(), result.clone());
    }

    result
}
```

### 2. 并行处理

```rust
use rayon::prelude::*;

pub fn extract_words_parallel(contexts: &[String]) -> Vec<Vec<String>> {
    contexts.par_iter()
        .map(|context| extract_words_with_cache(context))
        .collect()
}
```

## 边界条件

### 1. 空上下文
- **处理**：返回空列表，不提取任何单词

### 2. 无单词的上下文
- **处理**：返回空列表，允许用户手动输入单词

### 3. 非英文内容
- **处理**：
  - 使用适当的语言处理算法
  - 对于不支持的语言，可能返回空列表

### 4. 非常长的上下文
- **处理**：
  - 限制处理的最大字符数
  - 使用分块处理避免内存问题

## 与其他功能的集成

### 1. 与 Inbox 管理的集成
- **在处理 Inbox 项时**：
  - 调用单词提取功能
  - 显示提取结果供用户选择
  - 处理用户的选择并创建关联

### 2. 与库视图的集成
- **在添加新单词时**：
  - 提供单词提取建议
  - 支持快速添加

### 3. 与搜索功能的集成
- **搜索时**：
  - 使用单词提取技术增强搜索
  - 提供相关单词建议

## 可访问性

### 1. 文本到语音支持
- **单词发音**：
  - 使用 Text-to-Speech (TTS) 技术
  - 支持多种语言和方言

### 2. 视觉优化
- **单词高亮**：
  - 在上下文中高亮显示提取的单词
  - 支持颜色编码

## 配置选项

### 1. 提取算法配置
- **提取方法**：允许用户选择提取算法（基础/高级）
- **最小单词长度**：允许用户设置最小单词长度
- **停用词管理**：允许用户编辑停用词列表

### 2. 显示配置
- **单词排序**：允许用户选择排序方式
- **显示数量**：限制显示的单词数量
- **单词预览**：允许用户选择是否显示单词预览

### 3. 性能配置
- **缓存大小**：允许用户配置缓存大小
- **并行处理**：允许用户启用/禁用并行处理
