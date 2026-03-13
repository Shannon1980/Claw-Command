import test from "node:test";
import assert from "node:assert/strict";

import { hasRoleAtLeast } from "../../src/lib/auth/validateSession";

const MIN_ROLE_BY_OPERATION = {
  decisionsList: "viewer",
  decisionsGetById: "viewer",
  decisionsCreate: "operator",
  decisionsUpdate: "operator",
  decisionsDelete: "admin",
} as const;

const ALL_ROLES = ["viewer", "operator", "admin"] as const;

type Role = (typeof ALL_ROLES)[number];

type Op = keyof typeof MIN_ROLE_BY_OPERATION;

function can(role: Role, op: Op): boolean {
  return hasRoleAtLeast(role, MIN_ROLE_BY_OPERATION[op]);
}

test("RBAC matrix: viewer permissions for decisions endpoints", () => {
  assert.equal(can("viewer", "decisionsList"), true);
  assert.equal(can("viewer", "decisionsGetById"), true);
  assert.equal(can("viewer", "decisionsCreate"), false);
  assert.equal(can("viewer", "decisionsUpdate"), false);
  assert.equal(can("viewer", "decisionsDelete"), false);
});

test("RBAC matrix: operator permissions for decisions endpoints", () => {
  assert.equal(can("operator", "decisionsList"), true);
  assert.equal(can("operator", "decisionsGetById"), true);
  assert.equal(can("operator", "decisionsCreate"), true);
  assert.equal(can("operator", "decisionsUpdate"), true);
  assert.equal(can("operator", "decisionsDelete"), false);
});

test("RBAC matrix: admin permissions for decisions endpoints", () => {
  assert.equal(can("admin", "decisionsList"), true);
  assert.equal(can("admin", "decisionsGetById"), true);
  assert.equal(can("admin", "decisionsCreate"), true);
  assert.equal(can("admin", "decisionsUpdate"), true);
  assert.equal(can("admin", "decisionsDelete"), true);
});

test("role hierarchy monotonicity", () => {
  // If a role can do something, any higher role should also be able to do it.
  const rank: Record<Role, number> = { viewer: 1, operator: 2, admin: 3 };

  const operations = Object.keys(MIN_ROLE_BY_OPERATION) as Op[];

  for (const op of operations) {
    for (const r1 of ALL_ROLES) {
      for (const r2 of ALL_ROLES) {
        if (rank[r2] >= rank[r1] && can(r1, op)) {
          assert.equal(
            can(r2, op),
            true,
            `Expected higher role ${r2} to retain access for op ${op} granted to ${r1}`
          );
        }
      }
    }
  }
});
