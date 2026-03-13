import test from "node:test";
import assert from "node:assert/strict";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.MC_API_KEY;
  delete process.env.MC_AUTH_ALLOW_INSECURE_DEV;
}

async function loadAuthModule() {
  const modPath = "../../src/lib/mc/auth";
  return import(`${modPath}?t=${Date.now()}-${Math.random()}`);
}

test("requireMcAuth returns 503 when MC_API_KEY missing in production", async () => {
  resetEnv();
  process.env.NODE_ENV = "production";

  const { requireMcAuth } = await loadAuthModule();
  const res = requireMcAuth(new Request("http://localhost/api/mc/spawn"));

  assert.ok(res);
  assert.equal(res.status, 503);
});

test("requireMcAuth allows request when insecure dev bypass is enabled", async () => {
  resetEnv();
  process.env.NODE_ENV = "development";
  process.env.MC_AUTH_ALLOW_INSECURE_DEV = "true";

  const { requireMcAuth } = await loadAuthModule();
  const res = requireMcAuth(new Request("http://localhost/api/mc/spawn"));

  assert.equal(res, null);
});

test("requireMcAuth accepts correct bearer token and rejects incorrect token", async () => {
  resetEnv();
  process.env.NODE_ENV = "production";
  process.env.MC_API_KEY = "super-secret";

  const { requireMcAuth } = await loadAuthModule();

  const ok = requireMcAuth(
    new Request("http://localhost/api/mc/spawn", {
      headers: { authorization: "Bearer super-secret" },
    })
  );
  assert.equal(ok, null);

  const bad = requireMcAuth(
    new Request("http://localhost/api/mc/spawn", {
      headers: { authorization: "Bearer wrong-secret" },
    })
  );
  assert.ok(bad);
  assert.equal(bad.status, 401);
});

test.after(() => {
  process.env = ORIGINAL_ENV;
});
