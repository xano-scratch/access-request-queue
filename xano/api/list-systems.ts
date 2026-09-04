import { query, s, ref } from "@xanots/sdk";
import { accessApi } from "./access.js";
import { users } from "../tables/users.js";
import { systems } from "../tables/systems.js";

/**
 * GET /api:access/systems — the systems someone can request access to, for the
 * new-request form. Read-only and behind auth.
 */
export const listSystemsQuery = query({
  name: "systems",
  verb: "GET",
  apiGroup: accessApi,
  auth: users,
  stack: [s.db.query({ table: systems, sort: [{ sortBy: "risk_tier", dir: "asc" }], as: "rows" })],
  response: ref("rows"),
});
