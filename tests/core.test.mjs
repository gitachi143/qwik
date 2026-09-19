import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { handle } from "../api/src/app.mjs";
import { clearMemory, get } from "../api/src/store.mjs";
import {
  hash,
  passwordHash,
  checkPassword,
  encrypt,
  decrypt,
  isPublicIP,
  publicFetch,
} from "../api/src/security.mjs";
import {
  scanFiles,
  auditDependencies,
  modelReview,
  dependenciesFromFiles,
  DEFAULT_PROMPT,
} from "../cli/lib/scanner.mjs";
beforeEach(() => {
  clearMemory();
  process.env.QWIK_DEV = "1";
  process.env.QWIK_KIND = "product";
  process.env.QWIK_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  delete process.env.QWIK_PUBLIC_URL;
  delete process.env.QWIK_TABLE_CONNECTION;
});
async function request(
  path,
  { method = "GET", body, cookie, token, headers = {} } = {},
) {
  const response = await handle(
    new Request(`https://qwik.test/api/${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Qwik-Request": "1",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  );
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
    headers: response.headers,
  };
}
async function user(email = "one@example.test") {
  const r = await request("auth/signup", {
    method: "POST",
    body: {
      name: "Test Builder",
      email,
      password: "long-unique-test-password",
    },
  });
  assert.equal(r.status, 201);
  return { ...r, email };
}
async function project(cookie, name = "app") {
  const r = await request("projects", {
    method: "POST",
    cookie,
    body: { name },
  });
  assert.equal(r.status, 201);
  return r.data;
}
test("scrypt hashes differ, verify correctly, and reject malformed passwords", () => {
  const a = passwordHash("test password long");
  const b = passwordHash("test password long");
  assert.notEqual(a, b);
  assert(checkPassword("test password long", a));
  assert(!checkPassword("wrong", a));
  assert(!checkPassword("x".repeat(129), a));
});
test("provider credentials use authenticated encryption", () => {
  const a = encrypt("example-sensitive-value");
  assert(!a.includes("example-sensitive-value"));
  assert.equal(decrypt(a), "example-sensitive-value");
  assert.throws(() => decrypt(a.slice(0, -1) + (a.at(-1) === "0" ? "1" : "0")));
});
test("private addresses, loopback, metadata, and custom schemes are rejected", async () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.2",
    "192.168.1.3",
    "172.16.0.1",
    "169.254.169.254",
    "100.100.100.200",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
  ])
    assert(!isPublicIP(ip), ip);
  assert(isPublicIP("8.8.8.8"));
  await assert.rejects(publicFetch("https://127.0.0.1/api"));
  await assert.rejects(publicFetch("http://example.com/api"));
  await assert.rejects(publicFetch("https://user:pass@example.com/api"));
});
test("anonymous users cannot access projects or settings", async () => {
  assert.equal((await request("projects")).status, 401);
  assert.equal((await request("settings")).status, 401);
  assert.deepEqual((await request("auth/me")).data, { user: null });
});
test("CSRF requests and missing verification are rejected", async () => {
  assert.equal(
    (
      await request("auth/signup", {
        method: "POST",
        body: {},
        headers: { Origin: "https://attacker.test" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("auth/signup", {
        method: "POST",
        body: {},
        headers: { "X-Qwik-Request": "" },
      })
    ).status,
    403,
  );
});
test("account signup, logout, and login create real sessions", async () => {
  const u = await user();
  assert(u.cookie.startsWith("qwik_session="));
  assert(u.data.recoveryCode);
  const me = await request("auth/me", { cookie: u.cookie });
  assert.equal(me.data.user.email, u.email);
  await request("auth/logout", { method: "POST", cookie: u.cookie, body: {} });
  assert.equal((await request("projects", { cookie: u.cookie })).status, 401);
  assert.equal(
    (
      await request("auth/login", {
        method: "POST",
        body: { email: u.email, password: "wrong" },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("auth/login", {
        method: "POST",
        body: { email: u.email, password: "long-unique-test-password" },
      })
    ).status,
    200,
  );
});
test("duplicate registration is atomic and does not replace an account", async () => {
  await user();
  const r = await request("auth/signup", {
    method: "POST",
    body: {
      email: "one@example.test",
      name: "Attack",
      password: "a-second-long-password",
    },
  });
  assert.equal(r.status, 409);
});
test("users cannot upload scans to another workspace", async () => {
  const a = await user(),
    b = await user("two@example.test");
  const p = await project(a.cookie);
  assert.deepEqual(
    (await request("projects", { cookie: b.cookie })).data.projects,
    [],
  );
  assert.equal(
    (
      await request("scans", {
        method: "POST",
        cookie: b.cookie,
        body: { projectId: p.id, findings: [] },
      })
    ).status,
    404,
  );
});
test("CI tokens only upload to the selected project and cannot read history", async () => {
  const u = await user();
  const a = await project(u.cookie, "a"),
    b = await project(u.cookie, "b");
  const t = await request("tokens", {
    method: "POST",
    cookie: u.cookie,
    body: { name: "CI", projectId: a.id },
  });
  const token = t.data.token;
  assert.equal((await request("scans", { token })).status, 403);
  assert.equal((await request("projects", { token })).status, 403);
  assert.equal((await request("settings", { token })).status, 403);
  assert.equal((await request("config", { token })).status, 200);
  assert.equal(
    (
      await request("scans", {
        method: "POST",
        token,
        body: { projectId: b.id, findings: [] },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("scans", {
        method: "POST",
        token,
        body: { projectId: a.id, findings: [], filesScanned: 4 },
      })
    ).status,
    201,
  );
});
test("device code is one-use and revoked CLI tokens stop working", async () => {
  const u = await user();
  const d = await request("device/start", { method: "POST", body: {} });
  assert.equal(
    (
      await request("device/poll", {
        method: "POST",
        body: { deviceCode: d.data.deviceCode },
      })
    ).data.status,
    "pending",
  );
  await request("device/approve", {
    method: "POST",
    cookie: u.cookie,
    body: { code: d.data.userCode },
  });
  const ready = await request("device/poll", {
    method: "POST",
    body: { deviceCode: d.data.deviceCode },
  });
  assert.equal(ready.data.status, "approved");
  assert.equal(
    (
      await request("device/poll", {
        method: "POST",
        body: { deviceCode: d.data.deviceCode },
      })
    ).status,
    410,
  );
  assert.equal(
    (await request("tokens", { cookie: u.cookie })).data.tokens.length,
    1,
  );
  assert.equal(
    (await request("projects", { token: ready.data.token })).status,
    200,
  );
  await request("device/revoke", {
    method: "POST",
    token: ready.data.token,
    body: {},
  });
  assert.equal(
    (await request("projects", { token: ready.data.token })).status,
    401,
  );
});
test("password recovery rotates the recovery code and revokes old sessions and tokens", async () => {
  const u = await user();
  const t = await request("tokens", {
    method: "POST",
    cookie: u.cookie,
    body: { name: "device" },
  });
  await new Promise((r) => setTimeout(r, 5));
  const recovered = await request("auth/recover", {
    method: "POST",
    body: {
      email: u.email,
      recoveryCode: u.data.recoveryCode,
      password: "a-different-long-password",
    },
  });
  assert.equal(recovered.status, 200);
  assert.notEqual(recovered.data.recoveryCode, u.data.recoveryCode);
  assert.equal((await request("projects", { cookie: u.cookie })).status, 401);
  assert.equal(
    (await request("projects", { token: t.data.token })).status,
    401,
  );
  assert.equal(
    (await request("projects", { cookie: recovered.cookie })).status,
    200,
  );
  assert.equal(
    (
      await request("auth/recover", {
        method: "POST",
        body: {
          email: u.email,
          recoveryCode: u.data.recoveryCode,
          password: "new-password-long",
        },
      })
    ).status,
    401,
  );
});
test("secrets are encrypted in storage and never returned by settings", async () => {
  const u = await user();
  await request("settings", {
    method: "PUT",
    cookie: u.cookie,
    body: {
      provider: "custom",
      endpoint: "https://example.com/v1",
      model: "example",
      apiKey: "key-sensitive-example",
      githubToken: "github-sensitive-example",
    },
  });
  const cfg = await request("settings", { cookie: u.cookie });
  assert.equal(cfg.data.hasApiKey, true);
  assert(!JSON.stringify(cfg.data).includes("sensitive"));
  const me = await request("auth/me", { cookie: u.cookie });
  const stored = await get(`user_${me.data.user.id}`, "settings");
  assert(!stored.apiKey.includes("sensitive"));
  assert.equal(decrypt(stored.apiKey), "key-sensitive-example");
});
test("scan history is newest first and project deletion removes its scans", async () => {
  const u = await user(),
    p = await project(u.cookie);
  const a = await request("scans", {
    method: "POST",
    cookie: u.cookie,
    body: { projectId: p.id, findings: [], filesScanned: 1 },
  });
  await new Promise((r) => setTimeout(r, 3));
  const b = await request("scans", {
    method: "POST",
    cookie: u.cookie,
    body: { projectId: p.id, findings: [], filesScanned: 2 },
  });
  const rows = (await request("scans", { cookie: u.cookie })).data.scans;
  assert.equal(rows[0].id, b.data.id);
  await request(`projects/${p.id}`, { method: "DELETE", cookie: u.cookie });
  assert.equal(
    (await request("scans", { cookie: u.cookie })).data.scans.length,
    0,
  );
});
test("product credentials cannot access admin endpoints and admin sessions are isolated", async () => {
  const u = await user();
  assert.equal(
    (await request("admin/config", { cookie: u.cookie })).status,
    404,
  );
  process.env.QWIK_KIND = "admin";
  process.env.QWIK_ADMIN_PASSWORD_HASH = passwordHash(
    "admin-test-password-long",
  );
  assert.equal(
    (await request("admin/config", { cookie: u.cookie })).status,
    401,
  );
  const login = await request("auth/admin", {
    method: "POST",
    body: { password: "admin-test-password-long" },
  });
  assert.equal(login.status, 200);
  assert(login.cookie.startsWith("qwik_admin="));
  const c = await request("admin/config", { cookie: login.cookie });
  assert.equal(c.status, 200);
  const updated = await request("admin/config", {
    method: "PUT",
    cookie: login.cookie,
    body: {
      ...c.data,
      prompt: c.data.prompt + " Check authorization at every trust boundary.",
    },
  });
  assert.equal(updated.data.version, 2);
  assert.equal(
    (await request("admin/history", { cookie: login.cookie })).data.versions
      .length,
    1,
  );
  assert.equal(
    (
      await request("admin/config", {
        method: "PUT",
        cookie: login.cookie,
        body: c.data,
      })
    ).status,
    409,
  );
  assert.equal(
    (await request("projects", { cookie: login.cookie })).status,
    404,
  );
});
test("rule scanning identifies dangerous patterns with source locations, without source snippets", () => {
  const code = [
    "const f = eval(userInput);",
    "client({rejectUnauthorized: false});",
    'const x = "gh' + "p_" + "a".repeat(36) + '";',
  ].join("\n");
  const r = scanFiles([{ path: "src/index.js", content: code }]);
  assert(r.findings.some((f) => f.ruleId === "QWK004" && f.line === 1));
  assert(r.findings.some((f) => f.ruleId === "QWK006" && f.line === 2));
  assert(r.findings.some((f) => f.ruleId === "QWK002" && f.line === 3));
  assert(!JSON.stringify(r).includes("a".repeat(36)));
  assert.equal(r.filesScanned, 1);
});
test("custom literal rules run only when enabled and do not execute regex", () => {
  const file = { path: "main.tf", content: "allow_unsafe = true" };
  assert.equal(
    scanFiles(
      [file],
      [{ id: "custom", needle: "allow_unsafe", enabled: false }],
    ).findings.length,
    0,
  );
  assert.equal(
    scanFiles(
      [file],
      [
        {
          id: "custom",
          title: "Unsafe setting",
          needle: "allow_unsafe",
          enabled: true,
          severity: "high",
        },
      ],
    ).findings.length,
    1,
  );
});
test("dependency extraction respects ecosystems and exact pinned versions", () => {
  const files = [
    {
      path: "package-lock.json",
      content: JSON.stringify({
        packages: {
          "": { name: "root" },
          "node_modules/example": { version: "1.2.3" },
        },
      }),
    },
    { path: "requirements.txt", content: "Django==2.2.0\nrequests>=2.0" },
  ];
  const deps = dependenciesFromFiles(files);
  assert.equal(deps.length, 2);
  assert.equal(deps[0].ecosystem, "npm");
  assert.equal(deps[1].ecosystem, "PyPI");
});
test("OSV availability failures are visible, not clean results", async () => {
  const files = [{ path: "requirements.txt", content: "Django==2.2.0" }];
  const r = await auditDependencies(files, async () => {
    throw new Error("down");
  });
  assert(r.status.includes("incomplete"));
  assert.equal(r.checked, 0);
});
test("OSV results include advisory identifiers and remediation", async () => {
  const r = await auditDependencies(
    [{ path: "requirements.txt", content: "Django==2.2.0" }],
    async () =>
      new Response(
        JSON.stringify({
          results: [{ vulns: [{ id: "GHSA-test-test-test" }] }],
        }),
      ),
  );
  assert.equal(r.findings[0].ruleId, "GHSA-test-test-test");
  assert(r.findings[0].remediation.includes("osv.dev"));
});
test("model reviews reject invented file paths and normalize findings", async () => {
  const r = await modelReview(
    [{ path: "app.js", content: 'console.log("hello");' }],
    { endpoint: "http://127.0.0.1:11434", provider: "ollama", model: "test" },
    DEFAULT_PROMPT,
    async () =>
      new Response(
        JSON.stringify({
          message: {
            content: JSON.stringify({
              findings: [
                {
                  title: "Known file",
                  file: "app.js",
                  line: 1,
                  severity: "high",
                },
                {
                  title: "Invented file",
                  file: "missing.js",
                  severity: "critical",
                },
              ],
            }),
          },
        }),
      ),
  );
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].source, "model");
});

test("Azure proxy authorization does not mask browser sessions or Qwik CLI tokens", async () => {
  const u = await user();
  const proxy = "Bearer eyJ.platform-internal-jwt.signature";
  const browser = await request("projects", {
    cookie: u.cookie,
    headers: { Authorization: proxy },
  });
  assert.equal(browser.status, 200);
  const t = await request("tokens", {
    method: "POST",
    cookie: u.cookie,
    body: { name: "CLI" },
  });
  const cli = await request("projects", {
    headers: { Authorization: proxy, "X-Qwik-Token": t.data.token },
  });
  assert.equal(cli.status, 200);
  assert.equal(
    (
      await request("projects", {
        headers: { Authorization: proxy, "X-Qwik-Token": "invalid" },
      })
    ).status,
    401,
  );
  const csrf = await request("projects", {
    method: "POST",
    cookie: u.cookie,
    body: { name: "blocked" },
    headers: {
      Authorization: proxy,
      "X-Qwik-Request": "",
      Origin: "https://attacker.test",
    },
  });
  assert.equal(csrf.status, 403);
});
