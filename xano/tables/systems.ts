import { table, f } from "@xanots/sdk";

/**
 * The resources someone can request access to. `risk_tier` (1..3, 3 = most
 * sensitive) is what routes a request to the matching approval rule.
 */
export const systems = table({
  name: "systems",
  schema: {
    name: f.text({ required: true }),
    key: f.text({ required: true }),
    description: f.text(),
    risk_tier: f.int({ required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "key" }] }],
});
