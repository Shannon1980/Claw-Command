import test from "node:test";
import assert from "node:assert/strict";

import { evaluateSecurityPosture } from "../../src/lib/security/posture";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.MC_API_KEY;
  delete process.env.OPENCLAW_GATEWAY_URL;
  delete process.env.OPENCLAW_URL;
  delete process.env.OPENCLAW_GATEWAY_TOKEN;
  delete process.env.OPENCLAW_TOKEN;
  delete process.env.GATEWAY_TOKEN;
}

test("security posture reports critical when MC_API_KEY is missing", () => {
  resetEnv();
  process.env.NODE_ENV = "production";
  process.env.OPENCLAW_GATEWAY_URL = "https://gateway.example.com";
  process.env.OPENCLAW_GATEWAY_TOKEN = "token";

  const posture = evaluateSecurityPosture();

  assert.equal(posture.ok, false);
  assert.ok(posture.findings.some((f) => f.code === "MC_API_KEY_MISSING"));
  assert.ok(posture.blockers >= 1);
});

test("security posture reports warn when gateway token is missing", () => {
  resetEnv();
  process.env.NODE_ENV = "production";
  process.env.MC_API_KEY = "mc-secret";
  process.env.OPENCLAW_GATEWAY_URL = "https://gateway.example.com";

  const posture = evaluateSecurityPosture();

  assert.equal(posture.ok, true);
  assert.ok(posture.findings.some((f) => f.code === "GATEWAY_TOKEN_MISSING"));
  assert.equal(posture.blockers, 0);
});

test("security posture reports critical for insecure production gateway URL", () => {
  resetEnv();
  process.env.NODE_ENV = "production";
  process.env.MC_API_KEY = "mc-secret";
  process.env.OPENCLAW_GATEWAY_URL = "http://gateway.internal";
  process.env.OPENCLAW_GATEWAY_TOKEN = "token";

  const posture = evaluateSecurityPosture();

  assert.equal(posture.ok, false);
  assert.ok(posture.findings.some((f) => f.code === "GATEWAY_URL_INSECURE"));
});

test.after(() => {
  process.env = ORIGINAL_ENV;
});
