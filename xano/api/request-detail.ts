import { query, input, s, inp, ref, c, col, expr } from "@xanots/sdk";
import { accessApi } from "./access.js";
import { users } from "../tables/users.js";
import { systems } from "../tables/systems.js";
import { approvalRules } from "../tables/approval-rules.js";
import { accessRequests } from "../tables/access-requests.js";
import { approvals } from "../tables/approvals.js";

/**
 * GET /api:access/requests/{id} — one request with everything needed to review
 * it: the system, the requester, the exact rule that fired at routing, and the
 * full ordered decision trail (the audit log). The `{id}` path segment binds the
 * `id` input. The request is guarded before any related row is read, so an
 * unknown id returns a clean 404 instead of a 500.
 */
export const requestDetailQuery = query({
  name: "requests/{id}",
  verb: "GET",
  apiGroup: accessApi,
  auth: users,
  input: { id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: accessRequests, fieldValue: inp("id"), as: "req" }),
    s.precondition({
      expr: expr(ref("req"), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Request not found."),
    }),
    s.db.get({ table: systems, fieldValue: ref("req.system_id"), as: "sys" }),
    s.db.get({
      table: users,
      fieldValue: ref("req.requester_id"),
      output: ["id", "name", "email", "role"],
      as: "requester",
    }),
    s.db.get({ table: approvalRules, fieldValue: ref("req.rule_id"), as: "rule" }),
    s.db.query({
      table: approvals,
      where: expr(col("request_id"), "=", inp("id")),
      sort: [{ sortBy: "at", dir: "asc" }],
      as: "trail",
    }),
  ],
  response: {
    request: ref("req"),
    system: ref("sys"),
    requester: ref("requester"),
    rule: ref("rule"),
    trail: ref("trail"),
  },
});
