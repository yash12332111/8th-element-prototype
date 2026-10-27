"use client";

import { useStore } from "@/lib/store";
import { useState } from "react";
import Link from "next/link";
import catalogData from "@/data/catalog.json";
import type { CatalogItem, Commitment } from "@/lib/types";

export default function ApprovalsPage() {
  const role = useStore((s) => s.role);
  const commitments = useStore((s) => s.commitments);
  const deals = useStore((s) => s.deals);
  const setApproval = useStore((s) => s.setApproval);

  const isImpl = role === "implementation" || role === "vp_cs";

  // Pending amber and red items that are not withdrawn or marked not_commitment
  const pendingApprovals = commitments.filter(
    (c) =>
      c.review !== "not_commitment" &&
      (c.flag === "amber" || c.flag === "red") &&
      c.approval === "pending"
  );

  const resolvedApprovals = commitments.filter(
    (c) =>
      c.review !== "not_commitment" &&
      (c.flag === "amber" || c.flag === "red") &&
      c.approval !== "pending"
  );

  // Modals for actions
  const [approveModal, setApproveModal] = useState<{
    commitment: Commitment;
    note: string;
  } | null>(null);

  const [adjustModal, setAdjustModal] = useState<{
    commitment: Commitment;
    text: string;
    dueDays: number | null;
    note: string;
  } | null>(null);

  const [declineModal, setDeclineModal] = useState<{
    commitment: Commitment;
    note: string;
  } | null>(null);

  const catalog = catalogData as CatalogItem[];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Implementation Approval Queue</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Review flagged commitments before contract gate. Standardize scopes, grant formal exceptions, or decline unfulfillable promises.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <span className="badge badge-amber">{pendingApprovals.filter(c => c.flag === "amber").length} Pending Amber</span>
          <span className="badge badge-red">{pendingApprovals.filter(c => c.flag === "red").length} Pending Red</span>
        </div>
      </div>

      {!isImpl && (
        <div style={{
          background: "var(--amber-bg)",
          border: "1px solid var(--amber-border)",
          borderRadius: "var(--radius)",
          padding: "10px 14px",
          color: "var(--amber)",
          fontSize: 12,
          marginBottom: 20,
        }}>
          🔒 You are viewing as <strong>{role.toUpperCase()}</strong>. Switch to <strong>Implementation Lead</strong> using the role switcher in the header to approve, adjust, or decline promises.
        </div>
      )}

      {pendingApprovals.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
          <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>Approval queue is clear</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            All amber and red flags have been approved, adjusted, or declined.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {pendingApprovals.map((c) => {
            const deal = deals.find((d) => d.id === c.dealId);
            const catalogItem = c.catalogItemId ? catalog.find((item) => item.id === c.catalogItemId) : undefined;
            const isRed = c.flag === "red";

            return (
              <div
                key={c.id}
                className="card"
                style={{
                  borderLeft: isRed ? "4px solid var(--red)" : "4px solid var(--amber)",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={`badge badge-${c.flag}`}>
                      {c.flag.toUpperCase()}
                    </span>
                    <span className="badge badge-gray">{c.type.replace(/_/g, " ")}</span>
                    <Link
                      href={`/deals/${c.dealId}`}
                      style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}
                    >
                      {deal?.accountName ?? c.dealId} ↗
                    </Link>
                    <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                      AE: {deal?.aeName}
                    </span>
                  </div>

                  <span className="badge badge-amber" style={{ fontSize: 10 }}>
                    APPROVAL PENDING
                  </span>
                </div>

                {/* Summary */}
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
                  {c.text}
                </div>

                {/* Quote Box */}
                {c.quote && (
                  <div className="quote-box" style={{ marginBottom: 10 }}>
                    "{c.quote}"
                    <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 4, fontStyle: "normal" }}>
                      — {c.speakerId ?? "Speaker"} · line {c.lineId ?? "?"} · {c.timestamp ?? ""}
                    </div>
                  </div>
                )}

                {/* Flag Reason */}
                <div style={{
                  fontSize: 12,
                  color: isRed ? "var(--red)" : "var(--amber)",
                  marginBottom: 10,
                  fontWeight: 500,
                }}>
                  Rule violation: {c.flagReason}
                </div>

                {/* Catalog & Lead time comparison */}
                <div style={{
                  background: "var(--bg-hover)",
                  padding: "8px 12px",
                  borderRadius: "var(--radius)",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 14,
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                }}>
                  {catalogItem ? (
                    <>
                      <span>Catalog Item: <strong>{catalogItem.name}</strong></span>
                      <span>Offered: <strong>{catalogItem.offered ? "Yes" : "No"}</strong></span>
                      <span>Standard: <strong>{catalogItem.standard ? "Yes" : "No"}</strong></span>
                      {catalogItem.leadTimeDays !== null && (
                        <span>Standard Lead Time: <strong>{catalogItem.leadTimeDays} days</strong></span>
                      )}
                    </>
                  ) : (
                    <span>Not listed in Catalog (Can-Commit list)</span>
                  )}
                  {c.dueDays !== null && (
                    <span style={{ color: "var(--text)" }}>Promised Lead Time: <strong>{c.dueDays} days</strong></span>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 10, borderTop: "1px solid var(--border-muted)", paddingTop: 12 }}>
                  <button
                    className="btn btn-primary"
                    disabled={!isImpl}
                    title={!isImpl ? "Switch to Implementation Lead to approve" : undefined}
                    onClick={() => setApproveModal({ commitment: c, note: "" })}
                  >
                    ✓ Approve {isRed ? "(Exception note required)" : ""}
                  </button>

                  <button
                    className="btn btn-secondary"
                    disabled={!isImpl}
                    title={!isImpl ? "Switch to Implementation Lead to adjust" : undefined}
                    onClick={() =>
                      setAdjustModal({
                        commitment: c,
                        text: c.text,
                        dueDays: catalogItem?.leadTimeDays ?? c.dueDays,
                        note: "",
                      })
                    }
                  >
                    ✎ Adjust Scope / Timeline
                  </button>

                  <button
                    className="btn btn-danger"
                    disabled={!isImpl}
                    title={!isImpl ? "Switch to Implementation Lead to decline" : undefined}
                    onClick={() => setDeclineModal({ commitment: c, note: "" })}
                  >
                    ✕ Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolved Approvals Table */}
      {resolvedApprovals.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "var(--text-muted)" }}>
            Resolved Decisions ({resolvedApprovals.length})
          </h2>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--bg-hover)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "10px 14px" }}>Flag</th>
                  <th style={{ padding: "10px 14px" }}>Deal</th>
                  <th style={{ padding: "10px 14px" }}>Commitment</th>
                  <th style={{ padding: "10px 14px" }}>Decision</th>
                  <th style={{ padding: "10px 14px" }}>Decision Note</th>
                  <th style={{ padding: "10px 14px" }}>Walk-back status</th>
                </tr>
              </thead>
              <tbody>
                {resolvedApprovals.map((c) => {
                  const deal = deals.find((d) => d.id === c.dealId);
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--border-muted)" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <span className={`badge badge-${c.flag}`}>{c.flag.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <Link href={`/deals/${c.dealId}`}>{deal?.accountName ?? c.dealId}</Link>
                      </td>
                      <td style={{ padding: "10px 14px", maxWidth: 280, fontWeight: 500 }}>
                        {c.text}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span className={`badge ${
                          c.approval === "approved"
                            ? "badge-green"
                            : c.approval === "adjusted"
                            ? "badge-blue"
                            : "badge-red"
                        }`}>
                          {c.approval.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "var(--text-muted)" }}>
                        {c.approvalNote || "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {c.approval === "declined" ? (
                          c.walkedBack ? (
                            <span style={{ color: "var(--green)" }}>✓ Walked back</span>
                          ) : (
                            <span style={{ color: "var(--red)", fontWeight: 600 }}>⚠️ Walk-back required</span>
                          )
                        ) : (
                          <span style={{ color: "var(--text-subtle)" }}>n/a</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <div className="modal-backdrop" onClick={() => setApproveModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              Approve Commitment ({approveModal.commitment.flag.toUpperCase()})
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              {approveModal.commitment.flag === "red" ? (
                <span style={{ color: "var(--red)" }}>
                  ⚠️ This is a <strong>RED (not offered)</strong> item. An exception justification note is strictly mandatory to grant approval.
                </span>
              ) : (
                "Grant implementation approval for this commitment to satisfy the contract checkpoint."
              )}
            </div>

            <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {approveModal.commitment.flag === "red" ? "Exception Note (Required):" : "Approval Note (Optional):"}
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder={
                approveModal.commitment.flag === "red"
                  ? "e.g. Approved exception by VP Engineering for strategic account; custom adapter budgeted in Q4"
                  : "e.g. Approved; resourced with team delta"
              }
              value={approveModal.note}
              onChange={(e) => setApproveModal({ ...approveModal, note: e.target.value })}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setApproveModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={
                  approveModal.commitment.flag === "red" && approveModal.note.trim().length === 0
                }
                onClick={() => {
                  setApproval(
                    approveModal.commitment.id,
                    "approved",
                    approveModal.note.trim() || undefined
                  );
                  setApproveModal(null);
                }}
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="modal-backdrop" onClick={() => setAdjustModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              Adjust Commitment Scope / Timeline
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
              Modify promised timeline or scope to bring within delivery guidelines. This creates an adjusted version.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Adjusted Scope Text</label>
                <input
                  className="input-field"
                  value={adjustModal.text}
                  onChange={(e) => setAdjustModal({ ...adjustModal, text: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Adjusted Due Days (from signature)</label>
                <input
                  type="number"
                  className="input-field"
                  value={adjustModal.dueDays ?? ""}
                  placeholder="e.g. 30"
                  onChange={(e) =>
                    setAdjustModal({
                      ...adjustModal,
                      dueDays: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Adjustment Note</label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="e.g. Adjusted timeline from 21 days to standard 30-day template SLA"
                  value={adjustModal.note}
                  onChange={(e) => setAdjustModal({ ...adjustModal, note: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setAdjustModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setApproval(
                    adjustModal.commitment.id,
                    "adjusted",
                    adjustModal.note,
                    {
                      text: adjustModal.text,
                      dueDays: adjustModal.dueDays,
                    }
                  );
                  setAdjustModal(null);
                }}
              >
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {declineModal && (
        <div className="modal-backdrop" onClick={() => setDeclineModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--red)" }}>
              Decline Commitment
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Declining requires an explanation note. The AE will be notified that a <strong>walk-back is required</strong> with the customer.
            </div>

            <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Decline Reason Note (Required):</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="e.g. We do not support custom ERP adapters. The customer must use standard CSV imports."
              value={declineModal.note}
              onChange={(e) => setDeclineModal({ ...declineModal, note: e.target.value })}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setDeclineModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                disabled={declineModal.note.trim().length === 0}
                onClick={() => {
                  setApproval(declineModal.commitment.id, "declined", declineModal.note);
                  setDeclineModal(null);
                }}
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
