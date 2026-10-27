import type { Commitment, Deal, Stage } from "./types";

export const STAGES: Stage[] = ["discovery", "proposal", "contract", "closed_won", "onboarding", "renewal"];
export const stageIndex = (s: Stage) => STAGES.indexOf(s);

const isActive = (c: Commitment) => c.review !== "not_commitment";
/** v1.1: declined and walked back = no longer a promise; it doesn't need confirmation or an owner. */
export const isWithdrawn = (c: Commitment) => c.approval === "declined" && c.walkedBack;

export function isFlagResolved(c: Commitment): boolean {
  if (c.flag === "green") return true;
  if (c.approval === "approved" || c.approval === "adjusted") return true;
  if (c.approval === "declined" && c.walkedBack) return true;
  return false;
}

export interface GateResult { allowed: boolean; blockers: { commitmentId: string; reason: string }[] }

export function checkContractGate(cs: Commitment[]): GateResult {
  const blockers = cs.filter(c => isActive(c) && !isFlagResolved(c))
    .map(c => ({ commitmentId: c.id, reason: `Unresolved ${c.flag} flag: ${c.flagReason}` }));
  return { allowed: blockers.length === 0, blockers };
}

export function checkClosedWonGate(cs: Commitment[]): GateResult {
  const blockers: GateResult["blockers"] = [];
  for (const c of cs.filter((x) => isActive(x) && !isWithdrawn(x))) {
    if (c.review === "proposed") blockers.push({ commitmentId: c.id, reason: "Not yet confirmed by the deal owner." });
    if (c.review === "confirmed" && !c.ownerRole) blockers.push({ commitmentId: c.id, reason: "No owner assigned." });
    if (!isFlagResolved(c)) blockers.push({ commitmentId: c.id, reason: `Unresolved ${c.flag} flag.` });
  }
  return { allowed: blockers.length === 0, blockers };
}

/** Moving forward one stage at a time only. Gates apply when ENTERING contract and closed_won. */
export function canMove(deal: Deal, to: Stage, cs: Commitment[]): GateResult {
  if (stageIndex(to) !== stageIndex(deal.stage) + 1)
    return { allowed: false, blockers: [{ commitmentId: "", reason: "Stages move forward one step at a time." }] };
  if (to === "contract") return checkContractGate(cs);
  if (to === "closed_won") return checkClosedWonGate(cs);
  return { allowed: true, blockers: [] };
}

/** A commitment created while the deal is at contract or later is "late". */
export const isLate = (dealStage: Stage) => stageIndex(dealStage) >= stageIndex("contract");
