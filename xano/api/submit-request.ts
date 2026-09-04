import { query, input, s, inp, ref, auth, c, col, expr } from "@xanots/sdk";
import { accessApi } from "./access.js";
import { users } from "../tables/users.js";
import { systems } from "../tables/systems.js";
import { approvalRules } from "../tables/approval-rules.js";
import { accessRequests } from "../tables/access-requests.js";

/**
 * POST /api:access/requests — a requester submits an access request. The routing
 * rule runs HERE, once: look up the system's risk tier, find the single active
 * approval rule for (system, tier), and CAPTURE that rule onto the new request
 * (`rule_id` + `required_approver_limit` + `risk_tier`). The decision is recorded
 * at submit time, not recomputed when someone acts on it.
 */
export const submitRequestQuery = query({
  name: "requests",
  verb: "POST",
  apiGroup: accessApi,
  auth: users,
  input: {
    system_id: input.int({ required: true }),
    justification: input.text({ required: true }),
  },
  stack: [
    s.db.get({ table: systems, fieldValue: inp("system_id"), as: "sys" }),
    s.precondition({
      expr: expr(ref("sys"), "!=", c.null()),
      error_type: "notfound",
      error: c.text("System not found."),
    }),
    // The one active rule for this (system, risk_tier) is the rule that fires.
    s.db.query({
      table: approvalRules,
      where: [
        expr(col("system_id"), "=", inp("system_id")),
        expr(col("risk_tier"), "=", ref("sys.risk_tier")),
        expr(col("is_active"), "=", c.bool(true)),
      ],
      returnType: "single",
      as: "rule",
    }),
    s.precondition({
      expr: expr(ref("rule"), "!=", c.null()),
      error_type: "badrequest",
      error: c.text("No active approval rule for this system and risk tier."),
    }),
    s.db.add({
      table: accessRequests,
      row: {
        requester_id: auth("id"),
        system_id: inp("system_id"),
        justification: inp("justification"),
        risk_tier: ref("sys.risk_tier"),
        status: c.text("pending"),
        rule_id: ref("rule.id"),
        required_approver_limit: ref("rule.min_approver_limit"),
      },
      as: "req",
    }),
  ],
  response: ref("req"),
});
