# Qwik CLI

Requires Node.js 22 or newer. Install from the Qwik dashboard, then:

```
qwik login
cd your-project
qwik
```

Use `/scan` to scan and sync findings, `/history` to see recent scans, and `/watch`
to scan new commits while the terminal is open. `qwik hooks` installs a post-commit
hook that runs even without an interactive terminal. It never blocks a commit.

`qwik scan --ai` explicitly sends selected source to your configured provider.
`qwik model` configures Ollama or an OpenAI-compatible endpoint. Keep cloud keys
in `QWIK_MODEL_API_KEY`. Source is not uploaded to Qwik from local scans.
Dependency checks send package names and versions to OSV; disable with `--no-deps`.
`--offline` disables scan sync; combine with `--no-deps` to avoid OSV requests.

Scan limits: 500 files, 3 MB total, 300 KB per file. Git projects scan tracked files.
Unsupported and ignored files are not scanned. Qwik reports review candidates,
not proof of exploitation or a security certification. Source and model content
are untrusted; always inspect suggestions.

`qwik sandbox -- node --version` uses an already installed Docker image
(`node:22-alpine` by default). Pull images separately. This is restricted Docker
execution, not a hardened hostile-code service. Do not use it for unknown,
malicious code on a sensitive host. Dependencies are not installed automatically.

CI uses `QWIK_TOKEN`, `QWIK_PROJECT_ID`, `qwik scan --require-sync --fail-on-high`.
See the dashboard for a generated GitHub Actions workflow.
