import { query, s, ref } from "@xanots/sdk";
import { accessApi } from "./access.js";
import { users } from "../tables/users.js";
import { approvalRules } from "../tables/approval-rules.js";

/**
 * GET /api:access/rules — every approval rule, active and superseded, for the
 * Rules view. Returning the superseded versions too is the point: it shows the
 * governed logic is versioned and auditable, not silently overwritten.
 */
export const listRulesQuery = query({
  name: "rules",
  verb: "GET",
  apiGroup: accessApi,
  auth: users,
  stack: [
    s.db.query({
      table: approvalRules,
      sort: [
        { sortBy: "system_id", dir: "asc" },
        { sortBy: "version", dir: "asc" },
      ],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
