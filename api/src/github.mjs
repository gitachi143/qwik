const allowed =
  /\.(?:[cm]?[jt]sx?|py|go|rs|java|rb|php|cs|html|vue|svelte|ya?ml|tf|json|toml|sh|sql|dockerfile|txt|pem|key)$/i;
export function parseRepository(value) {
  const text = String(value || "")
    .trim()
    .replace(/^https:\/\/github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(text))
    throw Object.assign(
      new Error("Enter a GitHub repository as owner/repository."),
      { status: 400 },
    );
  return text;
}
async function github(path, token) {
  const r = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok)
    throw Object.assign(
      new Error(
        r.status === 404
          ? "Repository not found. Private repositories need a GitHub token in Settings."
          : r.status === 403
            ? "GitHub rate limit or permission denied. Add a GitHub token in Settings."
            : `GitHub returned HTTP ${r.status}.`,
      ),
      { status: 400 },
    );
  return r.json();
}
export async function repoFiles(repository, token) {
  const info = await github(`/repos/${repository}`, token);
  const branch = info.default_branch;
  const commit = await github(
    `/repos/${repository}/commits/${encodeURIComponent(branch)}`,
    token,
  );
  const tree = await github(
    `/repos/${repository}/git/trees/${commit.sha}?recursive=1`,
    token,
  );
  const candidates = tree.tree.filter(
    (f) =>
      f.type === "blob" &&
      f.size < 150000 &&
      (allowed.test(f.path) ||
        /(^|\/)Dockerfile$/.test(f.path) ||
        /(^|\/)\.env(?:\.[^/]+)?$/.test(f.path)) &&
      !/(^|\/)(node_modules|vendor|dist|build|\.git|coverage)\//.test(f.path),
  );
  const chosen = [];
  let bytes = 0;
  for (const f of candidates) {
    if (chosen.length >= 60 || bytes + f.size > 600000) continue;
    bytes += f.size;
    chosen.push(f);
  }
  const files = [];
  for (let i = 0; i < chosen.length; i += 10) {
    await Promise.all(
      chosen.slice(i, i + 10).map(async (f) => {
        const data = await github(
          `/repos/${repository}/git/blobs/${f.sha}`,
          token,
        );
        files.push({
          path: f.path,
          content: Buffer.from(data.content, "base64").toString("utf8"),
        });
      }),
    );
  }
  return {
    files,
    branch,
    commit: commit.sha,
    coverage: {
      availableFiles: candidates.length,
      selectedFiles: files.length,
      truncated: tree.truncated || files.length < candidates.length,
      limit: "60 files / 600 KB; scan locally for broader coverage",
    },
  };
}
