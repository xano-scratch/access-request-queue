import { query, s, ref, auth, c, col, expr } from "@xanots/sdk";
import { accessApi } from "./access.js";
import { users } from "../tables/users.js";
import { accessRequests } from "../tables/access-requests.js";

/**
 * GET /api:access/requests — the request queue, scoped to the caller's role:
 *   - security_admin sees every request,
 *   - approver sees pending requests they are eligible to act on
 *     (their approval_limit >= the request's required_approver_limit),
 *   - requester sees only their own requests.
 *
 * The scope is decided in the API layer, so an AI-built frontend cannot widen
 * it. `rows` is seeded at the top of the stack and updated inside the branch so
 * the response variable is always bound.
 *
 * This GET and the POST submit endpoint share the path name `requests`: a
 * query's identity is `(api group, verb, name)`, so the verb keeps them
 * distinct in the lock and at runtime.
 */
export const listQueueQuery = query({
  name: "requests",
  verb: "GET",
  apiGroup: accessApi,
  auth: users,
  stack: [
    s.db.get({
      table: users,
      fieldValue: auth("id"),
      output: ["id", "role", "approval_limit"],
      as: "me",
    }),
    s.precondition({
      expr: expr(ref("me"), "!=", c.null()),
      error_type: "unauthorized",
      error: c.text("Not authenticated."),
    }),
    s.set_var("rows", c.array([])),
    s.conditional({
      when: expr(ref("me.role"), "=", c.text("security_admin")),
      then: [
        s.db.query({
          table: accessRequests,
          sort: [{ sortBy: "created_at", dir: "desc" }],
          as: "found_all",
        }),
        s.update_var("rows", ref("found_all")),
      ],
      elif: [
        {
          when: expr(ref("me.role"), "=", c.text("approver")),
          then: [
            s.db.query({
              table: accessRequests,
              where: [
                expr(col("status"), "=", c.text("pending")),
                expr(col("required_approver_limit"), "<=", ref("me.approval_limit")),
              ],
              sort: [{ sortBy: "created_at", dir: "desc" }],
              as: "found_eligible",
            }),
            s.update_var("rows", ref("found_eligible")),
          ],
        },
      ],
      else: [
        s.db.query({
          table: accessRequests,
          where: expr(col("requester_id"), "=", auth("id")),
          sort: [{ sortBy: "created_at", dir: "desc" }],
          as: "found_own",
        }),
        s.update_var("rows", ref("found_own")),
      ],
    }),
  ],
  response: { role: ref("me.role"), requests: ref("rows") },
});
