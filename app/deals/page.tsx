"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import type { Stage, Commitment } from "@/lib/types";

const STAGES: Stage[] = ["discovery", "proposal", "contract", "closed_won", "onboarding", "renewal"];

const STAGE_LABELS: Record<Stage, string> = {
  discovery: "Discovery",
  proposal: "Proposal",
  contract: "Contract",
  closed_won: "Closed Won",
  onboarding: "Onboarding",
  renewal: "Renewal",
};

function flagCounts(commitments: Commitment[]) {
  const active = commitments.filter((c) => c.review !== "not_commitment");
  return {
    green: active.filter((c) => c.flag === "green").length,
    amber: active.filter((c) => c.flag === "amber").length,
    red:   active.filter((c) => c.flag === "red").length,
  };
}

function gateBlockers(commitments: Commitment[], stage: Stage): number {
  if (stage !== "proposal" && stage !== "contract") return 0;
  return commitments.filter((c) => {
    if (c.review === "not_commitment") return false;
    if (c.flag === "green") return false;
    if (c.approval === "approved" || c.approval === "adjusted") return false;
    if (c.approval === "declined" && c.walkedBack) return false;
    return true;
  }).length;
}

export default function DealsPage() {
  const deals = useStore((s) => s.deals);
  const commitments = useStore((s) => s.commitments);

  return (
    <>
      <h1 className="page-title">Pipeline</h1>
      <div className="pipeline-board">
        {STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage);
          return (
            <div key={stage} className="pipeline-col">
              <div className="pipeline-col-header">
                {STAGE_LABELS[stage]}
                {stageDeals.length > 0 && (
                  <span style={{ marginLeft: 6, color: "var(--text-subtle)" }}>
                    {stageDeals.length}
                  </span>
                )}
              </div>
              {stageDeals.map((deal) => {
                const dealCommitments = commitments.filter((c) => c.dealId === deal.id);
                const counts = flagCounts(dealCommitments);
                const blockers = gateBlockers(dealCommitments, stage);
                return (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="pipeline-card"
                  >
                    <div className="pipeline-card-account">{deal.accountName}</div>
                    <div className="pipeline-card-ae">AE: {deal.aeName}</div>
                    <div className="pipeline-card-flags">
                      {counts.green > 0 && (
                        <span className="badge badge-green">{counts.green} ✓</span>
                      )}
                      {counts.amber > 0 && (
                        <span className="badge badge-amber">{counts.amber} !</span>
                      )}
                      {counts.red > 0 && (
                        <span className="badge badge-red">{counts.red} ✗</span>
                      )}
                      {dealCommitments.length === 0 && (
                        <span className="badge badge-gray">No commitments</span>
                      )}
                    </div>
                    {blockers > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <span className="badge badge-red">
                          Gate: {blockers} blocker{blockers > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
