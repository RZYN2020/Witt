# Contributing

Keep the product small and reader-first.

## Principles

- The EPUB reader is the main screen; don't clutter it.
- Annotations are always `word + sentence + location`. Don't weaken this.
- Batch LLM work at most 20 annotations per request.
- New non-core workflows go behind the extension registry, not into reader or bookshelf code.
- Don't add capture, inbox, video, audio, or broad library management unless explicitly scoped.

## Code Style

**Frontend**
- Small TypeScript modules with explicit interfaces.
- Keep UI state local unless genuinely shared across views.
- Use existing `Button`, `Tabs`, `Form`, and Tailwind conventions.
- All backend access goes through `lib/commands.ts`; components never call Tauri `invoke` directly.
- Keep reader-only dependencies inside `components/reader/`. `ReaderView` is lazy-loaded from `App.tsx`.

**Backend**
- Keep the Rust side thin: persistence, file I/O, OS keyring, AnkiConnect HTTP.
- Product SQL queries live in `db.rs`; schema/default settings live in `db_schema.rs`; settings table helpers live in `db_settings.rs`.
- Tauri IPC handlers live in `commands/` by product domain and are re-exported from `commands.rs`.
- New IPC commands go in the matching `commands/` module, must be re-exported from `commands.rs`, and must be registered in `main.rs`.

## Verification

```bash
cd witt-tauri/ui && pnpm check
cd witt-tauri/ui && pnpm build
cd /Users/eka/Code/witt/witt-tauri/src-tauri && cargo fmt --check
cd /Users/eka/Code/witt/witt-tauri/src-tauri && cargo clippy --all-targets --all-features -- -D warnings
cd /Users/eka/Code/witt/witt-tauri/src-tauri && cargo test
```
