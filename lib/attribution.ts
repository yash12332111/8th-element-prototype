import type { Commitment, Attribution } from "./types";

export function attribute(c: Commitment): Attribution | null {
  if (c.delivery !== "broken") return null;
  if (c.breakCause === "customer_dependency" && c.customerDependency) return "customer";
  const flagged = c.flag === "amber" || c.flag === "red";
  const unapprovedFlag = flagged && !(c.approval === "approved" || c.approval === "adjusted");
  const lateFlag = c.late && flagged;
  if (c.origin === "off_record" || lateFlag || unapprovedFlag) return "sales";
  return "delivery";
}

export const ATTRIBUTION_REASON: Record<Attribution, string> = {
  sales: "Made against an unapproved or late flag, or never recorded (off-record).",
  delivery: "Safe or approved promise that broke for a vendor-side reason.",
  customer: "Broke because the customer missed a recorded dependency.",
};
