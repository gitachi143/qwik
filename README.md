# Qwik

Fast, open-source code security reviews in your terminal and on the web.

- **Product:** https://polite-river-00fb9ed10.4.azurestaticapps.net
- **Admin:** https://lemon-mushroom-01425e710.5.azurestaticapps.net
- **Guide:** https://polite-river-00fb9ed10.4.azurestaticapps.net/docs

## Get started

Requires Node.js 22+.

```sh
npm install -g https://polite-river-00fb9ed10.4.azurestaticapps.net/downloads/qwik-cli.tgz
qwik login
cd your-project
qwik
```

Use `/scan`, `/scan ai`, `/history`, `/watch`, `/stop`, and `/exit` in the interactive
terminal. `qwik scan` works without an account; signing in syncs findings to your
workspace. `qwik hooks` adds a post-commit scan. `qwik hooks --remove` removes it.
Existing hooks are never overwritten. Scans do not block or undo a commit.

## What works

- Email/password signup, login, recovery codes, and GitHub sign-in through Azure
  Static Web Apps. Email ownership is not verified and recovery requires the saved
  code. Password reset invalidates existing sessions and CLI tokens.
- Browser device authorization for the CLI, 90-day revocable tokens, and project-
  scoped upload tokens for CI. Findings and scan history persist in Azure Tables.
- Twelve built-in checks covering secret formats, hardcoded credentials, dynamic
  evaluation, shell/SQL injection candidates, unsafe HTML insertion, disabled TLS,
  broad ingress, privileged containers, wildcard CORS and debug configurations.
- OSV dependency checks for npm package-lock.json and pinned Python requirements.
- Public/private GitHub repository scans. Private scans require a fine-grained
  token with Contents: read for the selected repository.
- Optional model reviews: compatible chat-completions APIs from the website or CLI,
  and Ollama from the CLI. `qwik model` configures a local CLI provider;
  `QWIK_MODEL_API_KEY` supplies a cloud key. Website model settings are independent.
- Scan reports with file locations, remediation, coverage, severity filters, and
  resolved/ignored states. The dashboard refreshes every 12 seconds when visible.
- Generated GitHub Actions workflow: push/PR scans, job summaries, same-repository
  PR result comments, and failed checks for high/critical findings. Add the workflow
  and secret from a project's **Set up CI** panel. Fork PRs skip authenticated scans.
- Restricted **local Docker** sandbox: `qwik sandbox -- node --version`. Requires
  an existing Docker daemon and a locally pulled image (default node:22-alpine).
  No networking; read-only project mount and root filesystem; non-root; dropped
  capabilities; no new privileges; CPU, memory, PID and time limits.
- Separate password-protected admin site for versioned review prompts, literal
  custom rules, a missed-finding tracker, OSV advisory lookup, and retrospective
  research against uploaded dependency inventories (up to 20 projects per run).

## Coverage and privacy

Pattern detection is a first-pass review, not full semantic/data-flow analysis or
proof of exploitability. A scan without findings is not a security guarantee. The
UI reports failed checks and truncation; do not treat partial scans as a pass.

Local scans select up to 500 files / 3 MB, with individual files at most 300 KB.
Git projects use tracked files. Web scans select up to 60 files / 600 KB, individual
files under 150 KB. Generated/binary/unsupported files are excluded. Model reviews
select up to 60 KB. Dependency checks inspect up to 200 pinned versions. Scan
records retain up to 75 findings, and the dashboard shows the 300 newest scans.
Scan smaller subsets if limits are reached. OSV findings have a conservative
high review priority, not an independently verified CVSS rating.

Local rule scans never send source to Qwik. Synced records include paths,
findings, Git metadata, and dependency inventories. OSV receives package names and
versions. Use `--offline --no-deps` to disable Qwik sync, policy fetch, and OSV
requests. Model review is explicitly enabled with `--ai`; that sends selected
source to your chosen endpoint even if scan syncing is disabled.

Web scans read source from GitHub into memory. Source is not persisted. Provider
and GitHub credentials use AES-256-GCM encryption with a server-managed key.
Passwords use salted scrypt; session cookies are Secure, HttpOnly and SameSite.
Custom cloud model requests are HTTPS-only with public IP checks, pinned DNS,
no redirects, timeouts, and bounded responses. Local models run through the CLI.

The Docker feature is not a hardened hostile-code execution service. Do not use
it for malicious code on a sensitive host. Pull trusted images explicitly; Qwik
does not install or execute project dependencies when scanning.

The core scanner is MIT-licensed and free. Azure usage and optional model services
may incur costs. Workspace limits are 50 projects, 20 web scans/day, and 100 scan
uploads/day. This first release has no email service, team roles, hosted sandbox
fleet, managed GitHub App, or automatic patch PR generation. The generated workflow
posts scan results to existing PRs; it does not open remediation PRs.

## Development

```sh
npm ci
npm ci --prefix api
npm test
npm run dev
# Separate local admin server, with a development-only password:
QWIK_DEV_PASSWORD='choose-a-local-test-password' node scripts/dev.mjs --admin
npm run build
```

The product runs at http://127.0.0.1:5173 and admin at http://127.0.0.1:5174.
Local mode uses ephemeral memory; it never silently replaces cloud storage.
The dev servers have separate in-memory stores. Azure product and admin share
one persistent table. Never set QWIK_DEV=1 on a deployed site.

- `web/`: React/Vite product and admin interfaces.
- `api/`: Azure Functions HTTP API and Azure Tables persistence.
- `cli/`: dependency-free Node CLI and shared scan engine.
- `tests/`: isolation, auth, credentials, device flow, policy and scanner tests.
- `scripts/build.mjs`: builds both frontends, copies the canonical scan engine
  from cli/lib/scanner.mjs to the API, and packages the downloadable CLI.

`QWIK_URL` selects a self-hosted endpoint; `QWIK_CONFIG_DIR` overrides the CLI
configuration directory for tests or isolated installations. CLI configuration
uses restrictive file permissions. Do not commit token files.

## Azure deployment

Pushes to main run tests and deploy both sites with managed Node 22 Functions.
The repository requires `AZURE_STATIC_WEB_APPS_API_TOKEN` and
`AZURE_ADMIN_DEPLOY_TOKEN` Actions secrets. The build produces `dist/` and
`dist-admin/`, with the CLI tarball at `/downloads/qwik-cli.tgz`.

App settings on both sites:

- `QWIK_TABLE_CONNECTION`: dedicated Azure Storage connection string.
- `QWIK_ENCRYPTION_KEY`: 32 random bytes encoded as 64 hex characters. Back up this
  key securely; changing it requires re-entering all encrypted provider credentials.
- `QWIK_KIND`: `product` or `admin`.
- `QWIK_PUBLIC_URL`: that site's exact HTTPS origin for CSRF and device URLs.
- `QWIK_ADMIN_PASSWORD_HASH`: initial `salt:scryptHex` hash, on the admin site only.
  Subsequent password changes are stored in the database.

Admin credentials are delivered separately and are never committed. Keep the
admin site password private. For a larger production launch, add automated
storage retention, email verification, operator monitoring, workload queues,
authenticated repository installation, and independent security review.
