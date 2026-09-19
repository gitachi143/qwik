#!/usr/bin/env node
import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  lstat,
  chmod,
  access,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, join, relative, basename, isAbsolute, sep } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import {
  scanFiles,
  auditDependencies,
  modelReview,
  DEFAULT_PROMPT,
  dependenciesFromFiles,
} from "./lib/scanner.mjs";
const args = process.argv.slice(2);
const cmd = args[0] || "interactive";
const configDir =
  process.env.QWIK_CONFIG_DIR || join(homedir(), ".config", "qwik");
const configPath = join(configDir, "config.json");
let config = {};
try {
  config = JSON.parse(await readFile(configPath, "utf8"));
} catch {}
const SITE = (
  process.env.QWIK_URL ||
  config.url ||
  "https://polite-river-00fb9ed10.4.azurestaticapps.net"
).replace(/\/$/, "");
const token = () => process.env.QWIK_TOKEN || config.token;
const cyan = (s) => (process.stdout.isTTY ? `\x1b[38;5;156m${s}\x1b[0m` : s);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
async function saveConfig() {
  await mkdir(configDir, { recursive: true, mode: 0o700 });
  await writeFile(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
  await chmod(configPath, 0o600);
}
async function api(path, method = "GET", body) {
  const res = await fetch(`${SITE}/api/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Qwik-Request": "1",
      ...(token()
        ? { "X-Qwik-Token": token(), Authorization: `Bearer ${token()}` }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(40000),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Qwik API returned HTTP ${res.status}.`);
  }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
function git(...command) {
  const result = spawnSync("git", command, {
    encoding: "utf8",
    maxBuffer: 5e6,
  });
  return result.status === 0 ? result.stdout.trim() : "";
}
function openBrowser(url) {
  const app =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "explorer.exe"
        : "xdg-open";
  const p = spawn(app, [url], { stdio: "ignore", detached: true });
  p.on("error", () => {});
  p.unref();
}
async function login() {
  const provided = option("--token") || process.env.QWIK_TOKEN;
  if (provided) {
    config.token = provided;
    config.url = SITE;
    await api("projects");
    await saveConfig();
    console.log("Connected to Qwik.");
    return;
  }
  const device = await api("device/start", "POST", {});
  console.log(
    `\nOpen ${device.verificationUrl}\nDevice code: ${cyan(device.userCode)}\nApprove this device in your browser.\n`,
  );
  openBrowser(device.verificationUrl);
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const result = await api("device/poll", "POST", {
      deviceCode: device.deviceCode,
    });
    if (result.status === "approved") {
      config.token = result.token;
      config.url = SITE;
      await saveConfig();
      console.log(cyan("✓ CLI connected. Run qwik in any project."));
      return;
    }
  }
  throw new Error("Login expired. Run qwik login again.");
}
const supported =
  /\.(?:[cm]?[jt]sx?|py|go|rs|java|rb|php|cs|html|vue|svelte|ya?ml|tf|json|toml|sh|sql|txt|pem|key)$/i;
async function collectFiles(root) {
  let paths = git("-C", root, "ls-files", "-z").split("\0").filter(Boolean);
  if (!paths.length) {
    paths = [];
    async function walk(dir) {
      for (const d of await readdir(dir, { withFileTypes: true })) {
        if (paths.length >= 2000) return;
        if (
          [
            "node_modules",
            ".git",
            "vendor",
            "dist",
            "build",
            "coverage",
            ".venv",
            ".next",
          ].includes(d.name) ||
          d.isSymbolicLink()
        )
          continue;
        const p = join(dir, d.name);
        if (d.isDirectory()) await walk(p);
        else paths.push(relative(root, p));
      }
    }
    await walk(root);
  }
  const files = [];
  let bytes = 0;
  let excluded = 0;
  for (const path of paths) {
    if (
      !supported.test(path) &&
      !/(^|\/)Dockerfile$/.test(path) &&
      !/(^|\/)\.env(?:\.[^/]+)?$/.test(path)
    ) {
      excluded++;
      continue;
    }
    const full = resolve(root, path);
    const rel = relative(root, full);
    if (isAbsolute(rel) || rel.startsWith(".." + sep) || rel === "..") continue;
    try {
      const st = await lstat(full);
      if (st.isSymbolicLink()) continue;
      if (
        st.size > 300000 ||
        bytes + st.size > 3000000 ||
        files.length >= 500
      ) {
        excluded++;
        continue;
      }
      const content = await readFile(full, "utf8");
      if (content.includes("\0")) continue;
      bytes += st.size;
      files.push({ path, content });
    } catch {
      excluded++;
    }
  }
  return {
    files,
    coverage: {
      availableFiles: paths.length,
      selectedFiles: files.length,
      excluded,
      limit: "500 files / 3 MB; individual files up to 300 KB",
    },
  };
}
function printScan(scan) {
  console.log(
    `\n${cyan("qwik.")}  ${scan.filesScanned} files · ${scan.findings.length} findings\n`,
  );
  for (const f of scan.findings) {
    console.log(
      `${f.severity.toUpperCase().padEnd(9)} ${f.title}\n          ${f.file}:${f.line} · ${f.ruleId}\n          ${f.remediation}\n`,
    );
  }
  if (!scan.findings.length)
    console.log(
      "No findings in the selected files. Automated review is not a security guarantee.",
    );
  console.log(
    `Dependencies: ${scan.dependencyStatus || "not checked"}\nModel: ${scan.modelStatus || "not enabled"}`,
  );
  if (scan.truncated)
    console.log("Result limit reached. Some findings were omitted.");
}
async function scan({ source = "cli", forceAI = false, quiet = false } = {}) {
  const root = resolve(
    option("--path") || git("rev-parse", "--show-toplevel") || process.cwd(),
  );
  const { files, coverage } = await collectFiles(root);
  if (!files.length) throw new Error("No supported source files found.");
  let policy = { prompt: DEFAULT_PROMPT, rules: [], version: 1 };
  if (token() && !args.includes("--offline")) {
    try {
      policy = await api("config");
    } catch (e) {
      if (!quiet) console.error(`Using bundled policy: ${e.message}`);
    }
  }
  const base = scanFiles(files, policy.rules);
  const deps = args.includes("--no-deps")
    ? { findings: [], status: "disabled" }
    : await auditDependencies(files);
  let model = { findings: [], status: "not enabled" };
  if (args.includes("--ai") || forceAI) {
    const settings = {
      ...config.model,
      apiKey: process.env.QWIK_MODEL_API_KEY || config.model?.apiKey,
    };
    if (!settings.endpoint || !settings.model)
      throw new Error("Configure a model first: qwik model");
    if (!quiet)
      console.log(
        `Sending selected source to ${settings.endpoint} (${settings.model}).`,
      );
    try {
      model = await modelReview(files, settings, policy.prompt);
    } catch (e) {
      model.status = `incomplete: ${e.message}`;
    }
  }
  const result = {
    ...base,
    coverage,
    findings: [...base.findings, ...deps.findings, ...model.findings],
    source:
      process.env.GITHUB_EVENT_NAME === "pull_request"
        ? "pull_request"
        : process.env.GITHUB_EVENT_NAME === "push"
          ? "push"
          : source,
    dependencyStatus: deps.status,
    modelStatus: model.status,
    dependencies: dependenciesFromFiles(files),
    promptVersion: policy.version,
    branch:
      process.env.GITHUB_HEAD_REF || git("branch", "--show-current") || "local",
    commit: git("rev-parse", "HEAD"),
  };
  let syncError =
    args.includes("--require-sync") && !token()
      ? "No CLI token configured. Set QWIK_TOKEN or run qwik login."
      : undefined;
  if (token() && !args.includes("--offline")) {
    try {
      let projectId = process.env.QWIK_PROJECT_ID;
      let projectFile;
      try {
        projectFile = JSON.parse(
          await readFile(join(root, ".qwik.json"), "utf8"),
        );
      } catch {}
      projectId = projectId || projectFile?.projectId;
      if (!projectId) {
        const remote = git("remote", "get-url", "origin");
        const match = remote.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
        const project = await api("projects", "POST", {
          name: basename(root),
          repository: match?.[1],
        });
        projectId = project.id;
        await writeFile(
          join(root, ".qwik.json"),
          JSON.stringify({ projectId }, null, 2) + "\n",
        );
      }
      const saved = await api("scans", "POST", { ...result, projectId });
      result.id = saved.id;
      result.url = `${SITE}/app/scans/${saved.id}`;
    } catch (e) {
      syncError = e.message;
    }
  }
  if (args.includes("--json"))
    console.log(JSON.stringify({ ...result, syncError }, null, 2));
  else if (!quiet) {
    printScan(result);
    if (result.url) console.log(`\nSynced → ${result.url}`);
    else if (syncError)
      console.error(`\nScan finished, but sync failed: ${syncError}`);
    else console.log("\nLocal scan only. Run qwik login to sync your history.");
  }
  if (option("--output"))
    await writeFile(
      resolve(option("--output")),
      JSON.stringify({ ...result, syncError }, null, 2),
    );
  if (args.includes("--require-sync") && (!result.url || syncError))
    process.exitCode = 2;
  else if (
    args.includes("--fail-on-high") &&
    result.findings.some((f) => ["high", "critical"].includes(f.severity))
  )
    process.exitCode = 1;
  return result;
}
async function history() {
  if (!token()) throw new Error("Run qwik login first.");
  const data = await api("scans");
  console.log("\nRecent scans\n");
  for (const s of data.scans.slice(0, 15))
    console.log(
      `${s.createdAt.slice(0, 16)}  ${s.projectName.padEnd(24)} ${s.findings.length} findings  ${s.source}\n  ${SITE}/app/scans/${s.id}`,
    );
  if (!data.scans.length) console.log("No scans yet. Run qwik scan.");
}
async function hooks() {
  const root = git("rev-parse", "--show-toplevel");
  if (!root) throw new Error("Run this inside a Git repository.");
  const existing = git("config", "--get", "core.hooksPath");
  const hookDir = existing
    ? resolve(root, existing)
    : resolve(root, git("rev-parse", "--git-path", "hooks"));
  await mkdir(hookDir, { recursive: true });
  const path = join(hookDir, "post-commit");
  const marker = "# qwik-managed-hook";
  let content = "";
  try {
    content = await readFile(path, "utf8");
  } catch {}
  if (args.includes("--remove")) {
    if (content.includes(marker)) {
      await writeFile(path, content.split(marker)[0].trimEnd() + "\n", {
        mode: 0o755,
      });
      console.log("Qwik commit hook removed.");
    }
    return;
  }
  if (content.includes(marker)) {
    console.log("Qwik commit hook is already installed.");
    return;
  }
  if (content)
    throw new Error(
      "A post-commit hook already exists. Add `qwik scan` to it manually; Qwik will not overwrite your hook.",
    );
  await writeFile(
    path,
    `#!/bin/sh\n${marker}\nif command -v qwik >/dev/null 2>&1; then\n  qwik scan --source commit || echo 'Qwik scan needs attention; your commit is saved.'\nfi\n`,
    { mode: 0o755 },
  );
  console.log("Installed post-commit scan. Remove with qwik hooks --remove.");
}
async function configureModel() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const provider =
      (await rl.question("Provider (ollama / custom) [ollama]: ")) || "ollama";
    const endpoint =
      (await rl.question(
        `Endpoint [${provider === "ollama" ? "http://127.0.0.1:11434" : "https://api.openai.com/v1"}]: `,
      )) ||
      (provider === "ollama"
        ? "http://127.0.0.1:11434"
        : "https://api.openai.com/v1");
    const model = await rl.question("Model name: ");
    if (!model) throw new Error("A model name is required.");
    config.model = { provider, endpoint, model };
    await saveConfig();
    console.log(
      "Saved. For cloud models set QWIK_MODEL_API_KEY in your shell. Run qwik scan --ai to send selected source to this model.",
    );
  } finally {
    rl.close();
  }
}
async function sandbox() {
  const root = resolve(process.cwd());
  if (root.includes(","))
    throw new Error("Docker mount paths cannot contain commas.");
  if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0)
    throw new Error(
      "Start Docker Desktop or a compatible Docker daemon first.",
    );
  const i = args.indexOf("--");
  const command = i >= 0 ? args.slice(i + 1) : [];
  if (!command.length)
    throw new Error(
      "Usage: qwik sandbox -- node --version. The image must already exist locally.",
    );
  const image = option("--image") || "node:22-alpine";
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.:@/-]*$/.test(image))
    throw new Error("Invalid Docker image name.");
  const containerName = `qwik-sandbox-${process.pid}-${Date.now()}`;
  console.log(
    "Sandbox: no network, read-only source at /workspace, non-root user, 512 MB memory, 1 CPU, 60 second timeout.",
  );
  const child = spawn(
    "docker",
    [
      "run",
      "--rm",
      "--name",
      containerName,
      "--pull=never",
      "--network=none",
      "--read-only",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--pids-limit=64",
      "--memory=512m",
      "--cpus=1",
      "--user=65534:65534",
      "--tmpfs=/tmp:rw,noexec,nosuid,size=64m",
      "--mount",
      `type=bind,src=${root},dst=/workspace,readonly`,
      "-w",
      "/workspace",
      image,
      ...command,
    ],
    { stdio: "inherit" },
  );
  let timedOut = false;
  const stop = () => {
    spawnSync("docker", ["rm", "-f", containerName], {
      stdio: "ignore",
      timeout: 10000,
    });
    child.kill("SIGTERM");
  };
  const timer = setTimeout(() => {
    timedOut = true;
    stop();
  }, 60000);
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  await new Promise((res, rej) => {
    child.on("exit", (code) => {
      clearTimeout(timer);
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
      process.exitCode = timedOut ? 124 : (code ?? 2);
      res();
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
      rej(e);
    });
  });
}
function help() {
  console.log(
    `\nqwik. — security review, without the friction\n\n  qwik                 Interactive terminal\n  qwik login           Connect your account in the browser\n  qwik scan            Scan locally and sync findings\n  qwik scan --ai       Add an opt-in model review\n  qwik scan --offline  Keep findings on this machine\n  qwik scan --json     Print machine-readable output\n  qwik history         View past scans\n  qwik hooks           Install a post-commit scanner\n  qwik hooks --remove  Remove the scanner hook\n  qwik model           Configure Ollama or a compatible API\n  qwik sandbox -- ...  Run a command in a restricted Docker container\n  qwik logout          Revoke this device token and sign out\n\nOptions: --path DIR --output report.json --no-deps --fail-on-high\nCI: QWIK_TOKEN, QWIK_PROJECT_ID, --require-sync\nNode 22+ required. Docs: ${SITE}/docs\n`,
  );
}
async function interactive() {
  if (!process.stdin.isTTY) {
    help();
    return;
  }
  console.log(
    `\n${cyan("qwik.")}  Ship fast. Know what you ship.\n\n/scan  /scan ai  /history  /watch  /stop  /help  /exit\n`,
  );
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let watcher = null,
    busy = false;
  let last = git("rev-parse", "HEAD");
  const run = async () => {
    if (busy) return;
    busy = true;
    try {
      await scan({ source: "commit" });
    } catch (e) {
      console.error(e.message);
    } finally {
      busy = false;
    }
  };
  try {
    while (true) {
      const line = (await rl.question(cyan("qwik › "))).trim();
      if (line === "/exit") break;
      try {
        if (line === "/scan" || line === "/scan ai")
          await scan({ forceAI: line.endsWith(" ai") });
        else if (line === "/history") await history();
        else if (line === "/watch") {
          if (!watcher)
            watcher = setInterval(() => {
              const now = git("rev-parse", "HEAD");
              if (now && now !== last) {
                last = now;
                run();
              }
            }, 3000);
          console.log(
            "Watching for new commits. Keep this terminal open, or install qwik hooks.",
          );
        } else if (line === "/stop") {
          clearInterval(watcher);
          watcher = null;
          console.log("Stopped watching.");
        } else help();
      } catch (e) {
        console.error(e.message);
      }
    }
  } finally {
    clearInterval(watcher);
    rl.close();
  }
}
try {
  if (cmd === "login") await login();
  else if (cmd === "logout") {
    if (token()) {
      const me = await api("tokens");
      /* revoke the current bearer using the dedicated endpoint */ await api(
        "device/revoke",
        "POST",
        {},
      );
    }
    delete config.token;
    await saveConfig();
    console.log("Signed out.");
  } else if (cmd === "scan")
    await scan({ source: option("--source") || "cli" });
  else if (cmd === "history") await history();
  else if (cmd === "hooks") await hooks();
  else if (cmd === "model") await configureModel();
  else if (cmd === "sandbox") await sandbox();
  else if (cmd === "interactive") await interactive();
  else help();
} catch (e) {
  console.error(`Qwik: ${e.message}`);
  process.exitCode = 2;
}
