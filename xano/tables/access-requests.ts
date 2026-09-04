import { table, f } from "@xanots/sdk";
import { users } from "./users.js";
import { systems } from "./systems.js";
import { approvalRules } from "./approval-rules.js";

/**
 * The request state machine. When a request is submitted, the active rule for
 * its (system, risk_tier) is found and CAPTURED onto the row (`rule_id` +
 * `required_approver_limit` + `risk_tier`), so the routing decision is recorded
 * at submit time and not recomputed later.
 *
 * `status`: pending | approved | denied | escalated | expired.
 * `expires_at` is null until the request is approved.
 */
export const accessRequests = table({
  name: "access_requests",
  schema: {
    requester_id: f.tableRef(users, { required: true }),
    system_id: f.tableRef(systems, { required: true }),
    justification: f.text({ required: true }),
    risk_tier: f.int({ required: true }),
    status: f.text({ required: true }),
    rule_id: f.tableRef(approvalRules, { required: true }),
    required_approver_limit: f.int({ required: true }),
    expires_at: f.timestamp({ nullable: true }),
  },
});
