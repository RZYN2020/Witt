# Witt 开发和运行指南

## 快速开始

### 方式 1：网页端开发（无需 Rust）

适合 UI 开发和快速迭代：

```bash
# 进入前端目录
cd witt-tauri/ui

# 安装依赖（如果还没安装）
pnpm install

# 开发模式（推荐）
pnpm dev
# 访问 http://localhost:1420

# 或者构建生产版本
pnpm build
```

**优点：**
- 快速启动，无需 Rust
- 热重载，开发体验好
- 所有 UI 功能都可用

**限制：**
- 只能作为网页运行
- 没有原生全局快捷键
- 数据不持久化（mock 模式）

---

### 方式 2：桌面端（需要 Rust）

完整的 Tauri 桌面应用：

#### 1. 安装 Rust

```bash
# macOS/Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 验证安装
rustc --version
cargo --version
```

#### 2. 安装系统依赖（macOS）

```bash
# Xcode Command Line Tools
xcode-select --install
```

#### 3. 构建并运行桌面应用

```bash
# 进入项目根目录
cd /Users/eka/Code/witt

# 开发模式运行（同时启动前端和后端）
cd witt-tauri/ui && pnpm dev

# 在另一个终端，构建并运行 Tauri 应用
cd /Users/eka/Code/witt
cargo install tauri-cli
cargo tauri dev
```

或者一次性构建：

```bash
cd witt-tauri/ui
pnpm install
pnpm build
cd ../src-tauri
cargo tauri dev
```

**优点：**
- 原生桌面应用
- 支持全局快捷键（Ctrl+Alt+C/L）
- 系统托盘集成
- 更好的性能

---

## 常见问题

### Q: 为什么 `pnpm build` 失败？

A: 之前有一些 TypeScript 类型错误，已经修复。如果还有问题：

```bash
cd witt-tauri/ui
pnpm install
pnpm build
```

如果看到类型错误，检查错误信息并修复对应的 `.tsx` 或 `.ts` 文件。

### Q: 如何只测试 UI 不运行桌面端？

A: 直接运行前端开发服务器：

```bash
cd witt-tauri/ui
pnpm dev
```

然后在浏览器打开 http://localhost:1420

### Q: 桌面端和网页端有什么区别？

| 功能 | 网页端 | 桌面端（Tauri） |
|------|--------|----------------|
| 运行环境 | 浏览器 | 原生应用 |
| 全局快捷键 | ❌ | ✅ |
| 系统托盘 | ❌ | ✅ |
| 文件系统访问 | 受限 | 完整 |
| 性能 | 好 | 更好 |
| 开发速度 | 快 | 较慢（需编译 Rust） |

### Q: 如何构建可分发的应用？

```bash
cd witt-tauri/ui
pnpm build
cd ../src-tauri
cargo tauri build
```

构建完成后，应用包在：
- macOS: `src-tauri/target/release/bundle/macos/`
- Windows: `src-tauri/target/release/bundle/msi/`
- Linux: `src-tauri/target/release/bundle/deb/`

---

## 键盘快捷键

### 网页端
- `Ctrl+Alt+C` - 打开捕获弹窗（需要浏览器权限）
- `Ctrl+Alt+L` - 打开图书馆视图

### 桌面端（安装后）
- `Ctrl+Alt+C` - 全局捕获弹窗（任何应用中都可用）
- `Ctrl+Alt+L` - 全局图书馆视图

---

## 下一步

1. **UI 开发**：使用网页端模式（`pnpm dev`）
2. **准备发布**：安装 Rust，构建桌面端
3. **添加功能**：继续实现剩余特性

有任何问题欢迎提问！
