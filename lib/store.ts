import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildSeedState, SEED_VERSION } from "./seed";
import { checkCommitment } from "./rules";
import { canMove, isLate } from "./gates";
import catalogData from "../data/catalog.json";
import type {
  Role, Deal, Commitment, Transcript, AppEvent, Stage,
  CommitmentType, DeliveryStatus, Evidence, CustomerDependency,
  Approval, CatalogItem,
} from "./types";

import type { ExtractionResult } from "./llm/extract";
export type { ExtractionResult };

// ------------------------------------------------------------------
// State shape (section 6)
// ------------------------------------------------------------------
export interface AppState {
  seedVersion: string;
  role: Role;
  deals: Deal[];
  commitments: Commitment[];
  transcripts: Transcript[];
  events: AppEvent[];
  lastExtraction: Record<string, ExtractionResult>;

  // Actions
  setRole(role: Role): void;
  resetDemo(): void;

  ingestExtraction(dealId: string, transcriptId: string, result: ExtractionResult): void;
  confirm(id: string): void;
  edit(id: string, patch: { text?: string; quote?: string; type?: CommitmentType; dueDays?: number | null }): void;
  markNotCommitment(id: string, reason: string): void;

  setApproval(id: string, approval: Approval, note?: string, patch?: { text?: string; dueDays?: number | null }): void;
  recordWalkBack(id: string, note: string): void;

  moveStage(dealId: string, to: Stage): void;
  addOffRecord(dealId: string, item: { text: string; type: CommitmentType; catalogItemId: string | null; dueDays: number | null }): void;

  setOwner(id: string, ownerRole: "implementation" | "csm" | "product", ownerName: string): void;
  setDependency(id: string, dep: CustomerDependency): void;
  setCustomerAcknowledged(id: string, acknowledged: boolean): void;

  setDelivery(id: string, status: DeliveryStatus): void;
  addEvidence(id: string, evidence: Evidence): void;
  csmVerify(id: string): void;
  recordBreak(id: string, cause: "vendor" | "customer_dependency"): void;
}

// ------------------------------------------------------------------
// Role-permission guards (section 6.1)
// ------------------------------------------------------------------
function canAE(role: Role) { return role === "ae"; }
function canImpl(role: Role) { return role === "implementation"; }
function canCSM(role: Role) { return role === "csm"; }
function canImplOrCSM(role: Role) { return role === "implementation" || role === "csm"; }

// ------------------------------------------------------------------
// Tiny helpers
// ------------------------------------------------------------------
function uid() {
  return `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function cuid() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function now() { return new Date().toISOString(); }

// ------------------------------------------------------------------
// The store
// ------------------------------------------------------------------
export const useStore = create<AppState>()(
  persist(
    (set, get) => {
      const seed = buildSeedState();

      function emit(event: Omit<AppEvent, "id" | "at">) {
        const ev: AppEvent = { id: uid(), at: now(), ...event };
        set((s) => ({ events: [...s.events, ev] }));
      }

      return {
        ...seed,
        role: "ae",
        lastExtraction: {},

        // ── Role ──────────────────────────────────────────────────
        setRole(role) {
          set({ role });
        },

        // ── Reset ─────────────────────────────────────────────────
        resetDemo() {
          const fresh = buildSeedState();
          set({ ...fresh, role: "ae", lastExtraction: {} });
          emit({ role: "system", dealId: "", commitmentId: null, type: "reset", payload: {} });
        },

        // ── Ingest extraction ─────────────────────────────────────
        ingestExtraction(dealId, transcriptId, result) {
          const { role, deals, commitments } = get();
          if (!canAE(role)) return;

          const deal = deals.find((d) => d.id === dealId);
          if (!deal) return;

          const catalog = catalogData as CatalogItem[];

          const existingKeys = new Set(
            commitments
              .filter((c) => c.transcriptId === transcriptId)
              .map((c) => `${c.transcriptId}|${c.lineId}|${c.quote.slice(0, 60)}`)
          );

          const newCommitments: Commitment[] = [];

          for (const candidate of result.candidates as Array<{
            lineId: string; quote: string; text: string; type: CommitmentType;
            catalogItemId: string | null; dueText: string | null; dueDays: number | null;
            confidence: number | null; speakerId: string; timestamp: string;
            customerDependency?: CustomerDependency | null;
          }>) {
            const key = `${transcriptId}|${candidate.lineId}|${candidate.quote.slice(0, 60)}`;
            if (existingKeys.has(key)) continue;
            existingKeys.add(key);

            const catId = candidate.catalogItemId ?? null;
            const { flag, reason } = checkCommitment(
              { type: candidate.type, catalogItemId: catId, dueDays: candidate.dueDays },
              catalog
            );
            const approval = flag === "green" ? "not_needed" : "pending";
            const late = isLate(deal.stage);

            const c: Commitment = {
              id: cuid(),
              dealId,
              origin: "ai",
              transcriptId,
              lineId: candidate.lineId,
              speakerId: candidate.speakerId,
              timestamp: candidate.timestamp,
              quote: candidate.quote,
              text: candidate.text,
              type: candidate.type,
              catalogItemId: catId,
              dueText: candidate.dueText,
              dueDays: candidate.dueDays,
              confidence: candidate.confidence,
              flag,
              flagReason: reason,
              late,
              createdAtStage: deal.stage,
              review: "proposed",
              notCommitmentReason: null,
              versions: [
                { text: candidate.text, quote: candidate.quote, type: candidate.type, dueDays: candidate.dueDays, editedBy: "ai", at: now() }
              ],
              approval,
              approvalNote: null,
              walkedBack: false,
              ownerRole: null,
              ownerName: null,
              dueDate: null,
              customerDependency: candidate.customerDependency ?? null,
              delivery: "open",
              evidence: null,
              keptAt: null,
              csmVerified: false,
              breakCause: null,
              customerAcknowledged: false,
            };
            newCommitments.push(c);
          }

          set((s) => ({
            commitments: [...s.commitments, ...newCommitments],
            lastExtraction: { ...s.lastExtraction, [transcriptId]: result },
          }));
          emit({ role, dealId, commitmentId: null, type: "extracted", payload: { transcriptId, count: newCommitments.length } });
        },

        // ── Review actions (AE only) ───────────────────────────────
        confirm(id) {
          const { role } = get();
          if (!canAE(role)) return;
          set((s) => ({
            commitments: s.commitments.map((c) =>
              c.id === id ? { ...c, review: "confirmed" } : c
            ),
          }));
          const c = get().commitments.find((x) => x.id === id);
          if (c) emit({ role, dealId: c.dealId, commitmentId: id, type: "confirmed", payload: {} });
        },

        edit(id, patch) {
          const { role } = get();
          if (!canAE(role)) return;

          set((s) => ({
            commitments: s.commitments.map((c) => {
              if (c.id !== id) return c;
              const updated = { ...c, ...patch };
              const { flag, reason } = checkCommitment(
                { type: updated.type, catalogItemId: updated.catalogItemId, dueDays: updated.dueDays },
                catalogData as CatalogItem[]
              );
              const newVersion = {
                text: updated.text,
                quote: updated.quote,
                type: updated.type,
                dueDays: updated.dueDays,
                editedBy: role as "ae",
                at: now(),
              };
              return {
                ...updated,
                flag,
                flagReason: reason,
                approval: flag === "green" ? "not_needed" : updated.approval === "not_needed" ? "pending" : updated.approval,
                versions: [...c.versions, newVersion],
              };
            }),
          }));
          const c = get().commitments.find((x) => x.id === id);
          if (c) emit({ role, dealId: c.dealId, commitmentId: id, type: "edited", payload: patch });
        },

        markNotCommitment(id, reason) {
          const { role } = get();
          if (!canAE(role)) return;
          if (reason.trim().length < 5) return;
          set((s) => ({
            commitments: s.commitments.map((c) =>
              c.id === id ? { ...c, review: "not_commitment", notCommitmentReason: reason } : c
            ),
          }));
          const c = get().commitments.find((x) => x.id === id);
          if (c) emit({ role, dealId: c.dealId, commitmentId: id, type: "marked_not_commitment", payload: { reason } });
        },

        // ── Approval (implementation only) ───────────────────────
        setApproval(id, approval, note, patch) {
          const { role } = get();
          if (!canImpl(role)) return;
          const c = get().commitments.find((x) => x.id === id);
          if (!c) return;
          // Red approve requires an exception note
          if (approval === "approved" && c.flag === "red" && (!note || note.trim().length === 0)) return;
          // Decline requires a note explaining why
          if (approval === "declined" && (!note || note.trim().length === 0)) return;

          let updated = { ...c, approval, approvalNote: note ?? c.approvalNote };

          if (patch) {
            const updatedText = patch.text ?? c.text;
            const updatedDueDays = patch.dueDays !== undefined ? patch.dueDays : c.dueDays;
            const { flag, reason } = checkCommitment(
              { type: c.type, catalogItemId: c.catalogItemId, dueDays: updatedDueDays },
              catalogData as CatalogItem[]
            );
            const newVersion = {
              text: updatedText,
              quote: c.quote,
              type: c.type,
              dueDays: updatedDueDays,
              editedBy: "implementation" as const,
              at: now(),
            };
            updated = {
              ...updated,
              text: updatedText,
              dueDays: updatedDueDays,
              flag,
              flagReason: reason,
              versions: [...c.versions, newVersion],
            };
          }

          set((s) => ({
            commitments: s.commitments.map((x) => (x.id === id ? updated : x)),
          }));
          emit({ role, dealId: c.dealId, commitmentId: id, type: "approval_set", payload: { approval, note, patch } });
        },

        recordWalkBack(id, note) {
          const { role } = get();
          if (!canAE(role)) return;
          const c = get().commitments.find((x) => x.id === id);
          if (!c || c.approval !== "declined") return;
          set((s) => ({
            commitments: s.commitments.map((x) =>
              x.id === id ? { ...x, walkedBack: true, approvalNote: note } : x
            ),
          }));
          emit({ role, dealId: c.dealId, commitmentId: id, type: "walked_back", payload: { note } });
        },

        // ── Stage (AE only) ───────────────────────────────────────
        moveStage(dealId, to) {
          const { role, deals, commitments } = get();
          if (!canAE(role)) return;
          const deal = deals.find((d) => d.id === dealId);
          if (!deal) return;
          const dealCommitments = commitments.filter((c) => c.dealId === dealId);
          const result = canMove(deal, to, dealCommitments);
          if (!result.allowed) {
            emit({ role, dealId, commitmentId: null, type: "gate_blocked", payload: { blockers: result.blockers } });
            return;
          }

          const closeDate = to === "closed_won" ? new Date().toISOString().slice(0, 10) : deal.closeDate;

          set((s) => ({
            deals: s.deals.map((d) => d.id === dealId ? { ...d, stage: to, closeDate } : d),
            commitments: to === "closed_won"
              ? s.commitments.map((c) => {
                  if (c.dealId !== dealId || c.review !== "confirmed" || !c.dueDays || !closeDate) return c;
                  const due = new Date(closeDate);
                  due.setDate(due.getDate() + c.dueDays);
                  return { ...c, dueDate: due.toISOString().slice(0, 10) };
                })
              : s.commitments,
          }));
          emit({ role, dealId, commitmentId: null, type: "stage_moved", payload: { from: deal.stage, to } });
        },

        // ── Off-record (implementation only) ─────────────────────
        addOffRecord(dealId, item) {
          const { role, deals } = get();
          if (!canImpl(role)) return;
          const deal = deals.find((d) => d.id === dealId);
          if (!deal) return;
          const catalog = catalogData as CatalogItem[];

          const { flag, reason } = checkCommitment(
            { type: item.type, catalogItemId: item.catalogItemId, dueDays: item.dueDays },
            catalog
          );

          const c: Commitment = {
            id: cuid(),
            dealId,
            origin: "off_record",
            transcriptId: null,
            lineId: null,
            speakerId: null,
            timestamp: null,
            quote: "",
            text: item.text,
            type: item.type,
            catalogItemId: item.catalogItemId,
            dueText: null,
            dueDays: item.dueDays,
            confidence: null,
            flag,
            flagReason: reason,
            late: isLate(deal.stage),
            createdAtStage: deal.stage,
            review: "confirmed",
            notCommitmentReason: null,
            versions: [
              { text: item.text, quote: "", type: item.type, dueDays: item.dueDays, editedBy: role, at: now() }
            ],
            approval: flag === "green" ? "not_needed" : "pending",
            approvalNote: null,
            walkedBack: false,
            ownerRole: null,
            ownerName: null,
            dueDate: null,
            customerDependency: null,
            delivery: "open",
            evidence: null,
            keptAt: null,
            csmVerified: false,
            breakCause: null,
            customerAcknowledged: false,
          };
          set((s) => ({ commitments: [...s.commitments, c] }));
          emit({ role, dealId, commitmentId: c.id, type: "off_record_added", payload: { text: item.text } });
        },

        // ── Owner / dependency (implementation only) ──────────────
        setOwner(id, ownerRole, ownerName) {
          const { role } = get();
          if (!canImpl(role)) return;
          const c = get().commitments.find((x) => x.id === id);
          if (!c) return;
          set((s) => ({
            commitments: s.commitments.map((x) =>
              x.id === id ? { ...x, ownerRole, ownerName } : x
            ),
          }));
          emit({ role, dealId: c.dealId, commitmentId: id, type: "owner_set", payload: { ownerRole, ownerName } });
        },

        setDependency(id, dep) {
          const { role } = get();
          if (!canImpl(role)) return;
          const c = get().commitments.find((x) => x.id === id);
          if (!c) return;
          set((s) => ({
            commitments: s.commitments.map((x) =>
              x.id === id ? { ...x, customerDependency: dep } : x
            ),
          }));
          emit({ role, dealId: c.dealId, commitmentId: id, type: "dependency_set", payload: { dep } });
        },

        setCustomerAcknowledged(id, acknowledged) {
          const { role } = get();
          if (!canImpl(role)) return;
          const c = get().commitments.find((x) => x.id === id);
          if (!c) return;
          set((s) => ({
            commitments: s.commitments.map((x) =>
              x.id === id ? { ...x, customerAcknowledged: acknowledged } : x
            ),
          }));
          emit({ role, dealId: c.dealId, commitmentId: id, type: "customer_acknowledged", payload: { acknowledged } });
        },

        // ── Delivery (implementation or CSM) ─────────────────────
        setDelivery(id, status) {
          const { role } = get();
          if (!canImplOrCSM(role)) return;
          const c = get().commitments.find((x) => x.id === id);
          if (!c) return;
          // kept requires evidence
          if (status === "kept" && !c.evidence) return;
          const keptAt = status === "kept" ? now() : c.keptAt;
          set((s) => ({
            commitments: s.commitments.map((x) =>
              x.id === id ? { ...x, delivery: status, keptAt } : x
            ),
          }));
          emit({ role, dealId: c.dealId, commitmentId: id, type: "status_set", payload: { status } });
        },

        addEvidence(id, evidence) {
          const { role } = get();
          if (!canImplOrCSM(role)) return;
          const c = get().commitments.find((x) => x.id === id);
          if (!c) return;
          set((s) => ({
            commitments: s.commitments.map((x) =>
              x.id === id ? { ...x, evidence } : x
            ),
          }));
          emit({ role, dealId: c.dealId, commitmentId: id, type: "evidence_added", payload: { evidence } });
        },

        csmVerify(id) {
          const { role } = get();
          if (!canCSM(role)) return;
          const c = get().commitments.find((x) => x.id === id);
          if (!c) return;
          set((s) => ({
            commitments: s.commitments.map((x) =>
              x.id === id ? { ...x, csmVerified: true } : x
            ),
          }));
          emit({ role, dealId: c.dealId, commitmentId: id, type: "csm_verified", payload: {} });
        },

        recordBreak(id, cause) {
          const { role } = get();
          if (!canImplOrCSM(role)) return;
          const c = get().commitments.find((x) => x.id === id);
          if (!c) return;
          // customer_dependency selectable only if dependency is set
          if (cause === "customer_dependency" && !c.customerDependency) return;
          set((s) => ({
            commitments: s.commitments.map((x) =>
              x.id === id ? { ...x, delivery: "broken", breakCause: cause } : x
            ),
          }));
          emit({ role, dealId: c.dealId, commitmentId: id, type: "break_recorded", payload: { cause } });
        },
      };
    },
    {
      name: "kept-demo-v1",
      // On rehydration: if seed version changed, reset to fresh seed
      onRehydrateStorage: () => (state) => {
        if (state && state.seedVersion !== SEED_VERSION) {
          const fresh = buildSeedState();
          Object.assign(state, { ...fresh, role: "ae", lastExtraction: {} });
        }
      },
    }
  )
);
