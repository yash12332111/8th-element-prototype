import type { Commitment, Deal, AppEvent, CommitmentType, Attribution } from "./types";
import { attribute } from "./attribution";
import { stageIndex } from "./gates";

export interface MetricRatio {
  value: number | null; // e.g. 0.833, or null if denominator is 0
  num: number;
  den: number;
  formatted: string;    // e.g. "83% (5 / 6)" or "n/a (no data)"
}

export function formatRatio(num: number, den: number): MetricRatio {
  if (den === 0) {
    return { value: null, num, den, formatted: "n/a (no data)" };
  }
  const pct = Math.round((num / den) * 100);
  return {
    value: num / den,
    num,
    den,
    formatted: `${pct}% (${num} / ${den})`,
  };
}

export function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * On-time kept-rate (North Star)
 * Scope: All deals at onboarding or renewal
 * Formula: count(confirmed && kept && evidence && keptAt <= dueDate) ÷ count(confirmed && dueDate <= today)
 */
export function calculateOnTimeKeptRate(
  deals: Deal[],
  commitments: Commitment[],
  today: string = getToday()
): MetricRatio {
  const eligibleDealIds = new Set(
    deals.filter((d) => stageIndex(d.stage) >= stageIndex("onboarding")).map((d) => d.id)
  );

  const eligibleCommitments = commitments.filter(
    (c) => eligibleDealIds.has(c.dealId) && c.review === "confirmed" && c.dueDate !== null
  );

  const dueCommitments = eligibleCommitments.filter((c) => c.dueDate! <= today);
  const den = dueCommitments.length;

  const keptOnTime = dueCommitments.filter((c) => {
    if (c.delivery !== "kept" || !c.evidence || !c.keptAt) return false;
    const keptDate = c.keptAt.slice(0, 10);
    return keptDate <= c.dueDate!;
  });
  const num = keptOnTime.length;

  return formatRatio(num, den);
}

/**
 * Account-specific On-time kept-rate
 */
export function calculateAccountKeptRate(
  dealId: string,
  commitments: Commitment[],
  today: string = getToday()
): MetricRatio {
  const accountCommitments = commitments.filter(
    (c) => c.dealId === dealId && c.review === "confirmed" && c.dueDate !== null
  );

  const dueCommitments = accountCommitments.filter((c) => c.dueDate! <= today);
  const den = dueCommitments.length;

  const keptOnTime = dueCommitments.filter((c) => {
    if (c.delivery !== "kept" || !c.evidence || !c.keptAt) return false;
    const keptDate = c.keptAt.slice(0, 10);
    return keptDate <= c.dueDate!;
  });
  const num = keptOnTime.length;

  return formatRatio(num, den);
}

/**
 * Attributed breaks breakdown (sales, delivery, customer)
 * Scope: Deals at onboarding or renewal (or specific deal if provided)
 */
export function calculateAttributedBreaks(
  deals: Deal[],
  commitments: Commitment[],
  dealIdFilter?: string
): Record<Attribution, number> {
  const eligibleDealIds = dealIdFilter
    ? new Set([dealIdFilter])
    : new Set(
        deals.filter((d) => stageIndex(d.stage) >= stageIndex("onboarding")).map((d) => d.id)
      );

  const counts: Record<Attribution, number> = {
    sales: 0,
    delivery: 0,
    customer: 0,
  };

  for (const c of commitments) {
    if (!eligibleDealIds.has(c.dealId) || c.delivery !== "broken") continue;
    const attr = attribute(c);
    if (attr) {
      counts[attr]++;
    }
  }

  return counts;
}

/**
 * Gaming signal
 * Scope: All deals
 * Formula: count(origin = ai && review = not_commitment) ÷ count(origin = ai)
 */
export function calculateGamingSignal(commitments: Commitment[]): MetricRatio {
  const aiItems = commitments.filter((c) => c.origin === "ai");
  const den = aiItems.length;
  const num = aiItems.filter((c) => c.review === "not_commitment").length;
  return formatRatio(num, den);
}

/**
 * Contract-stage resolution
 * Scope: Deals at contract or later
 * Formula: flags resolved before the deal entered contract ÷ flags created before contract
 */
export function calculateContractStageResolution(
  deals: Deal[],
  commitments: Commitment[],
  events: AppEvent[]
): MetricRatio {
  const eligibleDeals = deals.filter((d) => stageIndex(d.stage) >= stageIndex("contract"));
  const eligibleDealIds = new Set(eligibleDeals.map((d) => d.id));

  let num = 0;
  let den = 0;

  for (const deal of eligibleDeals) {
    // Find timestamp when deal moved to contract
    const contractMoveEv = events.find(
      (e) => e.dealId === deal.id && e.type === "stage_moved" && e.payload?.to === "contract"
    );
    const contractTime = contractMoveEv ? contractMoveEv.at : null;

    const dealFlags = commitments.filter(
      (c) =>
        c.dealId === deal.id &&
        c.review !== "not_commitment" &&
        (c.flag === "amber" || c.flag === "red") &&
        (!c.late || c.createdAtStage === "discovery" || c.createdAtStage === "proposal")
    );

    for (const c of dealFlags) {
      den++;
      // Check if resolution happened before contractTime
      if (contractTime) {
        const resolveEv = events.find(
          (e) =>
            e.commitmentId === c.id &&
            (e.type === "approval_set" || e.type === "walked_back") &&
            e.at <= contractTime
        );
        if (resolveEv || c.approval === "approved" || c.approval === "adjusted" || (c.approval === "declined" && c.walkedBack)) {
          num++;
        }
      } else {
        // If contract move timestamp is not in events (e.g. historical seed without exact move timestamp),
        // check if currently resolved and not late
        if (c.approval === "approved" || c.approval === "adjusted" || (c.approval === "declined" && c.walkedBack)) {
          num++;
        }
      }
    }
  }

  return formatRatio(num, den);
}

/**
 * Kickoff surprises
 * Scope: count(origin = off_record) ÷ number of deals at onboarding or later
 */
export function calculateKickoffSurprises(deals: Deal[], commitments: Commitment[]): MetricRatio {
  const onboardingDeals = deals.filter((d) => stageIndex(d.stage) >= stageIndex("onboarding"));
  const den = onboardingDeals.length;
  const num = commitments.filter((c) => c.origin === "off_record").length;
  return formatRatio(num, den);
}

/**
 * Kept-rate by commitment type
 * Scope: All deals at onboarding or renewal
 */
export function calculateKeptRateByType(
  deals: Deal[],
  commitments: Commitment[],
  today: string = getToday()
): Record<CommitmentType, MetricRatio> {
  const eligibleDealIds = new Set(
    deals.filter((d) => stageIndex(d.stage) >= stageIndex("onboarding")).map((d) => d.id)
  );

  const types: CommitmentType[] = [
    "integration",
    "data_migration",
    "configuration",
    "timeline",
    "training",
    "support",
    "product_capability",
    "commercial",
    "other",
  ];

  const result: Partial<Record<CommitmentType, MetricRatio>> = {};

  for (const type of types) {
    const typeCommitments = commitments.filter(
      (c) =>
        eligibleDealIds.has(c.dealId) &&
        c.type === type &&
        c.review === "confirmed" &&
        c.dueDate !== null
    );

    const due = typeCommitments.filter((c) => c.dueDate! <= today);
    const den = due.length;
    const kept = due.filter((c) => {
      if (c.delivery !== "kept" || !c.evidence || !c.keptAt) return false;
      return c.keptAt.slice(0, 10) <= c.dueDate!;
    }).length;

    result[type] = formatRatio(kept, den);
  }

  return result as Record<CommitmentType, MetricRatio>;
}
