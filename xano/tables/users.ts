import { table, f } from "@xanots/sdk";

/**
 * People who use the tool. This is the AUTH table (`auth: true`), so
 * `s.security.create_auth_token({ table: users, ... })` mints a session token
 * for a row here, and `auth("id")` on a protected endpoint is a user id.
 *
 * `role` is the API-layer RBAC role. There is no row-level security: the role is
 * stored as text and checked with `s.precondition` guards on each endpoint.
 * `approval_limit` is the highest risk tier this person may sign off; a request
 * routed to a rule whose `min_approver_limit` is above it forces an escalate.
 */
export const users = table({
  name: "users",
  auth: true,
  schema: {
    email: f.email({ required: true, methods: ["trim", "lower"] }),
    password: f.password({ required: true }),
    name: f.text({ required: true }),
    // requester | approver | security_admin (enum-as-text, enforced in the API layer)
    role: f.text({ required: true }),
    approval_limit: f.int({ required: true, default: 0 }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
});
