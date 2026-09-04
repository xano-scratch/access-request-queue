import { query, input, s, inp, ref, obj, c, expr } from "@xanots/sdk";
import { accessApi } from "./access.js";
import { users } from "../tables/users.js";

/**
 * POST /api:access/login — authenticate against the `users` auth table and mint
 * a token. The password is taken as `input.text` (NOT `input.password`, which
 * would double-hash it); the stored hash is read via `output` because
 * `f.password` columns are internal and would not otherwise come back.
 */
export const loginQuery = query({
  name: "login",
  verb: "POST",
  apiGroup: accessApi,
  auth: false,
  input: {
    email: input.email({ required: true, methods: ["trim", "lower"] }),
    password: input.text({ required: true }),
  },
  stack: [
    s.db.get({
      table: users,
      fieldName: "email",
      fieldValue: inp("email"),
      output: ["id", "email", "name", "role", "approval_limit", "password"],
      as: "u",
    }),
    // Guard existence before drilling into the row.
    s.precondition({
      expr: expr(ref("u"), "!=", c.null()),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.check_password({
      text_password: inp("password"),
      hash_password: ref("u.password"),
      as: "ok",
    }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.create_auth_token({ table: users, id: ref("u.id"), as: "token" }),
  ],
  // Build a clean user object so the password hash never leaves the server.
  response: {
    token: ref("token"),
    user: obj({
      id: ref("u.id"),
      name: ref("u.name"),
      email: ref("u.email"),
      role: ref("u.role"),
      approval_limit: ref("u.approval_limit"),
    }),
  },
});
