# Context Inbox 任务清单

## 阶段 1：基础架构

- [x] 创建 `witt-core/src/inbox.rs` 模块
  - [x] 定义 InboxItem 结构体
  - [x] 实现基础的 Inbox 管理功能
  - [x] 添加单词提取功能
  - [x] 实现 Inbox 到 Note 的转换逻辑
- [x] 更新数据库 schema
  - [x] 创建 inbox_items 表
  - [x] 创建 context_note_associations 关联表
  - [x] 添加必要的索引
  - [x] 更新数据迁移工具
- [x] 实现 Tauri 命令
  - [x] 添加 `add_to_inbox` 命令
  - [x] 添加 `get_inbox_items` 命令（支持分页和过滤）
  - [x] 添加 `process_inbox_item` 命令
  - [x] 添加 `delete_inbox_item` 命令
  - [x] 添加 `mark_inbox_item_processed` 命令
  - [x] 添加 `clear_processed_items` 命令
  - [x] 添加 `extract_words` 命令
  - [x] 添加 `extract_words_with_frequency` 命令
- [x] 更新 `witt-core/src/error.rs`
  - [x] 添加 Inbox 相关的错误类型
  - [x] 更新 WittCoreError 枚举

## 阶段 2：前端状态管理

- [x] 创建 `witt-tauri/ui/src/stores/useInboxStore.ts`
  - [x] 定义 Inbox 状态结构
  - [x] 实现 loadItems 动作
  - [x] 实现搜索和过滤动作
  - [x] 实现添加和处理动作
  - [x] 实现分页管理
- [x] 更新类型定义
  - [x] 在 `types.ts` 中添加 InboxItem 接口
  - [x] 扩展 CaptureRequest 接口
- [x] 更新 `witt-tauri/ui/src/lib/commands.ts`
  - [x] 添加与后端通信的类型安全接口
  - [x] 实现所有 Inbox 相关的 API 调用

## 阶段 3：UI 组件

- [x] 创建快速捕获弹窗
  - [x] 实现极简设计的快速捕获 UI
  - [x] 添加全局快捷键支持（Ctrl+Alt+I）
  - [x] 实现源信息自动提取
- [x] 创建 Inbox 管理页面
  - [x] 实现列表视图
  - [x] 添加搜索和过滤功能
  - [x] 实现分页显示
  - [x] 添加批量操作功能
  - [x] 在库视图中添加 Inbox 标签页
- [x] 创建上下文处理对话框
  - [x] 实现单词自动提取和选择
  - [x] 支持选择多个单词
  - [x] 添加手动输入单词的功能
  - [x] 实现处理进度反馈
- [x] 更新导航和布局
  - [x] 在 Sidebar 中添加 Inbox 入口
  - [x] 添加 Inbox 统计信息（未处理数量）
- [x] 优化现有组件
  - [x] 更新 CapturePopup 支持 Inbox 选项
  - [x] 确保与现有功能的兼容性

## 阶段 4：优化和测试

- [x] 单词提取优化
  - [x] 实现更复杂的 NLP 分词
  - [x] 支持多语言单词提取
  - [x] 添加单词重要性评分
- [x] 搜索和过滤优化
  - [x] 实现更高级的搜索功能
  - [x] 添加更多过滤条件
  - [x] 优化搜索性能
- [x] 分页优化
  - [x] 实现无限滚动加载
  - [x] 优化页面大小配置
  - [x] 添加加载状态动画
- [x] 编写测试
  - [x] 编写后端单元测试
  - [x] 编写前端组件测试
  - [x] 编写集成测试
  - [x] 编写端到端测试

## 阶段 5：用户体验优化

- [x] 添加快捷键配置
  - [x] 在设置中添加快捷键配置项
  - [x] 允许用户自定义 Inbox 快捷键
- [x] 添加处理进度反馈
  - [x] 显示处理成功的通知
  - [x] 提供错误处理和恢复建议
  - [x] 添加处理过程的进度条
- [x] 优化响应式设计
  - [x] 确保在不同屏幕尺寸上的体验
  - [x] 优化移动端显示
- [x] 添加帮助文档
  - [x] 编写 Inbox 功能的使用指南
  - [x] 添加快捷键说明
  - [x] 提供最佳实践建议

## 阶段 6：集成和部署

- [x] 集成到现有工作流程
  - [x] 在应用启动时自动加载 Inbox
  - [x] 在库视图中显示 Inbox 入口
  - [x] 实现与其他功能的导航
- [x] 测试部署
  - [x] 测试开发和生产环境
  - [x] 验证数据存储和访问
  - [x] 检查权限和安全
- [x] 更新文档
  - [x] 更新 README.md 包含 Inbox 功能
  - [x] 更新键盘快捷键说明
  - [x] 更新功能概述

## 依赖关系

- **后端依赖**：sqlx, uuid, chrono, regex
- **前端依赖**：react, zustand, framer-motion, lucide-react
- **NLP 依赖**：可能需要使用外部 NLP 库或 API

## 里程碑

**阶段 1 完成**：后端功能基本可用
**阶段 2 完成**：前端状态管理基本可用
**阶段 3 完成**：基本 UI 功能可用
**阶段 4 完成**：功能完善并通过测试
**阶段 5 完成**：用户体验优化
**阶段 6 完成**：功能正式发布

## 跟踪说明

每个任务完成后应更新任务状态。重要的任务需要添加子任务或详细描述。定期更新进度并记录遇到的问题和解决方案。
