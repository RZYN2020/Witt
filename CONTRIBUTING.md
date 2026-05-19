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
- Use existing `Button`, `utils`, and Tailwind conventions.
- All backend access goes through `lib/commands.ts` — no direct `invoke` calls in components.

**Backend**
- Keep the Rust side thin: persistence, file I/O, OS keyring, AnkiConnect HTTP.
- SQL lives in `db.rs`; business logic lives in TypeScript.
- New IPC commands go in `commands.rs` and must be registered in `main.rs`.

## Verification

```bash
cd witt-tauri/ui && pnpm check
cd /Users/eka/Code/witt && cargo check
```
