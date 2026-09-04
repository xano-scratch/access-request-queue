// The one contract: paths and request/response TYPES are derived from the
// xanots query defs, never hand-typed. Change a def in xano/ and the client
// follows. Row shapes come from the table defs via InferRow.
//
// These defs are lean (no agent graph), so importing them for getPath()/verb is
// cheap. Types (InferInput/InferResponse/InferRow) are erased at build time.

import type { InferInput, InferResponse, InferRow } from "@xanots/sdk";

import { loginQuery } from "../../../xano/api/login.js";
import { submitRequestQuery } from "../../../xano/api/submit-request.js";
import { listQueueQuery } from "../../../xano/api/list-queue.js";
import { requestDetailQuery } from "../../../xano/api/request-detail.js";
import { decideRequestQuery } from "../../../xano/api/decide-request.js";
import { expireSweepQuery } from "../../../xano/api/expire-sweep.js";
import { listSystemsQuery } from "../../../xano/api/list-systems.js";
import { listRulesQuery } from "../../../xano/api/list-rules.js";
import { listPeopleQuery } from "../../../xano/api/list-people.js";
import { seedQuery } from "../../../xano/api/seed.js";

import type { accessRequests } from "../../../xano/tables/access-requests.js";
import type { systems as systemsTable } from "../../../xano/tables/systems.js";
import type { approvalRules } from "../../../xano/tables/approval-rules.js";
import type { approvals as approvalsTable } from "../../../xano/tables/approvals.js";

/** The deployed Xano backend URL: injected as window.XANO_HOST by
 * `xanots deploy --static`, or VITE_XANO_HOST in dev. */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

// ── Types derived from the backend defs (the one contract) ───────────────────

export type Role = "requester" | "approver" | "security_admin";
export type RequestStatus = "pending" | "approved" | "denied" | "escalated" | "expired";
export type DecideAction = "approve" | "deny" | "escalate";

/** Row shapes come straight from the table defs. */
export type AccessRequest = InferRow<typeof accessRequests>;
export type SystemRow = InferRow<typeof systemsTable>;
export type RuleRow = InferRow<typeof approvalRules>;
export type ApprovalRow = InferRow<typeof approvalsTable>;

export type LoginBody = InferInput<typeof loginQuery>;
export type LoginResult = InferResponse<typeof loginQuery>;
export type AuthUser = LoginResult["user"];

export type PersonRow = InferResponse<typeof listPeopleQuery> extends readonly (infer P)[]
  ? P
  : never;

export type SubmitBody = InferInput<typeof submitRequestQuery>;
export type DetailResult = InferResponse<typeof requestDetailQuery>;
export type DecideBody = InferInput<typeof decideRequestQuery>;
export type DecideResult = InferResponse<typeof decideRequestQuery>;

/** The queue response. The top-level shape is the def's response; the element
 * type is the access_requests row (the query returns rows of that table). The
 * `requests` list is built through set_var/update_var, which the response
 * inferrer widens, so its element type is composed from InferRow rather than
 * read off the response — still a single source of truth (the table def). */
export type QueueResult = { role: Role; requests: AccessRequest[] };

// ── Token store (a demo session in localStorage) ─────────────────────────────

const TOKEN_KEY = "arq.token";
const USER_KEY = "arq.user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}
export function setSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── Fetch layer ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, verb: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(XANO_HOST + path, {
    method: verb,
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const text = await res.text();
      try {
        const parsed = JSON.parse(text) as { message?: string };
        message = parsed.message || text || message;
      } catch {
        message = text || message;
      }
    } catch {
      // keep the default message
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ── Endpoint wrappers (paths + verbs come straight from the defs) ─────────────

export function login(body: LoginBody): Promise<LoginResult> {
  return call<LoginResult>(loginQuery.getPath(), loginQuery.verb, body);
}

export async function getQueue(): Promise<QueueResult> {
  const raw = await call<{ role: Role; requests: AccessRequest[] }>(
    listQueueQuery.getPath(),
    listQueueQuery.verb,
  );
  return { role: raw?.role ?? ("requester" as Role), requests: raw?.requests ?? [] };
}

export function getSystems(): Promise<SystemRow[]> {
  return call<SystemRow[]>(listSystemsQuery.getPath(), listSystemsQuery.verb);
}

export function getRules(): Promise<RuleRow[]> {
  return call<RuleRow[]>(listRulesQuery.getPath(), listRulesQuery.verb);
}

export function getPeople(): Promise<PersonRow[]> {
  return call<PersonRow[]>(listPeopleQuery.getPath(), listPeopleQuery.verb);
}

export function submitRequest(body: SubmitBody): Promise<AccessRequest> {
  return call<AccessRequest>(submitRequestQuery.getPath(), submitRequestQuery.verb, body);
}

export function getRequest(id: number): Promise<DetailResult> {
  return call<DetailResult>(
    requestDetailQuery.getPath({ params: { id: String(id) } }),
    requestDetailQuery.verb,
  );
}

export function decide(id: number, action: DecideAction, note: string): Promise<DecideResult> {
  return call<DecideResult>(
    decideRequestQuery.getPath({ params: { id: String(id) } }),
    decideRequestQuery.verb,
    { action, note },
  );
}

export function runExpireSweep(): Promise<{ expired: AccessRequest[] }> {
  return call<{ expired: AccessRequest[] }>(expireSweepQuery.getPath(), expireSweepQuery.verb);
}

export function reseed(): Promise<{ seeded: boolean }> {
  return call<{ seeded: boolean }>(seedQuery.getPath(), seedQuery.verb);
}
