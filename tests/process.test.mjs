import test from "node:test";
import assert from "node:assert/strict";

import { terminateProcessTree } from "../scripts/lib/process.mjs";

test("terminateProcessTree uses taskkill on Windows", () => {
  let captured = null;
  const outcome = terminateProcessTree(1234, {
    platform: "win32",
    runCommandImpl(command, args) {
      captured = { command, args };
      return {
        command,
        args,
        status: 0,
        signal: null,
        stdout: "",
        stderr: "",
        error: null
      };
    },
    killImpl() {
      throw new Error("kill fallback should not run");
    }
  });

  assert.deepEqual(captured, {
    command: "taskkill",
    args: ["/PID", "1234", "/T", "/F"]
  });
  assert.equal(outcome.delivered, true);
  assert.equal(outcome.method, "taskkill");
});

test("terminateProcessTree treats missing Windows processes as already stopped", () => {
  const outcome = terminateProcessTree(1234, {
    platform: "win32",
    runCommandImpl(command, args) {
      return {
        command,
        args,
        status: 128,
        signal: null,
        stdout: "ERROR: The process \"1234\" not found.",
        stderr: "",
        error: null
      };
    }
  });

  assert.equal(outcome.attempted, true);
  assert.equal(outcome.method, "taskkill");
  assert.equal(outcome.result.status, 128);
  assert.match(outcome.result.stdout, /not found/i);
});

test("terminateProcessTree on POSIX falls back to direct PID when PGID kill returns ESRCH", () => {
  const calls = [];
  const outcome = terminateProcessTree(2345, {
    platform: "linux",
    killImpl(target, signal) {
      calls.push({ target, signal });
      if (target === -2345) {
        const err = new Error("no such process");
        err.code = "ESRCH";
        throw err;
      }
      // Direct PID kill succeeds.
      return undefined;
    }
  });

  assert.deepEqual(calls, [
    { target: -2345, signal: "SIGTERM" },
    { target: 2345, signal: "SIGTERM" }
  ]);
  assert.equal(outcome.attempted, true);
  assert.equal(outcome.delivered, true);
  assert.equal(outcome.method, "process");
});

test("terminateProcessTree on POSIX reports not delivered only when both PGID and direct kill ESRCH", () => {
  const outcome = terminateProcessTree(3456, {
    platform: "linux",
    killImpl() {
      const err = new Error("no such process");
      err.code = "ESRCH";
      throw err;
    }
  });

  assert.equal(outcome.attempted, true);
  assert.equal(outcome.delivered, false);
  assert.equal(outcome.method, "process");
});
