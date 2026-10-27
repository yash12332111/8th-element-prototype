"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";

export default function HomePage() {
  const deals = useStore((s) => s.deals);
  const commitments = useStore((s) => s.commitments);

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Kept — Promise Intelligence
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 32, fontSize: 15 }}>
        Every sales commitment, captured, checked and tracked — end-to-end.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--accent)" }}>{deals.length}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Active deals</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--green)" }}>
            {commitments.filter((c) => c.review !== "not_commitment").length}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Tracked commitments</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--amber)" }}>
            {commitments.filter((c) => c.flag !== "green" && c.approval === "pending").length}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Awaiting approval</div>
        </div>
      </div>

      <Link href="/deals" className="btn btn-primary" style={{ display: "inline-flex" }}>
        View pipeline →
      </Link>
    </div>
  );
}
