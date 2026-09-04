import type { Role } from "@/lib/api";

/**
 * The seeded demo accounts, so the app can offer one-click sign-in as each role
 * and make the RBAC story obvious. These mirror the rows created by the `seed`
 * endpoint; the password is a throwaway demo value on a disposable ephemeral.
 */
export interface DemoAccount {
  email: string;
  password: string;
  name: string;
  role: Role;
  limit: number;
  blurb: string;
}

export const DEMO_PASSWORD = "password123";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "riley.requester@northwind-bank.test",
    password: DEMO_PASSWORD,
    name: "Riley Requester",
    role: "requester",
    limit: 0,
    blurb: "Submits requests. Sees only their own, and cannot decide anything.",
  },
  {
    email: "avery.approver@northwind-bank.test",
    password: DEMO_PASSWORD,
    name: "Avery Approver",
    role: "approver",
    limit: 2,
    blurb: "Approves up to risk tier 2. A tier-3 request forces an escalate.",
  },
  {
    email: "morgan.manager@northwind-bank.test",
    password: DEMO_PASSWORD,
    name: "Morgan Manager",
    role: "approver",
    limit: 3,
    blurb: "Approves up to tier 3, and can give the required second sign-off.",
  },
  {
    email: "sam.security@northwind-bank.test",
    password: DEMO_PASSWORD,
    name: "Sam Security",
    role: "security_admin",
    limit: 3,
    blurb: "Sees every request, audits the trail, and runs the expiry sweep.",
  },
];
