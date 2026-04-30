# Changelog

## 0.1.0

- Initial port of the OpenAI Codex Claude Code plugin to the pi-coding-agent runtime.
- Reuses the upstream Node.js companion runtime (`scripts/codex-companion.mjs` and `scripts/lib/*.mjs`) verbatim.
- Replaces Claude Code wrapper layer with:
  - Pi extension (`extension/index.ts`) that wires `session_start` / `session_shutdown` lifecycle, registers the `codex_ask` interactive tool, and provides extension-native commands `/codex:status`, `/codex:result`, `/codex:cancel`, `/codex:setup`, `/codex:gate`.
  - Pi prompt templates for the model-driven flows: `/codex:review`, `/codex:adversarial-review`, `/codex:rescue`.
  - Three internal skills (`codex-cli-runtime`, `codex-result-handling`, `gpt-5-4-prompting`) tagged `disable-model-invocation: true`.
- Replaces the Claude Code Stop hook with a manual `/codex:gate` command. The pi-codex gate **never fails open**: it always runs a real Codex task (bypassing the upstream `stopReviewGate` config toggle), errors out cleanly if Codex is not set up, and treats any non-`ALLOW:` / non-`BLOCK:` output as a failure rather than a pass.
- Sets both `PI_CODEX_ROOT` and the legacy `CLAUDE_PLUGIN_ROOT` to the package install directory so the upstream runtime is reused without forking the wider package.

### Runtime patches (diverges from upstream codex-plugin-cc)

These fixes patch concurrency bugs flagged by an adversarial Codex review of the v0.1.0 port. The patched files are no longer byte-identical to upstream.

- `scripts/lib/codex.mjs` — `withAppServer` no longer falls back to a direct (broker-less) Codex runtime when the shared broker returns `BROKER_BUSY`. Direct fallback is now reserved for endpoints that are dead before any request is accepted (`ENOENT` / `ECONNREFUSED`). Concurrent `BROKER_BUSY` is surfaced as a `CODEX_BROKER_BUSY` error with a clear "wait or cancel" message instead of silently starting a parallel app-server that could race the active stream into the same worktree.
- `scripts/codex-companion.mjs` — `enqueueBackgroundTask` now persists the queued job record **before** spawning the detached worker, so the worker can never start before its job file exists. Spawn failures are caught synchronously and the asynchronous `error` event is also handled, marking the job as `failed` with a useful error message instead of leaving a permanently queued task with a dead pid.
- `scripts/lib/process.mjs` — `terminateProcessTree` on POSIX now falls back to a direct `kill(pid)` when the process-group `kill(-pid)` returns `ESRCH`. The recorded pid for a `nohup ... &` background launch may be a child rather than a process-group leader, in which case the previous code reported `delivered: false` and a write-capable Codex run could keep running and modifying the worktree after `/codex:cancel` thought it had stopped.
- `scripts/lib/state.mjs` — state writes are now atomic (temp file + rename) and rotate the previous good copy into `state.json.bak`. `loadState` falls back to the rotated backup when the live state file is unreadable, and raises a typed `CorruptStateError` instead of silently returning defaults when both copies are corrupt. The previous behavior would reset `stopReviewGate` to `false` and drop active jobs from `/codex:status` and `/codex:cancel` after any partial write or parse failure — a fail-open recovery path for the exact metadata used to enforce review and stop running work.
