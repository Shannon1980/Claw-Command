#!/usr/bin/env node

const required = [
  "MC_API_KEY",
  "OPENCLAW_GATEWAY_URL|OPENCLAW_URL",
  "OPENCLAW_GATEWAY_TOKEN|OPENCLAW_TOKEN|GATEWAY_TOKEN",
];

function hasAny(keys) {
  return keys.some((k) => (process.env[k] || "").trim().length > 0);
}

const checks = [
  {
    label: "MC_API_KEY",
    ok: hasAny(["MC_API_KEY"]),
    fix: "Set MC_API_KEY in .env.local and deployment secrets.",
  },
  {
    label: "OPENCLAW_GATEWAY_URL|OPENCLAW_URL",
    ok: hasAny(["OPENCLAW_GATEWAY_URL", "OPENCLAW_URL"]),
    fix: "Set OPENCLAW_GATEWAY_URL (preferred) or OPENCLAW_URL.",
  },
  {
    label: "OPENCLAW_GATEWAY_TOKEN|OPENCLAW_TOKEN|GATEWAY_TOKEN",
    ok: hasAny(["OPENCLAW_GATEWAY_TOKEN", "OPENCLAW_TOKEN", "GATEWAY_TOKEN"]),
    fix: "Set OPENCLAW_GATEWAY_TOKEN (preferred) or OPENCLAW_TOKEN.",
  },
];

const failed = checks.filter((c) => !c.ok);

console.log("\nStartup Security Check\n----------------------");
checks.forEach((c) => {
  console.log(`${c.ok ? "✅" : "❌"} ${c.label}`);
  if (!c.ok) console.log(`   ↳ ${c.fix}`);
});

if (failed.length > 0) {
  console.error(`\nBlocked: ${failed.length} required startup checks failed.`);
  process.exit(1);
}

console.log("\nAll required startup checks passed.");
