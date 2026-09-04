import { query, s, ref, auth, c, col, expr } from "@xanots/sdk";
import { accessApi } from "./access.js";
import { users } from "../tables/users.js";
import { accessRequests } from "../tables/access-requests.js";
import { approvals } from "../tables/approvals.js";

/**
 * POST /api:access/expire-sweep — housekeeping. Move approved requests whose
 * `expires_at` has passed to `expired`, and append an audit row for each. In
 * production this is a scheduled task with no human actor; in the demo a
 * security_admin runs it by hand so the auto-expiry is observable. Auto-expiry
 * lives in the backend, so it holds no matter which frontend is in front of it.
 */
export const expireSweepQuery = query({
  name: "expire-sweep",
  verb: "POST",
  apiGroup: accessApi,
  auth: users,
  stack: [
    s.db.get({ table: users, fieldValue: auth("id"), output: ["id", "name", "role"], as: "me" }),
    s.precondition({
      expr: expr(ref("me"), "!=", c.null()),
      error_type: "unauthorized",
      error: c.text("Not authenticated."),
    }),
    s.precondition({
      expr: expr(ref("me.role"), "=", c.text("security_admin")),
      error_type: "accessdenied",
      error: c.text("Only a security admin can run the expiry sweep."),
    }),
    s.db.query({
      table: accessRequests,
      where: [
        expr(col("status"), "=", c.text("approved")),
        expr(col("expires_at"), "<", c.now()),
      ],
      as: "due",
    }),
    s.foreach({
      list: ref("due"),
      as: "r",
      body: [
        s.db.edit({
          table: accessRequests,
          fieldValue: ref("r.id"),
          row: { status: c.text("expired") },
        }),
        s.db.add({
          table: approvals,
          row: {
            request_id: ref("r.id"),
            actor_id: ref("me.id"),
            actor_name: ref("me.name"),
            action: c.text("expire"),
            note: c.text("Auto-expired: the access window elapsed."),
            at: c.now(),
          },
        }),
      ],
    }),
  ],
  response: { expired: ref("due") },
});
