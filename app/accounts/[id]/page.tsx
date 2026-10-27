"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { calculateAccountKeptRate } from "@/lib/metrics";
import { attribute, ATTRIBUTION_REASON } from "@/lib/attribution";
import type { Commitment, Stage } from "@/lib/types";

const STAGE_LABELS: Record<Stage, string> = {
  discovery: "Discovery",
  proposal: "Proposal",
  contract: "Contract",
  closed_won: "Closed Won",
  onboarding: "Onboarding",
  renewal: "Renewal",
};

export default function AccountDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const deal = useStore((s) => s.deals.find((d) => d.id === id || d.accountId === id));
  const commitments = useStore((s) => s.commitments);
  const [filterBrokenOnly, setFilterBrokenOnly] = useState(false);

  if (!deal) {
    return (
      <div style={{ padding: 40, color: "var(--text-muted)" }}>
        Account not found. <Link href="/accounts">Return to accounts</Link>
      </div>
    );
  }

  const accountCommitments = commitments.filter(
    (c) => c.dealId === deal.id && c.review === "confirmed"
  );
  const brokenCommitments = accountCommitments.filter((c) => c.delivery === "broken");
  const isAtRisk = brokenCommitments.length > 0;

  const keptRate = calculateAccountKeptRate(deal.id, commitments);

  const salesBreaks = brokenCommitments.filter((c) => attribute(c) === "sales");
  const deliveryBreaks = brokenCommitments.filter((c) => attribute(c) === "delivery");
  const customerBreaks = brokenCommitments.filter((c) => attribute(c) === "customer");

  const displayedCommitments = filterBrokenOnly ? brokenCommitments : accountCommitments;

  function getWhyRuleExplanation(c: Commitment): string {
    const attr = attribute(c);
    if (!attr) return "";
    if (c.origin === "off_record") {
      return "Made off-record (never captured in approved contract scope); automatically attributed to Sales.";
    }
    if (c.breakCause === "customer_dependency" && c.customerDependency) {
      return `Attributed to Customer: broke because customer missed recorded dependency "${c.customerDependency.text}".`;
    }
    if (c.late && (c.flag === "amber" || c.flag === "red")) {
      return "Attributed to Sales: promised after proposal stage against an active risk flag.";
    }
    if (c.flag === "amber" || c.flag === "red") {
      if (c.approval !== "approved" && c.approval !== "adjusted") {
        return "Attributed to Sales: promised against an unapproved risk flag.";
      }
    }
    if (c.breakCause === "vendor") {
      return "Attributed to Delivery: safe or approved promise that broke for an internal vendor reason.";
    }
    return ATTRIBUTION_REASON[attr];
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Back button */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/accounts" style={{ fontSize: 13, color: "var(--text-muted)" }}>
          ← Back to Accounts
        </Link>
      </div>

      {/* Account Header */}
      <div
        className="card"
        style={{
          padding: "24px 28px",
          marginBottom: 24,
          borderLeft: isAtRisk ? "5px solid var(--red)" : "5px solid var(--green)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>
                {deal.accountName}
              </h1>
              {isAtRisk ? (
                <span className="badge badge-red" style={{ fontSize: 12, padding: "3px 10px" }}>
                  AT RISK
                </span>
              ) : (
                <span className="badge badge-green" style={{ fontSize: 12, padding: "3px 10px" }}>
                  HEALTHY
                </span>
              )}
              <span className="badge badge-blue">
                {STAGE_LABELS[deal.stage]} Stage
              </span>
            </div>

            <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 14, flexWrap: "wrap" }}>
              <span>AE: <strong style={{ color: "var(--text)" }}>{deal.aeName}</strong></span>
              <span>·</span>
              <span>Implementation: <strong style={{ color: "var(--text)" }}>{deal.implementationLead}</strong></span>
              <span>·</span>
              <span>CSM: <strong style={{ color: "var(--text)" }}>{deal.csmName}</strong></span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Synthetic ARR</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>
                ${deal.arrUsd.toLocaleString()}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Renewal Date</div>
              <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "monospace", color: "var(--accent)" }}>
                {deal.renewalDate || "Not scheduled"}
              </div>
            </div>

            <Link href={`/deals/${deal.id}`} className="btn btn-secondary" style={{ fontSize: 12 }}>
              Deal Workspace ↗
            </Link>
          </div>
        </div>
      </div>

      {/* Account Kept Rate Card */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 28, background: "linear-gradient(180deg, var(--bg-card), var(--bg-surface))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="metric-card-title">Account On-Time Kept Rate</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: keptRate.value !== null ? "var(--accent)" : "var(--text-muted)", margin: "4px 0" }}>
              {keptRate.formatted}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {keptRate.num} on-time kept with evidence out of {keptRate.den} commitments due by today
            </div>
          </div>

          <div style={{ maxWidth: 440, fontSize: 11, color: "var(--text-subtle)", borderLeft: "2px solid var(--border)", paddingLeft: 16, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 600, color: "var(--text-muted)", marginBottom: 2 }}>Exact Formula:</div>
            <code>count(confirmed &amp; kept &amp; evidence ≠ null &amp; keptAt ≤ dueDate) ÷ count(confirmed &amp; dueDate ≤ today)</code>
          </div>
        </div>
      </div>

      {/* Attribution Summary (Moment 3 Showcase) */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>
            Attribution Summary for Broken Commitments
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Every broken promise is objectively classified using three-way attribution rules to eliminate finger-pointing between teams.
          </p>
        </div>

        <div className="attribution-summary-grid">
          {/* Sales Breaks */}
          <div
            className="attribution-card"
            style={{ borderTop: "3px solid var(--red)" }}
          >
            <div className="attribution-card-header">
              <span className="badge chip-sales" style={{ fontSize: 12 }}>
                SALES BREAKS
              </span>
              <span className="attribution-card-count" style={{ color: "var(--red)" }}>
                {salesBreaks.length}
              </span>
            </div>
            <div className="attribution-card-reason">
              <strong>Rule:</strong> {ATTRIBUTION_REASON.sales}
            </div>
            {salesBreaks.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border-muted)", fontSize: 12, color: "var(--text-muted)" }}>
                {salesBreaks.map((c) => (
                  <div key={c.id} style={{ marginBottom: 4 }}>
                    • {c.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delivery Breaks */}
          <div
            className="attribution-card"
            style={{ borderTop: "3px solid var(--accent)" }}
          >
            <div className="attribution-card-header">
              <span className="badge chip-delivery" style={{ fontSize: 12 }}>
                DELIVERY BREAKS
              </span>
              <span className="attribution-card-count" style={{ color: "var(--accent)" }}>
                {deliveryBreaks.length}
              </span>
            </div>
            <div className="attribution-card-reason">
              <strong>Rule:</strong> {ATTRIBUTION_REASON.delivery}
            </div>
            {deliveryBreaks.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border-muted)", fontSize: 12, color: "var(--text-muted)" }}>
                {deliveryBreaks.map((c) => (
                  <div key={c.id} style={{ marginBottom: 4 }}>
                    • {c.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Breaks */}
          <div
            className="attribution-card"
            style={{ borderTop: "3px solid #6e40c9" }}
          >
            <div className="attribution-card-header">
              <span className="badge chip-customer" style={{ fontSize: 12 }}>
                CUSTOMER BREAKS
              </span>
              <span className="attribution-card-count" style={{ color: "#d2a8ff" }}>
                {customerBreaks.length}
              </span>
            </div>
            <div className="attribution-card-reason">
              <strong>Rule:</strong> {ATTRIBUTION_REASON.customer}
            </div>
            {customerBreaks.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border-muted)", fontSize: 12, color: "var(--text-muted)" }}>
                {customerBreaks.map((c) => (
                  <div key={c.id} style={{ marginBottom: 4 }}>
                    • {c.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Commitment Table */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>
              Commitments &amp; Delivery Log
            </h2>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Showing {displayedCommitments.length} commitments
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`btn btn-sm ${!filterBrokenOnly ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterBrokenOnly(false)}
            >
              All Commitments ({accountCommitments.length})
            </button>
            <button
              className={`btn btn-sm ${filterBrokenOnly ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterBrokenOnly(true)}
            >
              Broken Only ({brokenCommitments.length})
            </button>
          </div>
        </div>

        {displayedCommitments.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            No commitments match the selected filter.
          </div>
        ) : (
          <div className="delivery-table-container">
            <table className="delivery-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Commitment</th>
                  <th style={{ minWidth: 100 }}>Owner</th>
                  <th style={{ minWidth: 95 }}>Due Date</th>
                  <th style={{ minWidth: 95 }}>Status</th>
                  <th style={{ minWidth: 150 }}>Evidence / Verification</th>
                  <th style={{ minWidth: 260 }}>Attribution &amp; Rule Fired ("Why")</th>
                </tr>
              </thead>
              <tbody>
                {displayedCommitments.map((c) => {
                  const attr = attribute(c);
                  const whyRule = getWhyRuleExplanation(c);

                  return (
                    <tr key={c.id}>
                      {/* Commitment */}
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                          {c.text}
                        </div>
                        {c.quote && (
                          <div style={{ fontSize: 11, color: "var(--text-subtle)", fontStyle: "italic", marginBottom: 6 }}>
                            &ldquo;{c.quote}&rdquo;
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <span className="badge badge-gray">{c.type}</span>
                          {c.origin === "off_record" && (
                            <span className="badge badge-amber">off-record</span>
                          )}
                          {c.late && (
                            <span className="badge badge-amber">late</span>
                          )}
                        </div>
                      </td>

                      {/* Owner */}
                      <td>
                        {c.ownerName ? (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>{c.ownerName}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "capitalize" }}>
                              {c.ownerRole}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-subtle)", fontSize: 12 }}>Unassigned</span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td>
                        {c.dueDate ? (
                          <div style={{ fontFamily: "monospace", fontSize: 12 }}>{c.dueDate}</div>
                        ) : (
                          <span style={{ color: "var(--text-subtle)", fontSize: 12 }}>TBD</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`delivery-status-chip delivery-${c.delivery}`}>
                          {c.delivery === "kept"
                            ? "✓ Kept"
                            : c.delivery === "broken"
                            ? "✕ Broken"
                            : c.delivery.replace("_", " ")}
                        </span>
                      </td>

                      {/* Evidence */}
                      <td>
                        {c.evidence ? (
                          <div>
                            {c.evidence.kind === "task_link" ? (
                              <a
                                href={c.evidence.reference}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "var(--accent)", fontSize: 12, wordBreak: "break-all" }}
                              >
                                🔗 {c.evidence.reference}
                              </a>
                            ) : (
                              <div style={{ fontSize: 12 }}>💬 {c.evidence.reference}</div>
                            )}
                            {c.csmVerified && (
                              <div style={{ marginTop: 4 }}>
                                <span className="badge badge-green" style={{ fontSize: 10 }}>
                                  ✓ CSM Verified
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-subtle)", fontSize: 12 }}>None</span>
                        )}
                      </td>

                      {/* Attribution & Why */}
                      <td>
                        {c.delivery === "broken" && attr ? (
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span
                                className={`badge chip-${attr}`}
                                style={{ cursor: "help" }}
                                title={ATTRIBUTION_REASON[attr]}
                              >
                                {attr.toUpperCase()} BREAK
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--text-muted)",
                                background: "var(--bg-surface)",
                                padding: "6px 8px",
                                borderRadius: "var(--radius)",
                                border: "1px solid var(--border-muted)",
                                marginTop: 4,
                                lineHeight: 1.4,
                              }}
                              title={ATTRIBUTION_REASON[attr]}
                            >
                              <strong style={{ color: "var(--text)" }}>Why: </strong>
                              {whyRule}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-subtle)", fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
