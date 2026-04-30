---
description: Delegate investigation, an explicit fix request, or follow-up rescue work to the Codex companion runtime
argument-hint: "[--background|--wait] [--resume|--fresh] [--model <model|spark>] [--effort <none|minimal|low|medium|high|xhigh>] [what Codex should investigate, solve, or continue]"
---

Forward the user's rescue request to the Codex companion runtime by running `node "${PI_CODEX_ROOT}/scripts/codex-companion.mjs" task ...`.
The final user-visible response must be Codex's output verbatim.

Raw user request:
$ARGUMENTS

Selection guidance:
- Use this command proactively when pi should hand a substantial debugging or implementation task to Codex.
- Do not grab simple asks that pi can finish quickly on its own.

Routing flags (handled by you, not forwarded as task text):
- `--background` and `--wait` are execution flags. If `--background`, spawn in background and return immediately. If `--wait`, run foreground. If neither and the task is open-ended or multi-step, prefer background; otherwise foreground.
- `--model` and `--effort` are runtime-selection flags. Preserve them in the forwarded `task` call. Leave each unset unless the user explicitly asks for one. If the user asks for `spark`, map it to `--model gpt-5.3-codex-spark`.
- `--resume` and `--fresh` are routing controls. Preserve them in the forwarded `task` call.
- If the user did not pass `--resume` or `--fresh`, check for a resumable rescue thread:

```bash
node "${PI_CODEX_ROOT}/scripts/codex-companion.mjs" task-resume-candidate --json
```

- If that helper reports `available: true`, call the `codex_ask` tool exactly once with these two choices:
  - `Continue current Codex thread`
  - `Start a new Codex thread`
- If the user is clearly giving a follow-up instruction such as "continue", "keep going", "resume", "apply the top fix", or "dig deeper", put `Continue current Codex thread (Recommended)` first.
- Otherwise put `Start a new Codex thread (Recommended)` first.
- If the user chooses continue, add `--resume` to the forwarded `task` call.
- If the user chooses a new thread, add `--fresh` to the forwarded `task` call.
- If the helper reports `available: false`, do not ask. Route normally.

Forwarding rules:
- Use exactly one bash call per execution. Strip routing flags (`--background`, `--wait`) before forwarding. Keep runtime flags (`--model`, `--effort`, `--resume`, `--fresh`) on the forwarded command.
- Default to a write-capable Codex run by adding `--write` unless the user explicitly asks for read-only behavior or only wants review, diagnosis, or research without edits.
- Preserve the user's task text as-is apart from stripping routing flags.
- Return the stdout of the `codex-companion` command exactly as-is.
- Do not paraphrase, summarize, rewrite, or add commentary before or after it.
- Do not inspect the repository, read files, grep, monitor progress, poll status, fetch results, cancel jobs, or do any follow-up work of your own.
- Do not call `review`, `adversarial-review`, `status`, `result`, or `cancel`. This prompt only forwards to `task`.
- If the helper reports that Codex is missing or unauthenticated, stop and tell the user to run `/codex:setup`.
- If the user did not supply a request, ask what Codex should investigate or fix.

Foreground:
```bash
node "${PI_CODEX_ROOT}/scripts/codex-companion.mjs" task "$ARGUMENTS"
```

Background:
```bash
nohup node "${PI_CODEX_ROOT}/scripts/codex-companion.mjs" task "$ARGUMENTS" >/dev/null 2>&1 &
```
