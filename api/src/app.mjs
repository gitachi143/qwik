import { get, put, list, remove } from "./store.mjs";
import {
  random,
  hash,
  passwordHash,
  checkPassword,
  encrypt,
  decrypt,
  publicFetch,
} from "./security.mjs";
import { parseRepository, repoFiles } from "./github.mjs";
import {
  scanFiles,
  auditDependencies,
  modelReview,
  normalizeFinding,
  DEFAULT_PROMPT,
  dependenciesFromFiles,
} from "./scanner.mjs";
const DAY = 86400000;
const clean = (x) => {
  if (!x) return x;
  const { _etag, ...rest } = x;
  return rest;
};
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const short = (value, n = 150) =>
  String(value || "")
    .trim()
    .slice(0, n);
const userPartition = (id) => `user_${id}`;
async function rate(name, max, window = 3600000) {
  const bucket = Math.floor(Date.now() / window);
  const row = hash(`${name}:${bucket}`);
  for (let i = 0; i < 5; i++) {
    const current = await get("rates", row);
    if (current && current.count >= max)
      fail("Too many requests. Please try again later.", 429);
    try {
      await put(
        "rates",
        row,
        { count: (current?.count || 0) + 1, expires: Date.now() + window * 2 },
        { ...(current ? { etag: current._etag } : { create: true }) },
      );
      return;
    } catch (e) {
      if (![409, 412].includes(e.statusCode)) throw e;
    }
  }
  fail("Please try again in a moment.", 429);
}
function cookieToken(req, name) {
  return req.headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
async function session(req, admin = false) {
  const bearer = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const raw = bearer || cookieToken(req, admin ? "qwik_admin" : "qwik_session");
  if (raw) {
    const s = await get(bearer ? "tokens" : "sessions", hash(raw));
    if (s && s.expires > Date.now() && Boolean(s.admin) === admin) {
      const revoked = await get(userPartition(s.userId), "revoked");
      if (!revoked || Date.parse(s.createdAt || 0) >= revoked.before)
        return { ...s, tokenHash: bearer ? hash(raw) : undefined };
    }
  }
  if (!admin && !bearer && process.env.QWIK_KIND !== "admin") {
    try {
      const principal = JSON.parse(
        Buffer.from(req.headers.get("x-ms-client-principal") || "", "base64"),
      );
      if (
        principal.identityProvider === "github" &&
        principal.userRoles?.includes("authenticated")
      )
        return {
          userId: `gh_${hash(principal.userId).slice(0, 32)}`,
          name: principal.userDetails,
          github: true,
          expires: Date.now() + DAY,
        };
    } catch {}
  }
  return null;
}
async function createSession(userId, name, admin = false) {
  const token = random();
  await put(
    "sessions",
    hash(token),
    {
      userId,
      name,
      admin,
      createdAt: new Date().toISOString(),
      expires: Date.now() + 7 * DAY,
    },
    { create: true },
  );
  return token;
}
function setCookie(token, admin = false, clear = false) {
  return `${admin ? "qwik_admin" : "qwik_session"}=${clear ? "" : token}; Path=/; HttpOnly; SameSite=Strict; ${process.env.QWIK_DEV === "1" ? "" : "Secure; "}Max-Age=${clear ? 0 : 7 * 86400}`;
}
async function configuration() {
  return (
    clean(await get("system", "config")) || {
      version: 1,
      prompt: DEFAULT_PROMPT,
      rules: [],
      updatedAt: new Date().toISOString(),
    }
  );
}
async function saveScan(userId, projectId, input) {
  const project = await get(userPartition(userId), `project_${projectId}`);
  if (!project) fail("Project not found.", 404);
  const id = random().slice(0, 16);
  const findings = (Array.isArray(input.findings) ? input.findings : [])
    .slice(0, 75)
    .map((f) => {
      const finding = normalizeFinding(f);
      return {
        ...finding,
        fingerprint: hash(projectId + ":" + finding.fingerprint).slice(0, 24),
      };
    });
  const scan = {
    id,
    projectId,
    projectName: project.name,
    repository: project.repository,
    createdAt: new Date().toISOString(),
    source: [
      "cli",
      "web",
      "commit",
      "pull_request",
      "push",
      "research",
    ].includes(input.source)
      ? input.source
      : "cli",
    branch: short(input.branch || "local", 100),
    commit: short(input.commit, 64),
    filesScanned: Math.max(
      0,
      Math.min(100000, Number(input.filesScanned) || 0),
    ),
    findings,
    engineVersion: short(input.engineVersion || "0.1.0", 40),
    promptVersion: Number(input.promptVersion) || 1,
    coverage:
      input.coverage && typeof input.coverage === "object"
        ? {
            selectedFiles: Math.max(
              0,
              Number(input.coverage.selectedFiles) || 0,
            ),
            availableFiles: Math.max(
              0,
              Number(input.coverage.availableFiles) || 0,
            ),
            limit: short(input.coverage.limit, 250),
            truncated: Boolean(input.coverage.truncated),
          }
        : null,
    dependencyStatus: short(input.dependencyStatus, 200),
    modelStatus: short(input.modelStatus, 200),
    truncated: Boolean(input.truncated) || input.findings?.length > 75,
  };
  await put(
    userPartition(userId),
    `scan_${9999999999999 - Date.parse(scan.createdAt)}_${id}`,
    scan,
    {
      create: true,
    },
  );
  await put(userPartition(userId), `project_${projectId}`, {
    ...project,
    lastScanAt: scan.createdAt,
    lastFindings: findings.length,
    lastScanId: id,
    ...(Array.isArray(input.dependencies)
      ? {
          dependencies: input.dependencies
            .slice(0, 150)
            .filter((d) => d && typeof d === "object")
            .map((d) => ({
              name: short(d.name, 150),
              version: short(d.version, 80),
              ecosystem: short(d.ecosystem, 20),
            })),
        }
      : {}),
  });
  return scan;
}
export async function handle(req) {
  let headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers });
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
    const method = req.method;
    const isAdmin = process.env.QWIK_KIND === "admin";
    if (method === "OPTIONS")
      return json({ error: "Cross-origin API calls are not enabled." }, 403);
    if (
      !["GET", "HEAD"].includes(method) &&
      !req.headers.get("authorization")?.startsWith("Bearer ")
    ) {
      const origin = req.headers.get("origin");
      if (origin && origin !== (process.env.QWIK_PUBLIC_URL || url.origin))
        fail("Cross-origin request rejected.", 403);
      if (req.headers.get("x-qwik-request") !== "1")
        fail("Missing request verification.", 403);
    }
    let body = {};
    if (!["GET", "HEAD"].includes(method)) {
      const raw = await req.text();
      if (Buffer.byteLength(raw) > 400000) fail("Request too large.", 413);
      try {
        body = raw ? JSON.parse(raw) : {};
        if (!body || Array.isArray(body) || typeof body !== "object")
          fail("Expected a JSON object.");
      } catch {
        fail("Invalid JSON.");
      }
    }
    const ip = hash(
      req.headers.get("x-forwarded-for")?.split(",")[0] || "local",
    ).slice(0, 20);
    if (path === "health")
      return json({
        ok: true,
        service: "qwik",
        kind: isAdmin ? "admin" : "product",
        version: "0.1.0",
      });
    if (path === "auth/me") {
      const s = await session(req, isAdmin);
      if (!s || s.projectId) return json({ user: null });
      let p = await get(userPartition(s.userId), "profile");
      if (!p && !isAdmin) {
        p = { id: s.userId, name: s.name, createdAt: new Date().toISOString() };
        await put(userPartition(s.userId), "profile", p);
      }
      if (!isAdmin) await put("workspaces", s.userId, { userId: s.userId });
      return json({
        user: {
          id: s.userId,
          name: p?.name || s.name,
          email: p?.email || null,
          admin: isAdmin,
        },
      });
    }
    if (path === "auth/logout" && method === "POST") {
      const token = cookieToken(req, isAdmin ? "qwik_admin" : "qwik_session");
      if (token) await remove("sessions", hash(token));
      headers["Set-Cookie"] = setCookie("", isAdmin, true);
      return json({
        ok: true,
        githubLogout: "/.auth/logout?post_logout_redirect_uri=/",
      });
    }
    if (path === "auth/admin" && method === "POST" && isAdmin) {
      await rate(`admin:${ip}`, 8, 900000);
      const stored =
        (await get("system", "admin"))?.passwordHash ||
        process.env.QWIK_ADMIN_PASSWORD_HASH;
      if (!stored || !checkPassword(String(body.password || ""), stored))
        fail("Incorrect password.", 401);
      headers["Set-Cookie"] = setCookie(
        await createSession("admin", "Administrator", true),
        true,
      );
      return json({ ok: true });
    }
    if (!isAdmin && path === "auth/signup" && method === "POST") {
      await rate(`signup:${ip}`, 8);
      const email = short(body.email, 254).toLowerCase();
      const name = short(body.name, 60);
      const password = String(body.password || "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name)
        fail("Enter a name and a valid email address.");
      if (password.length < 12 || password.length > 128)
        fail("Use a password between 12 and 128 characters.");
      const id = random().slice(0, 24);
      const recovery = random();
      try {
        await put(
          "accounts",
          hash(email),
          {
            id,
            email,
            name,
            passwordHash: passwordHash(password),
            recoveryHash: hash(recovery),
          },
          { create: true },
        );
      } catch (e) {
        if (e.statusCode === 409)
          fail(
            "This email is already registered. Sign in or use your recovery code.",
            409,
          );
        throw e;
      }
      await put(userPartition(id), "profile", {
        id,
        email,
        name,
        createdAt: new Date().toISOString(),
      });
      await put("workspaces", id, { userId: id });
      headers["Set-Cookie"] = setCookie(await createSession(id, name));
      return json({ ok: true, recoveryCode: recovery }, 201);
    }
    if (!isAdmin && path === "auth/login" && method === "POST") {
      await rate(`login:${ip}`, 15, 900000);
      const email = short(body.email, 254).toLowerCase();
      await rate(`login-account:${hash(email)}`, 20, 900000);
      const account = await get("accounts", hash(email));
      if (
        !account ||
        !checkPassword(String(body.password || ""), account.passwordHash)
      )
        fail("Email or password is incorrect.", 401);
      headers["Set-Cookie"] = setCookie(
        await createSession(account.id, account.name),
      );
      return json({ ok: true });
    }
    if (!isAdmin && path === "auth/recover" && method === "POST") {
      await rate(`recover:${ip}`, 6, 900000);
      const account = await get(
        "accounts",
        hash(short(body.email, 254).toLowerCase()),
      );
      if (
        !account ||
        account.recoveryHash !== hash(String(body.recoveryCode || ""))
      )
        fail("Email or recovery code is incorrect.", 401);
      if (
        String(body.password || "").length < 12 ||
        String(body.password).length > 128
      )
        fail("Use a password between 12 and 128 characters.");
      const recovery = random();
      await put(
        "accounts",
        hash(account.email),
        {
          ...account,
          passwordHash: passwordHash(body.password),
          recoveryHash: hash(recovery),
        },
        { etag: account._etag },
      );
      await put(userPartition(account.id), "revoked", { before: Date.now() });
      headers["Set-Cookie"] = setCookie(
        await createSession(account.id, account.name),
      );
      return json({ ok: true, recoveryCode: recovery });
    }
    if (!isAdmin && path === "device/start" && method === "POST") {
      await rate(`device:${ip}`, 20, 900000);
      const deviceCode = random(),
        code = random()
          .replace(/[^a-z0-9]/gi, "")
          .slice(0, 10)
          .toUpperCase();
      await put(
        "devices",
        hash(deviceCode),
        { deviceHash: hash(deviceCode), code, expires: Date.now() + 600000 },
        { create: true },
      );
      await put("device_codes", code, {
        deviceHash: hash(deviceCode),
        expires: Date.now() + 600000,
      });
      return json({
        deviceCode,
        userCode: code,
        verificationUrl: `${process.env.QWIK_PUBLIC_URL || url.origin}/app?device=${code}`,
      });
    }
    if (!isAdmin && path === "device/poll" && method === "POST") {
      await rate(`poll:${ip}`, 180, 600000);
      const device = await get("devices", hash(String(body.deviceCode || "")));
      if (!device || device.expires < Date.now())
        fail("Device code expired. Run qwik login again.", 410);
      if (!device.userId) return json({ status: "pending" });
      if (device.consumed) fail("Device code was already used.", 410);
      await put(
        "devices",
        device.deviceHash,
        { ...device, consumed: true },
        { etag: device._etag },
      );
      const token = random();
      const id = hash(token);
      await put(
        "tokens",
        id,
        {
          id,
          userId: device.userId,
          name: "Qwik CLI",
          createdAt: new Date().toISOString(),
          expires: Date.now() + 90 * DAY,
        },
        { create: true },
      );
      await put(
        userPartition(device.userId),
        `token_${id}`,
        await get("tokens", id),
      );
      return json({ status: "approved", token });
    }
    const s = await session(req, isAdmin);
    if (!s) fail("Sign in to continue.", 401);
    const partition = userPartition(s.userId);
    if (isAdmin) {
      if (path === "admin/config" && method === "GET")
        return json(await configuration());
      if (path === "admin/config" && method === "PUT") {
        if (short(body.prompt, 16000).length < 50)
          fail("The review prompt needs at least 50 characters.");
        const previous = await configuration();
        if (body.version !== previous.version)
          fail(
            "Policy changed in another session. Reload before publishing.",
            409,
          );
        const config = {
          version: previous.version + 1,
          prompt: short(body.prompt, 16000),
          rules: (Array.isArray(body.rules) ? body.rules : [])
            .slice(0, 40)
            .map((r) => ({
              id: short(r.id || `CUSTOM-${random().slice(0, 6)}`, 60),
              title: short(r.title, 120),
              needle: short(r.needle, 150),
              severity: ["critical", "high", "medium", "low"].includes(
                r.severity,
              )
                ? r.severity
                : "medium",
              description: short(r.description, 350),
              remediation: short(r.remediation, 350),
              enabled: Boolean(r.enabled),
            })),
          updatedAt: new Date().toISOString(),
        };
        await put("system", `prompt_${Date.now()}`, previous);
        await put("system", "config", config);
        return json(config);
      }
      if (path === "admin/history")
        return json({
          versions: (await list("system", "prompt_", 100)).map(clean).reverse(),
        });
      if (path === "admin/tracker" && method === "GET")
        return json({
          items: (await list("tracker", "item_", 150)).map(clean).reverse(),
        });
      if (path === "admin/tracker" && method === "POST") {
        const id = random().slice(0, 12);
        const item = {
          id,
          title: short(body.title),
          details: short(body.details, 5000),
          status: "open",
          createdAt: new Date().toISOString(),
        };
        if (!item.title) fail("Add a title.");
        await put("tracker", `item_${id}`, item);
        return json(item, 201);
      }
      if (path.startsWith("admin/tracker/") && method === "PATCH") {
        const row = `item_${path.split("/").at(-1)}`;
        const item = await get("tracker", row);
        if (!item) fail("Item not found.", 404);
        await put("tracker", row, {
          ...item,
          status: body.status === "resolved" ? "resolved" : "open",
        });
        return json({ ok: true });
      }
      if (path === "admin/research" && method === "POST") {
        await rate("admin-research", 30);
        const id = short(body.advisory, 100);
        if (!/^[A-Za-z0-9._-]+$/.test(id))
          fail("Enter an OSV, GHSA, or CVE advisory ID.");
        const r = await fetch(
          `https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`,
          { signal: AbortSignal.timeout(15000) },
        );
        if (!r.ok) fail("Advisory not found in OSV. Try its GHSA identifier.");
        const advisory = await r.json();
        return json({
          id: advisory.id,
          summary: advisory.summary,
          details: short(advisory.details, 10000),
          published: advisory.published,
          affected: advisory.affected?.slice(0, 20),
          references: advisory.references?.slice(0, 10),
        });
      }
      if (path === "admin/research/run" && method === "POST") {
        await rate("research-run", 10);
        const advisory = short(body.advisory, 100);
        if (!/^[A-Za-z0-9._-]+$/.test(advisory)) fail("Invalid advisory ID.");
        const targets = [];
        for (const workspace of await list("workspaces", "", 100)) {
          for (const project of await list(
            userPartition(workspace.userId),
            "project_",
            50,
          )) {
            if (project.dependencies?.length)
              targets.push({ userId: workspace.userId, project });
          }
        }
        let projectsChecked = 0,
          matches = 0,
          incomplete = targets.length > 20;
        for (
          let offset = 0;
          offset < Math.min(targets.length, 20);
          offset += 5
        ) {
          await Promise.all(
            targets
              .slice(offset, offset + 5)
              .map(async ({ userId, project }) => {
                const files = [
                  {
                    path: "package-lock.json",
                    content: JSON.stringify({
                      packages: Object.fromEntries(
                        project.dependencies
                          .filter((d) => d.ecosystem === "npm")
                          .map((d) => [
                            "node_modules/" + d.name,
                            { name: d.name, version: d.version },
                          ]),
                      ),
                    }),
                  },
                  {
                    path: "requirements.txt",
                    content: project.dependencies
                      .filter((d) => d.ecosystem === "PyPI")
                      .map((d) => d.name + "==" + d.version)
                      .join("\n"),
                  },
                ];
                const audit = await auditDependencies(files, fetch, advisory);
                projectsChecked++;
                if (audit.status !== "complete") incomplete = true;
                const matched = audit.findings.filter(
                  (f) => f.ruleId === advisory,
                );
                if (matched.length) {
                  matches++;
                  await saveScan(userId, project.id, {
                    source: "research",
                    findings: matched,
                    filesScanned: 0,
                    branch: "stored dependency inventory",
                    dependencyStatus: audit.status,
                    modelStatus: "not used",
                    coverage: {
                      selectedFiles: 0,
                      availableFiles: 0,
                      limit:
                        "Stored dependency inventory only; original source was not rescanned.",
                    },
                  });
                }
              }),
          );
        }
        return json({ projectsChecked, matches, incomplete, limit: 20 });
      }
      if (path === "admin/password" && method === "PUT") {
        const stored =
          (await get("system", "admin"))?.passwordHash ||
          process.env.QWIK_ADMIN_PASSWORD_HASH;
        if (!checkPassword(String(body.currentPassword || ""), stored))
          fail("Current password is incorrect.", 401);
        if (
          String(body.password || "").length < 16 ||
          String(body.password).length > 128
        )
          fail("Use 16–128 characters.");
        await put("system", "admin", {
          passwordHash: passwordHash(body.password),
        });
        await put(userPartition("admin"), "revoked", { before: Date.now() });
        headers["Set-Cookie"] = setCookie(
          await createSession("admin", "Administrator", true),
          true,
        );
        return json({ ok: true });
      }
      fail("Endpoint not found.", 404);
    }
    if (
      s.projectId &&
      !(
        (path === "scans" && method === "POST") ||
        (path === "config" && method === "GET")
      )
    )
      fail("This token is restricted to scan uploads.", 403);
    if (path === "device/revoke" && method === "POST") {
      if (!s.tokenHash) fail("Use your CLI token to sign out.");
      await remove("tokens", s.tokenHash);
      await remove(partition, `token_${s.tokenHash}`);
      return json({ ok: true });
    }
    if (path === "config" && method === "GET")
      return json(await configuration());
    if (path === "device/approve" && method === "POST") {
      await rate(`approve:${s.userId}`, 20);
      const code = short(body.code, 20).toUpperCase();
      const mapping = await get("device_codes", code);
      if (!mapping || mapping.expires < Date.now())
        fail("Invalid or expired device code.");
      const device = await get("devices", mapping.deviceHash);
      if (!device || device.userId)
        fail("This device code has already been used.");
      await put(
        "devices",
        mapping.deviceHash,
        { ...device, userId: s.userId },
        { etag: device._etag },
      );
      return json({ ok: true });
    }
    if (path === "projects" && method === "GET")
      return json({
        projects: (await list(partition, "project_", 100)).map(clean),
      });
    if (path === "projects" && method === "POST") {
      if ((await list(partition, "project_", 51)).length >= 50)
        fail("The current limit is 50 projects per workspace.");
      const repository = body.repository
        ? parseRepository(body.repository)
        : null;
      const name = short(body.name || repository?.split("/").at(-1), 70);
      if (!name) fail("Give the project a name.");
      const existing = (await list(partition, "project_", 100)).find((p) =>
        repository ? p.repository === repository : p.name === name,
      );
      if (existing) return json(clean(existing));
      const p = {
        id: random().slice(0, 16),
        name,
        repository,
        createdAt: new Date().toISOString(),
      };
      await put(partition, `project_${p.id}`, p, { create: true });
      return json(p, 201);
    }
    if (path.startsWith("projects/") && method === "DELETE") {
      const id = path.split("/")[1];
      await remove(partition, `project_${id}`);
      for (const scan of await list(partition, "scan_", 10000)) {
        if (scan.projectId === id)
          await remove(
            partition,
            `scan_${9999999999999 - Date.parse(scan.createdAt)}_${scan.id}`,
          );
      }
      return json({ ok: true });
    }
    if (path === "scans" && method === "GET")
      return json({
        scans: (await list(partition, "scan_", 300))
          .map(clean)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      });
    if (path === "scans" && method === "POST") {
      if (
        !Array.isArray(body.findings) ||
        body.findings.some((f) => !f || typeof f !== "object")
      )
        fail("Provide a findings array.");
      await rate(`scan:${s.userId}`, 100, DAY);
      if (s.projectId && body.projectId !== s.projectId)
        fail("Token does not belong to this project.", 403);
      return json(
        await saveScan(s.userId, short(body.projectId, 50), body),
        201,
      );
    }
    if (path === "scan/web" && method === "POST") {
      await rate(`webscan:${s.userId}`, 20, DAY);
      const project = await get(
        partition,
        `project_${short(body.projectId, 50)}`,
      );
      if (!project?.repository)
        fail("Connect a GitHub repository to scan from the web.");
      const settings = (await get(partition, "settings")) || {};
      const { files, ...meta } = await repoFiles(
        project.repository,
        decrypt(settings.githubToken),
      );
      const config = await configuration();
      const base = scanFiles(files, config.rules);
      let model = { findings: [], status: "not enabled" };
      const depPromise = auditDependencies(files);
      if (body.useModel) {
        if (settings.provider === "ollama")
          fail("Ollama runs on your machine. Use qwik scan --ai in the CLI.");
        if (
          settings.provider === "none" ||
          !settings.endpoint ||
          !settings.model
        )
          fail("Configure a model in Settings first.");
        try {
          model = await modelReview(
            files,
            { ...settings, apiKey: decrypt(settings.apiKey) },
            config.prompt,
            publicFetch,
          );
        } catch (e) {
          model.status = `incomplete: ${short(e.message, 160)}`;
        }
      }
      const deps = await depPromise;
      return json(
        await saveScan(s.userId, project.id, {
          ...base,
          ...meta,
          source: "web",
          findings: [...base.findings, ...deps.findings, ...model.findings],
          dependencies: dependenciesFromFiles(files),
          dependencyStatus: deps.status,
          modelStatus: model.status,
          promptVersion: config.version,
        }),
        201,
      );
    }
    if (path === "findings/state" && method === "GET")
      return json({
        states: (await list(partition, "finding_", 500)).map(clean),
      });
    if (path === "findings/state" && method === "PUT") {
      const fingerprint = short(body.fingerprint, 64);
      if (!/^[a-f0-9]{24}$/.test(fingerprint)) fail("Invalid finding.");
      const state = {
        fingerprint,
        status: ["open", "resolved", "ignored"].includes(body.status)
          ? body.status
          : "open",
        updatedAt: new Date().toISOString(),
      };
      await put(partition, `finding_${fingerprint}`, state);
      return json(state);
    }
    if (path === "settings" && method === "GET") {
      const cfg = (await get(partition, "settings")) || {};
      return json({
        provider: cfg.provider || "none",
        endpoint: cfg.endpoint || "",
        model: cfg.model || "",
        hasApiKey: Boolean(cfg.apiKey),
        hasGithubToken: Boolean(cfg.githubToken),
      });
    }
    if (path === "settings" && method === "PUT") {
      const old = (await get(partition, "settings")) || {};
      const endpoint = short(body.endpoint, 350);
      const provider = ["none", "openai", "custom", "ollama"].includes(
        body.provider,
      )
        ? body.provider
        : "none";
      if (endpoint && provider !== "ollama") {
        let u;
        try {
          u = new URL(endpoint);
        } catch {
          fail("Enter a valid endpoint URL.");
        }
        if (u.protocol !== "https:" || u.username || u.password)
          fail("Cloud endpoints must use HTTPS without URL credentials.");
      }
      const settings = {
        provider,
        endpoint,
        model: short(body.model, 100),
        apiKey:
          body.apiKey === undefined
            ? old.apiKey
            : encrypt(short(body.apiKey, 1000)),
        githubToken:
          body.githubToken === undefined
            ? old.githubToken
            : encrypt(short(body.githubToken, 1000)),
      };
      await put(partition, "settings", settings);
      return json({ ok: true });
    }
    if (path === "tokens" && method === "GET") {
      const tokens = await list(partition, "token_", 100);
      return json({ tokens: tokens.map(clean) });
    }
    if (path === "tokens" && method === "POST") {
      await rate(`tokens:${s.userId}`, 15, DAY);
      const token = random(),
        id = hash(token);
      const projectId = short(body.projectId, 50) || undefined;
      if (projectId && !(await get(partition, `project_${projectId}`)))
        fail("Project not found.", 404);
      const meta = {
        id,
        userId: s.userId,
        name: short(body.name || "CLI token", 60),
        projectId,
        createdAt: new Date().toISOString(),
        expires: Date.now() + 90 * DAY,
      };
      await put("tokens", id, meta, { create: true });
      await put(partition, `token_${id}`, meta);
      return json({ token, ...meta }, 201);
    }
    if (path.startsWith("tokens/") && method === "DELETE") {
      const id = path.split("/")[1];
      const t = await get("tokens", id);
      if (!t || t.userId !== s.userId) fail("Token not found.", 404);
      await remove("tokens", id);
      await remove(partition, `token_${id}`);
      return json({ ok: true });
    }
    fail("Endpoint not found.", 404);
  } catch (e) {
    const status = e.status || ([409, 412].includes(e.statusCode) ? 409 : 500);
    if (status >= 500) console.error("Qwik API error:", e.name, e.message);
    return json(
      {
        error:
          status >= 500
            ? "The service could not complete this request. Please try again."
            : e.message,
      },
      status,
    );
  }
}
