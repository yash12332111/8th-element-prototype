export type Side = "vendor" | "customer";

export interface Speaker {
  id: string;          // "s1"
  name: string;        // "Priya Raman"
  role: string;        // "Account Executive"
  company: string;     // "Brightpath"
  side: Side;
}

export interface TranscriptLine {
  id: string;          // "L1", "L2", ... unique within a transcript
  ts: string;          // "00:04:10" (hh:mm:ss)
  speakerId: string;
  text: string;
}

export interface Transcript {
  id: string;          // "t_harbor_01"
  dealId: string;      // "d_harbor" (eval transcripts use "eval")
  title: string;       // "Discovery call 2"
  date: string;        // ISO date "2026-09-14"
  source: "call" | "email";
  speakers: Speaker[];
  lines: TranscriptLine[];
}

export type CommitmentType =
  | "integration" | "data_migration" | "configuration" | "timeline"
  | "training" | "support" | "product_capability" | "commercial" | "other";

export interface CatalogItem {
  id: string;                 // "int_sso"
  type: CommitmentType;
  name: string;               // "Single sign-on (SAML)"
  offered: boolean;           // false → red
  standard: boolean;          // false → amber
  leadTimeDays: number | null;// minimum days from signature; null = no lead time rule
  notes: string;
}

export type Flag = "green" | "amber" | "red";
export type ReviewStatus = "proposed" | "confirmed" | "not_commitment";
export type Approval = "not_needed" | "pending" | "approved" | "adjusted" | "declined";
export type DeliveryStatus = "open" | "on_track" | "at_risk" | "kept" | "broken";
export type Origin = "ai" | "manual" | "off_record";
export type Stage = "discovery" | "proposal" | "contract" | "closed_won" | "onboarding" | "renewal";
export type Role = "ae" | "implementation" | "csm" | "vp_cs";
export type Attribution = "sales" | "delivery" | "customer";

export interface CustomerDependency {
  text: string;               // "Customer sends job history export"
  quote: string | null;       // verbatim if captured from transcript
  dueDays: number | null;
}

export interface Evidence {
  kind: "task_link" | "customer_ack";
  reference: string;          // task id/URL, or "Ack by <name> on <date>"
  addedAt: string;            // ISO
}

export interface CommitmentVersion {
  text: string;
  quote: string;
  type: CommitmentType;
  dueDays: number | null;
  editedBy: Role | "ai";
  at: string;                 // ISO
}

export interface Commitment {
  id: string;
  dealId: string;
  origin: Origin;
  transcriptId: string | null;
  lineId: string | null;
  speakerId: string | null;
  timestamp: string | null;   // from transcript line, never from model
  quote: string;              // verbatim; "" only for manual or off_record with no quote
  text: string;               // one-line summary
  type: CommitmentType;
  catalogItemId: string | null;
  dueText: string | null;     // verbatim due phrase, e.g. "within three weeks"
  dueDays: number | null;     // days from signature, if stated
  confidence: number | null;  // model confidence 0–1 (display only)
  flag: Flag;
  flagReason: string;
  late: boolean;              // created when deal stage ≥ contract
  createdAtStage: Stage;
  review: ReviewStatus;
  notCommitmentReason: string | null;
  versions: CommitmentVersion[]; // versions[0] = original, never mutated
  approval: Approval;
  approvalNote: string | null;
  walkedBack: boolean;        // required when approval = "declined"
  ownerRole: "implementation" | "csm" | "product" | null;
  ownerName: string | null;
  dueDate: string | null;     // ISO, computed: closeDate + dueDays
  customerDependency: CustomerDependency | null;
  delivery: DeliveryStatus;
  evidence: Evidence | null;
  keptAt: string | null;
  csmVerified: boolean;
  breakCause: "vendor" | "customer_dependency" | null;
  customerAcknowledged: boolean; // kickoff readback tick (v1.1)
}

export interface Deal {
  id: string;                 // "d_harbor"
  accountId: string;          // "a_harbor"
  accountName: string;        // "Harbor Logistics (fictional)"
  aeName: string;
  implementationLead: string;
  csmName: string;
  arrUsd: number;             // synthetic
  stage: Stage;
  closeDate: string | null;   // ISO, set when Closed-Won
  renewalDate: string | null;
  transcriptIds: string[];
}

export interface AppEvent {
  id: string;
  at: string;                 // ISO
  role: Role | "system";
  dealId: string;
  commitmentId: string | null;
  type:
    | "extracted" | "dropped" | "confirmed" | "edited" | "marked_not_commitment"
    | "approval_set" | "walked_back" | "stage_moved" | "gate_blocked"
    | "off_record_added" | "owner_set" | "dependency_set" | "status_set"
    | "evidence_added" | "csm_verified" | "break_recorded" | "customer_acknowledged" | "reset";
  payload: Record<string, unknown>;
}
