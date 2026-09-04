import { table, f } from "@xanots/sdk";
import { users } from "./users.js";
import { accessRequests } from "./access-requests.js";

/**
 * The append-only decision trail (the audit log). Every decision on a request
 * writes one row here and rows are never updated. `actor_name` is denormalized
 * on write so the trail reads on its own, without a join back to `users`, even
 * if a person is later renamed.
 *
 * `action`: approve | deny | escalate | expire (the last is written by the
 * expiry sweep, which has no human actor in production).
 */
export const approvals = table({
  name: "approvals",
  schema: {
    request_id: f.tableRef(accessRequests, { required: true }),
    actor_id: f.tableRef(users, { required: true }),
    actor_name: f.text({ required: true }),
    action: f.text({ required: true }),
    note: f.text(),
    at: f.timestamp({ required: true }),
  },
});
