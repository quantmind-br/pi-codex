# pi-codex

Use [Codex](https://github.com/openai/codex) from inside [pi-coding-agent](https://github.com/badlogic/pi-mono) to review code or delegate tasks. This is a port of OpenAI's [`codex` Claude Code plugin](https://github.com/openai/codex-plugin-cc) to the pi runtime.

## What it adds

| Command | What it does |
|---|---|
| `/codex:review` | Run a Codex code review against local git state |
| `/codex:adversarial-review` | Codex review that challenges design choices and assumptions |
| `/codex:rescue [task]` | Delegate a substantial debugging or implementation task to Codex |
| `/codex:status` | List running and recent Codex jobs for the current repo |
| `/codex:result <id>` | Print the final Codex output for a finished job |
| `/codex:cancel <id>` | Cancel an active background Codex job |
| `/codex:setup` | Check Codex install / auth and toggle the optional review gate |
| `/codex:gate` | Run a stop-time Codex review of the previous turn (opt-in) |

The first three are pi prompt templates — model-driven, with size estimation and a "wait vs. background" prompt via the `codex_ask` interactive tool. The other five are extension-registered commands that shell out to the companion runtime directly, no model turn needed.

## Requirements

- Node.js 18.18+
- A local `codex` binary on `PATH` and a working Codex auth (run `/codex:setup` to verify)
- pi-coding-agent installed (`npm install -g @mariozechner/pi-coding-agent`)

## Install

```bash
pi install git:github.com/quantmind-br/pi-codex
```

Or for a local checkout while developing:

```bash
pi install /path/to/pi-codex
```

After install, run any `/codex:*` command inside `pi`.

## How it works

The wrapper layer is pi-native; the runtime is the upstream OpenAI companion script reused verbatim. On `session_start` the extension sets `PI_CODEX_ROOT` (and also `CLAUDE_PLUGIN_ROOT` for cross-compatibility) to the package directory, then runs `scripts/session-lifecycle-hook.mjs SessionStart`. On `session_shutdown` it runs the same hook with `SessionEnd`.

The deterministic commands (`status`, `result`, `cancel`, `setup`, `gate`) are registered via `pi.registerCommand(...)` and `spawn` the companion script directly. The model-driven prompt templates (`review`, `adversarial-review`, `rescue`) read raw arguments, optionally interact with the user via the `codex_ask` tool, and forward to `node "${PI_CODEX_ROOT}/scripts/codex-companion.mjs" <subcmd>`.

## Differences vs. the Claude Code plugin

- No automatic Stop-hook. The pre-ship Codex review is opt-in via `/codex:gate`.
- No `codex-rescue` subagent. Pi does not auto-discover package-shipped agents, so the rescue forwarder logic lives directly in the `/codex:rescue` prompt template.
- `AskUserQuestion` (Claude Code tool) is replaced by the `codex_ask` extension tool, which wraps `ctx.ui.select()`.
- Two upstream concurrency bugs are patched in pi-codex's runtime copy (broker `BROKER_BUSY` no longer falls back to a direct app-server; background workers now have their job record persisted before the worker is spawned). See `CHANGELOG.md` "Runtime patches" for details.

## Development

```bash
npm install
npm run typecheck
npm test
```

## License

Apache-2.0. Original work copyright OpenAI; pi-codex port modifications copyright diogo. See `LICENSE` and `NOTICE`.
