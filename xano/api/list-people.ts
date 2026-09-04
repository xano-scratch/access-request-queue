import { query, s, ref } from "@xanots/sdk";
import { accessApi } from "./access.js";
import { users } from "../tables/users.js";

/**
 * GET /api:access/people — a small directory (id, name, role) so the queue can
 * show who submitted each request. `output` restricts the columns, so the
 * password hash and email never leave the server.
 */
export const listPeopleQuery = query({
  name: "people",
  verb: "GET",
  apiGroup: accessApi,
  auth: users,
  stack: [
    s.db.query({
      table: users,
      output: ["id", "name", "role"],
      sort: [{ sortBy: "name", dir: "asc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
