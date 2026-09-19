import { TableClient } from "@azure/data-tables";
const memory = new Map();
let table;
let ready;
const key = (p, r) => `${p}|${r}`;
function client() {
  if (!process.env.QWIK_TABLE_CONNECTION) {
    if (process.env.QWIK_DEV === "1") return null;
    throw new Error("Storage is not configured");
  }
  if (!table)
    table = TableClient.fromConnectionString(
      process.env.QWIK_TABLE_CONNECTION,
      "qwik",
    );
  return table;
}
async function ensure() {
  const c = client();
  if (c && !ready)
    ready = c.createTable().catch((e) => {
      if (e.statusCode !== 409) throw e;
    });
  await ready;
  return c;
}
export async function get(p, r) {
  const c = await ensure();
  if (!c) return memory.get(key(p, r)) || null;
  try {
    const e = await c.getEntity(p, r);
    return { ...JSON.parse(e.data), _etag: e.etag };
  } catch (e) {
    if (e.statusCode === 404) return null;
    throw e;
  }
}
export async function put(p, r, value, { create = false, etag } = {}) {
  const c = await ensure();
  const { _etag, ...data } = value;
  const json = JSON.stringify(data);
  if (Buffer.byteLength(json) > 60000)
    throw Object.assign(
      new Error("Record is too large; reduce the scan size."),
      { status: 413 },
    );
  if (!c) {
    const old = memory.get(key(p, r));
    if ((create && old) || (etag && old?._etag !== etag))
      throw Object.assign(new Error("Conflict"), {
        statusCode: create ? 409 : 412,
      });
    memory.set(key(p, r), {
      ...data,
      _etag: String(Number(old?._etag || 0) + 1),
    });
    return;
  }
  const entity = { partitionKey: p, rowKey: r, data: json };
  if (create) return c.createEntity(entity);
  if (etag) return c.updateEntity(entity, "Replace", { etag });
  return c.upsertEntity(entity, "Replace");
}
export async function remove(p, r) {
  const c = await ensure();
  if (!c) {
    memory.delete(key(p, r));
    return;
  }
  await c.deleteEntity(p, r).catch((e) => {
    if (e.statusCode !== 404) throw e;
  });
}
export async function list(p, prefix = "", limit = 200) {
  const c = await ensure();
  if (!c)
    return [...memory.entries()]
      .filter(([k]) => k.startsWith(`${p}|${prefix}`))
      .slice(0, limit)
      .map(([, v]) => v);
  const clean = (s) => s.replace(/'/g, "''");
  const filter = `PartitionKey eq '${clean(p)}'${prefix ? ` and RowKey ge '${clean(prefix)}' and RowKey lt '${clean(prefix)}~'` : ""}`;
  const rows = [];
  for await (const e of c.listEntities({ queryOptions: { filter } })) {
    rows.push({ ...JSON.parse(e.data), _etag: e.etag });
    if (rows.length >= limit) break;
  }
  return rows;
}
export function clearMemory() {
  memory.clear();
}
