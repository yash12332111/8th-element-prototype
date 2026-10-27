"use client";

import { useStore } from "@/lib/store";
import {
  calculateOnTimeKeptRate,
  calculateContractStageResolution,
  calculateKickoffSurprises,
  calculateGamingSignal,
  calculateAttributedBreaks,
  calculateKeptRateByType,
} from "@/lib/metrics";
import { ATTRIBUTION_REASON } from "@/lib/attribution";
import type { CommitmentType } from "@/lib/types";

const TYPE_LABELS: Record<CommitmentType, string> = {
  integration: "Integration",
  data_migration: "Data Migration",
  configuration: "Configuration",
  timeline: "Timeline & Go-Live",
  training: "Training",
  support: "Support SLA",
  product_capability: "Product Capability",
  commercial: "Commercial Terms",
  other: "Other",
};

export default function DashboardPage() {
  const deals = useStore((s) => s.deals);
  const commitments = useStore((s) => s.commitments);
  const events = useStore((s) => s.events);

  const onTimeRate = calculateOnTimeKeptRate(deals, commitments);
  const contractRes = calculateContractStageResolution(deals, commitments, events);
  const kickoffSurprises = calculateKickoffSurprises(deals, commitments);
  const gamingSignal = calculateGamingSignal(commitments);

  const attributedBreaks = calculateAttributedBreaks(deals, commitments);
  const totalBreaks = attributedBreaks.sales + attributedBreaks.delivery + attributedBreaks.customer;

  const keptByType = calculateKeptRateByType(deals, commitments);
  const typesList = Object.keys(TYPE_LABELS) as CommitmentType[];

  return (
    <div style={{ maxWidth: 1150, margin: "0 auto", paddingBottom: 40 }}>
      {/* Page Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 4 }}>
          Executive Dashboard &amp; Promise Intelligence
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          System-wide integrity metrics measuring customer promise fulfillment, early flag resolution, and delivery attribution.
        </p>
      </div>

      {/* 4 Core Metric Cards (Section 7.5) */}
      <div className="metrics-grid-4">
        {/* Metric 1: On-Time Kept-Rate (North Star) */}
        <div className="metric-card" style={{ borderTop: "3px solid var(--green)" }}>
          <div>
            <div className="metric-card-title">On-Time Kept-Rate (North Star)</div>
            <div className="metric-card-value" style={{ color: onTimeRate.value !== null ? "var(--green)" : "var(--text-muted)" }}>
              {onTimeRate.formatted}
            </div>
            <div className="metric-card-sub">
              {onTimeRate.den > 0
                ? `${onTimeRate.num} on-time kept / ${onTimeRate.den} due by today`
                : "No commitments due yet"}
            </div>
          </div>
          <div className="metric-card-formula">
            count(confirmed &amp; kept &amp; evidence &amp; keptAt ≤ dueDate) ÷ count(confirmed &amp; dueDate ≤ today)
          </div>
        </div>

        {/* Metric 2: Contract-Stage Resolution */}
        <div className="metric-card" style={{ borderTop: "3px solid var(--accent)" }}>
          <div>
            <div className="metric-card-title">Contract-Stage Resolution</div>
            <div className="metric-card-value" style={{ color: contractRes.value !== null ? "var(--accent)" : "var(--text-muted)" }}>
              {contractRes.formatted}
            </div>
            <div className="metric-card-sub">
              {contractRes.den > 0
                ? `${contractRes.num} resolved pre-contract / ${contractRes.den} pre-contract flags`
                : "No flags created before contract"}
            </div>
          </div>
          <div className="metric-card-formula">
            flags resolved before deal entered contract ÷ flags created before contract
          </div>
        </div>

        {/* Metric 3: Kickoff Surprises */}
        <div className="metric-card" style={{ borderTop: "3px solid var(--amber)" }}>
          <div>
            <div className="metric-card-title">Kickoff Surprises</div>
            <div className="metric-card-value" style={{ color: kickoffSurprises.value !== null ? "var(--amber)" : "var(--text-muted)" }}>
              {kickoffSurprises.formatted}
            </div>
            <div className="metric-card-sub">
              {kickoffSurprises.den > 0
                ? `${kickoffSurprises.num} off-record promises / ${kickoffSurprises.den} active onboarding deals`
                : "No onboarding deals"}
            </div>
          </div>
          <div className="metric-card-formula">
            count(origin = off_record) ÷ number of deals at onboarding or later
          </div>
        </div>

        {/* Metric 4: Gaming Signal */}
        <div className="metric-card" style={{ borderTop: "3px solid #b392f0" }}>
          <div>
            <div className="metric-card-title">Gaming Signal</div>
            <div className="metric-card-value" style={{ color: gamingSignal.value !== null ? "#b392f0" : "var(--text-muted)" }}>
              {gamingSignal.formatted}
            </div>
            <div className="metric-card-sub">
              {gamingSignal.den > 0
                ? `${gamingSignal.num} dismissed / ${gamingSignal.den} total AI candidates`
                : "No AI candidates captured"}
            </div>
          </div>
          <div className="metric-card-formula">
            count(origin = ai &amp; review = not_commitment) ÷ count(origin = ai)
          </div>
        </div>
      </div>

      {/* Attributed Breaks Section */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>
            Attributed Breaks Breakdown
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Objective attribution of broken commitments across active onboarding and renewal deals ({totalBreaks} total broken).
          </p>
        </div>

        <div className="attribution-summary-grid">
          {/* Sales Breaks */}
          <div className="attribution-card" style={{ borderLeft: "4px solid var(--red)" }}>
            <div className="attribution-card-header">
              <span className="badge chip-sales" style={{ fontSize: 12 }}>
                SALES ATTRIBUTED
              </span>
              <span className="attribution-card-count" style={{ color: "var(--red)" }}>
                {attributedBreaks.sales}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-subtle)", marginBottom: 6 }}>
              {totalBreaks > 0
                ? `${Math.round((attributedBreaks.sales / totalBreaks) * 100)}% of broken promises`
                : "0% of broken promises"}
            </div>
            <div className="attribution-card-reason">
              {ATTRIBUTION_REASON.sales}
            </div>
          </div>

          {/* Delivery Breaks */}
          <div className="attribution-card" style={{ borderLeft: "4px solid var(--accent)" }}>
            <div className="attribution-card-header">
              <span className="badge chip-delivery" style={{ fontSize: 12 }}>
                DELIVERY ATTRIBUTED
              </span>
              <span className="attribution-card-count" style={{ color: "var(--accent)" }}>
                {attributedBreaks.delivery}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-subtle)", marginBottom: 6 }}>
              {totalBreaks > 0
                ? `${Math.round((attributedBreaks.delivery / totalBreaks) * 100)}% of broken promises`
                : "0% of broken promises"}
            </div>
            <div className="attribution-card-reason">
              {ATTRIBUTION_REASON.delivery}
            </div>
          </div>

          {/* Customer Breaks */}
          <div className="attribution-card" style={{ borderLeft: "4px solid #6e40c9" }}>
            <div className="attribution-card-header">
              <span className="badge chip-customer" style={{ fontSize: 12 }}>
                CUSTOMER ATTRIBUTED
              </span>
              <span className="attribution-card-count" style={{ color: "#d2a8ff" }}>
                {attributedBreaks.customer}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-subtle)", marginBottom: 6 }}>
              {totalBreaks > 0
                ? `${Math.round((attributedBreaks.customer / totalBreaks) * 100)}% of broken promises`
                : "0% of broken promises"}
            </div>
            <div className="attribution-card-reason">
              {ATTRIBUTION_REASON.customer}
            </div>
          </div>
        </div>
      </div>

      {/* Kept-Rate by Commitment Type */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>
            Kept-Rate by Commitment Type
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Granular on-time performance breakdown by promise category across onboarding and renewal accounts.
          </p>
        </div>

        <div className="delivery-table-container">
          <table className="delivery-table">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Commitment Type</th>
                <th style={{ minWidth: 160 }}>On-Time Kept Rate</th>
                <th style={{ minWidth: 120 }}>On-Time Kept</th>
                <th style={{ minWidth: 120 }}>Total Due</th>
                <th style={{ minWidth: 160 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {typesList.map((type) => {
                const ratio = keptByType[type];
                return (
                  <tr key={type}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>
                        {TYPE_LABELS[type]}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-subtle)", fontFamily: "monospace" }}>
                        {type}
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: ratio.value !== null ? "var(--accent)" : "var(--text-muted)",
                        }}
                      >
                        {ratio.formatted}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: 13 }}>{ratio.num}</span>
                    </td>

                    <td>
                      <span style={{ fontSize: 13 }}>{ratio.den}</span>
                    </td>

                    <td>
                      {ratio.den === 0 ? (
                        <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>No commitments due</span>
                      ) : ratio.value === 1 ? (
                        <span className="badge badge-green">100% Kept</span>
                      ) : ratio.value !== null && ratio.value >= 0.7 ? (
                        <span className="badge badge-blue">On Track</span>
                      ) : (
                        <span className="badge badge-amber">At Risk</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer (Section 7.5 Requirement) */}
      <div
        style={{
          textAlign: "center",
          padding: "20px 0",
          borderTop: "1px solid var(--border-muted)",
          color: "var(--text-subtle)",
          fontSize: 12,
        }}
      >
        Synthetic demo data; formulas match the deck&apos;s metrics slide.
      </div>
    </div>
  );
}
