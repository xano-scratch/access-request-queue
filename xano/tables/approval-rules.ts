import { table, f } from "@xanots/sdk";
import { systems } from "./systems.js";

/**
 * The governed logic a human audits: for a (system, risk_tier) pair, who may
 * approve and how. Rules are VERSIONED. A new rule for the same pair supersedes
 * the prior one, and only one row per pair is `is_active`. The seed keeps a
 * superseded version around so the versioning is visible in the Rules view.
 *
 * - `min_approver_limit` — the approver ceiling required to sign off at this tier.
 *   A request captures this as its `required_approver_limit` when it is routed.
 * - `require_second_approver` — when true, one eligible sign-off is not enough;
 *   the request stays pending until a second eligible approver signs off.
 * - `auto_expire_days` — granted access expires this many days after approval.
 */
export const approvalRules = table({
  name: "approval_rules",
  schema: {
    system_id: f.tableRef(systems, { required: true }),
    risk_tier: f.int({ required: true }),
    min_approver_limit: f.int({ required: true }),
    require_second_approver: f.bool({ required: true, default: false }),
    auto_expire_days: f.int({ required: true }),
    version: f.int({ required: true }),
    is_active: f.bool({ required: true, default: true }),
  },
});
