"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { calculateAccountKeptRate } from "@/lib/metrics";
import { attribute } from "@/lib/attribution";

export default function AccountsPage() {
  const deals = useStore((s) => s.deals);
  const commitments = useStore((s) => s.commitments);

  const totalArr = deals.reduce((sum, d) => sum + d.arrUsd, 0);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Accounts</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Monitor portfolio health, renewal risk, promise delivery rates, and broken commitment attribution.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div className="card" style={{ padding: "10px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Portfolio ARR</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>${totalArr.toLocaleString()}</div>
          </div>
          <div className="card" style={{ padding: "10px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Accounts Tracked</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>{deals.length}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {deals.map((deal) => {
          const dealCommitments = commitments.filter((c) => c.dealId === deal.id);
          const brokenCommitments = dealCommitments.filter((c) => c.delivery === "broken");
          const isAtRisk = brokenCommitments.length > 0;
          const keptRate = calculateAccountKeptRate(deal.id, commitments);

          const salesBreaks = brokenCommitments.filter((c) => attribute(c) === "sales").length;
          const deliveryBreaks = brokenCommitments.filter((c) => attribute(c) === "delivery").length;
          const customerBreaks = brokenCommitments.filter((c) => attribute(c) === "customer").length;

          return (
            <div
              key={deal.id}
              className="card"
              style={{
                borderLeft: isAtRisk ? "4px solid var(--red)" : "4px solid var(--green)",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <Link
                      href={`/accounts/${deal.id}`}
                      style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}
                    >
                      {deal.accountName}
                    </Link>
                    {isAtRisk ? (
                      <span className="badge badge-red">AT RISK ({brokenCommitments.length} broken)</span>
                    ) : (
                      <span className="badge badge-green">HEALTHY</span>
                    )}
                    <span className="badge badge-blue" style={{ textTransform: "capitalize" }}>
                      {deal.stage.replace("_", " ")}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>AE: {deal.aeName}</span>
                    <span>·</span>
                    <span>Impl: {deal.implementationLead}</span>
                    <span>·</span>
                    <span>CSM: {deal.csmName}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>ARR</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>${deal.arrUsd.toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Renewal Date</div>
                    <div style={{ fontSize: 14, fontFamily: "monospace" }}>
                      {deal.renewalDate || "Not scheduled"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Stats Strip */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  padding: "12px 16px",
                  background: "var(--bg-surface)",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border-muted)",
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>On-Time Kept Rate</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: keptRate.value !== null ? "var(--accent)" : "var(--text-muted)" }}>
                    {keptRate.formatted}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Confirmed Promises</div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    {dealCommitments.filter((c) => c.review === "confirmed").length}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Attributed Breaks</div>
                  <div style={{ fontSize: 12, display: "flex", gap: 8, marginTop: 2 }}>
                    <span style={{ color: "var(--red)" }}>Sales: {salesBreaks}</span>
                    <span>·</span>
                    <span style={{ color: "var(--accent)" }}>Delivery: {deliveryBreaks}</span>
                    <span>·</span>
                    <span style={{ color: "#d2a8ff" }}>Customer: {customerBreaks}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, alignItems: "center" }}>
                <Link
                  href={`/deals/${deal.id}`}
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: "5px 12px" }}
                >
                  Deal Workspace
                </Link>
                <Link
                  href={`/accounts/${deal.id}`}
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: "5px 14px" }}
                >
                  View Renewal &amp; Attribution →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
