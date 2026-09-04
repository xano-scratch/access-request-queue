import { query, s, ref, c, withFilters, fl } from "@xanots/sdk";
import { accessApi } from "./access.js";
import { users } from "../tables/users.js";
import { systems } from "../tables/systems.js";
import { approvalRules } from "../tables/approval-rules.js";
import { accessRequests } from "../tables/access-requests.js";
import { approvals } from "../tables/approvals.js";

/**
 * POST /api:access/seed — reset and reseed the demo data so the ephemeral is
 * browsable right away. `s.db.truncate({ reset: true })` clears each table and
 * restarts its id sequence, so ids are stable across reseeds and the foreign
 * keys below line up. Public on purpose: it is the demo's "reset" button.
 *
 * The seed is built to show the whole point of the app:
 *   - versioned rules: prod-db tier 3 has a superseded v1 and an active v2,
 *   - a request submitted BY an approver (so self-approval can be blocked),
 *   - a tier-3 request that needs a limit-3 approver AND a second sign-off,
 *   - an approved request already past its expiry (for the sweep).
 */
export const seedQuery = query({
  name: "seed",
  verb: "POST",
  apiGroup: accessApi,
  auth: false,
  stack: [
    // Clear children first, then parents; reset restarts the id sequences.
    s.db.truncate({ table: approvals, reset: true }),
    s.db.truncate({ table: accessRequests, reset: true }),
    s.db.truncate({ table: approvalRules, reset: true }),
    s.db.truncate({ table: systems, reset: true }),
    s.db.truncate({ table: users, reset: true }),

    // People. Passwords are demo values; this runs on a throwaway ephemeral.
    s.db.add({
      table: users,
      row: {
        email: c.text("riley.requester@northwind-bank.test"),
        password: c.text("password123"),
        name: c.text("Riley Requester"),
        role: c.text("requester"),
        approval_limit: c.int(0),
      },
      as: "u_req",
    }),
    s.db.add({
      table: users,
      row: {
        email: c.text("avery.approver@northwind-bank.test"),
        password: c.text("password123"),
        name: c.text("Avery Approver"),
        role: c.text("approver"),
        approval_limit: c.int(2),
      },
      as: "u_appr_low",
    }),
    s.db.add({
      table: users,
      row: {
        email: c.text("morgan.manager@northwind-bank.test"),
        password: c.text("password123"),
        name: c.text("Morgan Manager"),
        role: c.text("approver"),
        approval_limit: c.int(3),
      },
      as: "u_appr_high",
    }),
    s.db.add({
      table: users,
      row: {
        email: c.text("sam.security@northwind-bank.test"),
        password: c.text("password123"),
        name: c.text("Sam Security"),
        role: c.text("security_admin"),
        approval_limit: c.int(3),
      },
      as: "u_admin",
    }),

    // Systems across the three risk tiers.
    s.db.add({
      table: systems,
      row: {
        name: c.text("Production Database"),
        key: c.text("prod-db"),
        description: c.text("Primary customer database. The most sensitive system."),
        risk_tier: c.int(3),
      },
      as: "sys_db",
    }),
    s.db.add({
      table: systems,
      row: {
        name: c.text("Billing Console"),
        key: c.text("billing"),
        description: c.text("Customer billing and invoicing console."),
        risk_tier: c.int(2),
      },
      as: "sys_billing",
    }),
    s.db.add({
      table: systems,
      row: {
        name: c.text("Internal Wiki"),
        key: c.text("wiki"),
        description: c.text("Internal documentation and runbooks."),
        risk_tier: c.int(1),
      },
      as: "sys_wiki",
    }),

    // Versioned approval rules. prod-db tier 3 keeps a superseded v1 (inactive)
    // beside the active v2, so the versioning is visible in the Rules view.
    s.db.add({
      table: approvalRules,
      row: {
        system_id: ref("sys_db.id"),
        risk_tier: c.int(3),
        min_approver_limit: c.int(2),
        require_second_approver: c.bool(false),
        auto_expire_days: c.int(30),
        version: c.int(1),
        is_active: c.bool(false),
      },
      as: "rule_db_v1",
    }),
    s.db.add({
      table: approvalRules,
      row: {
        system_id: ref("sys_db.id"),
        risk_tier: c.int(3),
        min_approver_limit: c.int(3),
        require_second_approver: c.bool(true),
        auto_expire_days: c.int(7),
        version: c.int(2),
        is_active: c.bool(true),
      },
      as: "rule_db_v2",
    }),
    s.db.add({
      table: approvalRules,
      row: {
        system_id: ref("sys_billing.id"),
        risk_tier: c.int(2),
        min_approver_limit: c.int(2),
        require_second_approver: c.bool(false),
        auto_expire_days: c.int(30),
        version: c.int(1),
        is_active: c.bool(true),
      },
      as: "rule_billing",
    }),
    s.db.add({
      table: approvalRules,
      row: {
        system_id: ref("sys_wiki.id"),
        risk_tier: c.int(1),
        min_approver_limit: c.int(1),
        require_second_approver: c.bool(false),
        auto_expire_days: c.int(90),
        version: c.int(1),
        is_active: c.bool(true),
      },
      as: "rule_wiki",
    }),

    // In-flight requests, each bound to the rule that fired at routing.
    s.db.add({
      table: accessRequests,
      row: {
        requester_id: ref("u_req.id"),
        system_id: ref("sys_db.id"),
        justification: c.text(
          "Investigating a data quality issue a customer reported; need read access to the orders table.",
        ),
        risk_tier: c.int(3),
        status: c.text("pending"),
        rule_id: ref("rule_db_v2.id"),
        required_approver_limit: c.int(3),
      },
      as: "req_a",
    }),
    s.db.add({
      table: accessRequests,
      row: {
        requester_id: ref("u_req.id"),
        system_id: ref("sys_billing.id"),
        justification: c.text("Need to reconcile three invoices flagged during the monthly close."),
        risk_tier: c.int(2),
        status: c.text("pending"),
        rule_id: ref("rule_billing.id"),
        required_approver_limit: c.int(2),
      },
      as: "req_b",
    }),
    // Submitted by an approver, so self-approval can be demonstrated as blocked.
    s.db.add({
      table: accessRequests,
      row: {
        requester_id: ref("u_appr_low.id"),
        system_id: ref("sys_wiki.id"),
        justification: c.text("Updating the on-call runbook for the payments service."),
        risk_tier: c.int(1),
        status: c.text("pending"),
        rule_id: ref("rule_wiki.id"),
        required_approver_limit: c.int(1),
      },
      as: "req_c",
    }),
    // Approved last month and already past its expiry window (sweep target).
    s.db.add({
      table: accessRequests,
      row: {
        requester_id: ref("u_req.id"),
        system_id: ref("sys_billing.id"),
        justification: c.text("Temporary billing access granted for the quarter-end audit."),
        risk_tier: c.int(2),
        status: c.text("approved"),
        rule_id: ref("rule_billing.id"),
        required_approver_limit: c.int(2),
        expires_at: withFilters(c.now(), fl.epochms_add_secs(c.int(-3600))),
      },
      as: "req_d",
    }),

    // Decision trail: the first sign-off on the tier-3 request (still needs a
    // second), and the approval that granted the now-expired billing access.
    s.db.add({
      table: approvals,
      row: {
        request_id: ref("req_a.id"),
        actor_id: ref("u_appr_high.id"),
        actor_name: c.text("Morgan Manager"),
        action: c.text("approve"),
        note: c.text("Approved after security review. A second sign-off is required at tier 3."),
        at: c.now(),
      },
    }),
    s.db.add({
      table: approvals,
      row: {
        request_id: ref("req_d.id"),
        actor_id: ref("u_appr_high.id"),
        actor_name: c.text("Morgan Manager"),
        action: c.text("approve"),
        note: c.text("Approved for the quarter-end audit window."),
        at: c.now(),
      },
    }),
  ],
  response: {
    seeded: c.bool(true),
    users: c.int(4),
    systems: c.int(3),
    rules: c.int(4),
    requests: c.int(4),
  },
});
