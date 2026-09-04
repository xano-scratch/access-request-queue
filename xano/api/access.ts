import { apiGroup } from "@xanots/sdk";

/**
 * The one API group for the access-request queue. `canonical` is pinned so the
 * public paths stay stable (`/api:access/...`) and `getPath()` resolves in the
 * browser bundle without needing a lock file.
 */
export const accessApi = apiGroup({
  name: "access",
  canonical: "access",
  description:
    "Access request approval queue: submit, route by rule, decide with RBAC and segregation of duties, audit.",
});
