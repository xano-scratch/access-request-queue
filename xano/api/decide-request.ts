import {
  query,
  input,
  s,
  inp,
  ref,
  auth,
  c,
  col,
  expr,
  and,
  or,
  withFilters,
  fl,
} from "@xanots/sdk";
import { accessApi } from "./access.js";
import { users } from "../tables/users.js";
import { approvalRules } from "../tables/approval-rules.js";
import { accessRequests } from "../tables/access-requests.js";
import { approvals } from "../tables/approvals.js";

/**
 * POST /api:access/requests/{id}/decide — THE governed job. Approve, deny, or
 * escalate a request under guards that the frontend cannot go around. The
 * preconditions run in order:
 *   1. the caller is an approver or a security_admin (RBAC),
 *   2. the caller is not the requester (segregation of duties),
 *   3. the request is still pending,
 *   4. on approve, the caller's approval_limit must clear the request's
 *      required_approver_limit, or the action is forced to escalate.
 *
 * When the fired rule requires a second approver, the first eligible sign-off
 * keeps the request pending and records the approval; the second one approves it
 * and stamps `expires_at = now + auto_expire_days`. Every action, including a
 * forced escalate, appends one row to the append-only trail.
 */
export const decideRequestQuery = query({
  name: "requests/{id}/decide",
  verb: "POST",
  apiGroup: accessApi,
  auth: users,
  input: {
    id: input.int({ required: true }),
    action: input.enum(["approve", "deny", "escalate"], { required: true }),
    note: input.text(),
  },
  stack: [
    // The caller.
    s.db.get({
      table: users,
      fieldValue: auth("id"),
      output: ["id", "name", "role", "approval_limit"],
      as: "me",
    }),
    s.precondition({
      expr: expr(ref("me"), "!=", c.null()),
      error_type: "unauthorized",
      error: c.text("Not authenticated."),
    }),
    // (1) RBAC: only approvers and security admins can decide.
    s.precondition({
      expr: or(
        expr(ref("me.role"), "=", c.text("approver")),
        expr(ref("me.role"), "=", c.text("security_admin")),
      ),
      error_type: "accessdenied",
      error: c.text("Only approvers or security admins can decide requests."),
    }),
    // The request under decision.
    s.db.get({ table: accessRequests, fieldValue: inp("id"), as: "req" }),
    s.precondition({
      expr: expr(ref("req"), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Request not found."),
    }),
    // (2) Segregation of duties: you cannot decide your own request.
    s.precondition({
      expr: expr(ref("req.requester_id"), "!=", ref("me.id")),
      error_type: "accessdenied",
      error: c.text("You cannot decide your own access request (segregation of duties)."),
    }),
    // (3) Only a pending request can be decided.
    s.precondition({
      expr: expr(ref("req.status"), "=", c.text("pending")),
      error_type: "badrequest",
      error: c.text("This request has already been decided."),
    }),
    // The rule that fired at routing (drives second-approver + expiry window).
    s.db.get({ table: approvalRules, fieldValue: ref("req.rule_id"), as: "rule" }),
    s.precondition({
      expr: expr(ref("rule"), "!=", c.null()),
      error_type: "badrequest",
      error: c.text("The approval rule for this request is missing."),
    }),
    // Resolve the outcome. Defaults assume the requested action is honored.
    s.set_var("recorded_action", inp("action")),
    s.set_var("new_status", c.text("pending")),
    s.set_var("expires_val", c.null()),
    s.conditional({
      when: expr(inp("action"), "=", c.text("deny")),
      then: [s.update_var("new_status", c.text("denied"))],
      elif: [
        {
          when: expr(inp("action"), "=", c.text("escalate")),
          then: [s.update_var("new_status", c.text("escalated"))],
        },
      ],
      else: [
        // action === "approve"
        s.conditional({
          // (4) Threshold guard: below the required limit forces an escalate.
          when: expr(ref("me.approval_limit"), "<", ref("req.required_approver_limit")),
          then: [
            s.update_var("recorded_action", c.text("escalate")),
            s.update_var("new_status", c.text("escalated")),
          ],
          else: [
            // Eligible to approve. Honor the two-approver rule.
            s.db.query({
              table: approvals,
              where: [
                expr(col("request_id"), "=", inp("id")),
                expr(col("action"), "=", c.text("approve")),
              ],
              returnType: "count",
              as: "prior_ok",
            }),
            s.conditional({
              when: and(
                expr(ref("rule.require_second_approver"), "=", c.bool(true)),
                expr(ref("prior_ok"), "=", c.int(0)),
              ),
              then: [
                // First of two required sign-offs: record it, stay pending.
                s.update_var("new_status", c.text("pending")),
              ],
              else: [
                // Fully approved: set the status and the expiry window.
                s.update_var("new_status", c.text("approved")),
                s.set_var(
                  "expire_secs",
                  withFilters(ref("rule.auto_expire_days"), fl.mul(c.int(86400)), fl.to_int()),
                ),
                s.update_var(
                  "expires_val",
                  withFilters(c.now(), fl.epochms_add_secs(ref("expire_secs"))),
                ),
              ],
            }),
          ],
        }),
      ],
    }),
    // Apply the decision. db.edit is a partial update, so untouched columns keep
    // their stored value; expires_val is null unless this call fully approved.
    s.db.edit({
      table: accessRequests,
      fieldValue: inp("id"),
      row: { status: ref("new_status"), expires_at: ref("expires_val") },
      as: "updated",
    }),
    // Append the audit row (never updated, only inserted).
    s.db.add({
      table: approvals,
      row: {
        request_id: inp("id"),
        actor_id: ref("me.id"),
        actor_name: ref("me.name"),
        action: ref("recorded_action"),
        note: inp("note"),
        at: c.now(),
      },
      as: "approval",
    }),
  ],
  response: {
    request: ref("updated"),
    approval: ref("approval"),
    outcome: ref("new_status"),
  },
});
