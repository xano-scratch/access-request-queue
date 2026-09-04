import { workspace } from "@xanots/sdk";

import { users } from "./tables/users.js";
import { systems } from "./tables/systems.js";
import { approvalRules } from "./tables/approval-rules.js";
import { accessRequests } from "./tables/access-requests.js";
import { approvals } from "./tables/approvals.js";

import { accessApi } from "./api/access.js";
import { loginQuery } from "./api/login.js";
import { submitRequestQuery } from "./api/submit-request.js";
import { listQueueQuery } from "./api/list-queue.js";
import { requestDetailQuery } from "./api/request-detail.js";
import { decideRequestQuery } from "./api/decide-request.js";
import { expireSweepQuery } from "./api/expire-sweep.js";
import { listSystemsQuery } from "./api/list-systems.js";
import { listRulesQuery } from "./api/list-rules.js";
import { listPeopleQuery } from "./api/list-people.js";
import { seedQuery } from "./api/seed.js";

/**
 * The Access Request Approval Queue backend: the governed layer under an
 * AI-built internal access tool. Approval routing, RBAC, segregation of duties,
 * versioned rules, and an append-only audit trail all live here, so the frontend
 * cannot go around them.
 */
export default workspace("access-request-queue")
  .registerTables([users, systems, approvalRules, accessRequests, approvals])
  .registerApiGroups([accessApi])
  .registerQueries([
    loginQuery,
    submitRequestQuery,
    listQueueQuery,
    requestDetailQuery,
    decideRequestQuery,
    expireSweepQuery,
    listSystemsQuery,
    listRulesQuery,
    listPeopleQuery,
    seedQuery,
  ]);
