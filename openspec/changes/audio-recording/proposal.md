# 录音文件功能提案

## 概述

添加录音文件功能，允许用户上传录音文件或直接录音，进行实时转写，编辑转写文本，并从转写内容中提取上下文和制作单词卡片。

## 当前问题

### 1. 缺乏音频内容处理能力
- 应用目前主要支持文本和视频内容
- 无法处理音频文件中的语言学习内容
- 用户需要使用外部工具处理录音文件

### 2. 录音内容转写困难
- 用户需要手动转录录音内容
- 缺乏自动语音识别（ASR）功能
- 转录过程耗时且容易出错

### 3. 录音内容的单词学习支持不足
- 无法直接从录音内容中提取单词
- 缺乏针对口语内容的语言学习功能
- 录音内容无法与现有的笔记和卡片系统集成

## 解决方案：录音文件功能

### 1. 核心设计理念
**Voice to vocabulary** — 将口语录音内容转化为可学习的词汇资源。

### 2. 主要功能

#### A. 录音文件上传与转写
- **文件上传**：支持常见音频格式（MP3、WAV、M4A 等）
- **实时转写**：使用 ASR 技术自动转录音频内容
- **转写进度**：显示转写进度和状态
- **转写结果预览**：转写完成后立即显示结果

#### B. 转录文本编辑器
- **文本编辑**：支持对转写结果进行修改和完善
- **段落划分**：自动或手动划分段落
- **时间戳标记**：显示每个部分对应的音频时间戳
- **编辑历史**：保存编辑历史记录

#### C. 录音功能
- **实时录音**：支持直接在应用中录制音频
- **录音保存**：自动保存录音文件
- **录音预览**：录音后可预览和播放

#### D. 单词提取与卡片制作
- **自动提取**：从转写内容中自动提取可能的单词
- **上下文生成**：为每个单词生成对应的上下文
- **卡片制作**：支持将单词和上下文添加到笔记库
- **批量操作**：支持批量处理转写内容

## 架构设计

### 1. 数据模型
```typescript
interface AudioRecording {
  id: string;
  filename: string;
  duration: number;
  transcript: Transcript;
  audioPath: string;
  recordedAt: string;
  processed: boolean;
}

interface Transcript {
  id: string;
  segments: Array<{
    id: string;
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
  language: string;
  edited: boolean;
}
```

### 2. 存储方案
- 音频文件存储在本地文件系统
- 转写文本存储在 SQLite 数据库
- 与现有的 Note-Context 模型集成

### 3. API 设计
```rust
#[tauri::command]
pub async fn upload_audio_file(file_path: String) -> Result<AudioRecording, String>;

#[tauri::command]
pub async fn transcribe_audio(audio_id: &str) -> Result<Transcript, String>;

#[tauri::command]
pub async fn start_recording() -> Result<String, String>;

#[tauri::command]
pub async fn stop_recording() -> Result<AudioRecording, String>;

#[tauri::command]
pub async fn update_transcript(audio_id: &str, transcript: Transcript) -> Result<(), String>;

#[tauri::command]
pub async fn extract_words_from_transcript(transcript: Transcript) -> Result<Vec<String>, String>;
```

## 变更范围

### 受影响的组件
- [x] 后端数据模型
- [x] Tauri 命令
- [x] 前端状态管理（Zustand stores）
- [x] 新增录音功能组件
- [x] 与现有笔记库集成
- [x] 全局快捷键

### 新增功能
- [ ] 音频上传和转写组件
- [ ] 转录文本编辑器
- [ ] 录音功能组件
- [ ] 单词提取和卡片制作功能
- [ ] 音频播放器组件

## 实施计划

### 阶段 1：基础架构
1. 设计并实现 AudioRecording 和 Transcript 数据模型
2. 开发音频文件上传和存储功能
3. 实现音频文件转写服务集成
4. 开发录音功能组件

### 阶段 2：转录编辑
1. 实现转录文本编辑器组件
2. 开发时间戳和段落管理功能
3. 添加编辑历史记录功能
4. 优化转写结果的显示和交互

### 阶段 3：单词提取
1. 实现从转录文本中提取单词的功能
2. 开发单词上下文生成算法
3. 集成到现有的卡片制作流程
4. 添加批量处理功能

### 阶段 4：优化和测试
1. 优化音频处理和转写性能
2. 添加音频播放和控制功能
3. 编写单元测试和集成测试
4. 优化用户体验

## 成功标准

- [x] 用户可以上传音频文件并进行转写
- [x] 转写结果可以编辑和完善
- [x] 支持直接录音功能
- [x] 可以从转写内容中提取单词并制作卡片
- [x] 与现有的笔记库和 Anki 集成功能正常
- [x] 音频播放和控制功能正常

## 风险评估

### 高风险
1. **转写准确性**：ASR 技术可能无法完美识别所有内容
2. **性能问题**：处理大音频文件可能影响性能

### 缓解策略
1. 提供手动编辑功能作为补充
2. 优化音频处理和转写性能
3. 添加进度显示和超时处理

### 中风险
1. **音频格式兼容性**：不同音频格式的处理可能有差异
2. **用户体验**：复杂的操作流程可能影响用户体验

### 缓解策略
1. 支持常见的音频格式
2. 设计简洁直观的用户界面
3. 提供详细的帮助文档和示例

## 未来扩展

### 1. 实时转写
- 支持实时录音实时转写
- 提供更流畅的转写体验

### 2. 实时单词选择
- 在音频播放过程中支持实时选中单词
- 提供单词的即时翻译和释义

### 3. 多语言支持
- 支持多种语言的转写
- 语言特定的语音识别优化

### 4. 高级音频处理
- 音频增强和降噪功能
- 语速和音量调整
- 音频片段修剪和合并
