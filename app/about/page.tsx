"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 60 }}>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title" style={{ marginBottom: 6 }}>
          About Kept — Promise Intelligence
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Kept is a Promise Intelligence system for B2B software vendors that automatically captures verbal commitments from sales conversations, checks them against delivery capability, enforces pipeline resolution gates, and attributes delivery breaks across sales, engineering, and customer dependencies.
        </p>
      </div>

      {/* Two-Minute Click Path (Section 10.2) */}
      <div
        className="card"
        style={{
          padding: "24px 28px",
          marginBottom: 32,
          borderLeft: "4px solid var(--accent)",
          background: "linear-gradient(180deg, var(--bg-card), var(--bg-surface))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
            Two-Minute Evaluator Click Path
          </h2>
          <span className="badge badge-blue">Interactive Demo</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
          Follow this 8-step path to experience all three core moments of the Kept system:
        </p>

        <ol style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
          <li>
            <strong>Moment 1 (Capture):</strong> Switch role to <code>Account Executive</code> in header. Open{" "}
            <Link href="/deals/d_harbor">Harbor Logistics</Link> → <em>Capture</em> tab → Click{" "}
            <strong>&ldquo;Find commitments&rdquo;</strong> to extract quotes, line numbers, and risk flags.
          </li>
          <li>
            <strong>Auditable Review:</strong> Go to the <em>Commitments</em> tab. Click <strong>Mark &ldquo;not a commitment&rdquo;</strong> on a proposed item. Note how it stays visible and greyed out with its required reason.
          </li>
          <li>
            <strong>Moment 2 (Contract Gate):</strong> Go to the <em>Stage</em> tab and click <strong>&ldquo;Move to Contract&rdquo;</strong>. The contract gate blocks advancement due to unresolved amber and red flags.
          </li>
          <li>
            <strong>Separation of Duties:</strong> Switch role to <code>Implementation Lead</code> in header. Go to{" "}
            <Link href="/approvals">Approvals Queue</Link> and resolve Harbor&apos;s flags: approve one with note, adjust one, and decline one.
          </li>
          <li>
            <strong>Walk-Back &amp; Closed-Won Gate:</strong> Switch role back to <code>Account Executive</code>. Record a walk-back on the declined item. Move to Contract stage, confirm remaining items, assign owners, and advance to Closed-Won.
          </li>
          <li>
            <strong>Handoff &amp; Kickoff Readback:</strong> Open <Link href="/deals/d_cedar">Cedar Health Clinics</Link> → <em>Handoff</em> tab. Review customer dependencies, check acknowledgement, and log a verbal off-record promise.
          </li>
          <li>
            <strong>Moment 3 (Account Renewal &amp; Attribution):</strong> Open{" "}
            <Link href="/accounts/d_northgate">Northgate Retail</Link>. View the objective three-way attribution summary showing exactly 1 Sales break, 1 Delivery break, and 1 Customer break.
          </li>
          <li>
            <strong>AI Accuracy:</strong> Visit <Link href="/eval">AI Accuracy</Link> to inspect precision, recall, ungrounded rate, and decoy rejection measured against the held-out test benchmark.
          </li>
        </ol>
      </div>

      {/* Real vs Simulated (Table 0.2) */}
      <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
          What is Real vs. Simulated
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
          This prototype exercises full end-to-end functionality using real LLM inference and deterministic checking engines, paired with mock ecosystem tooling.
        </p>

        <div className="delivery-table-container">
          <table className="delivery-table">
            <thead>
              <tr>
                <th style={{ width: "50%" }}>Real (Fully Implemented)</th>
                <th style={{ width: "50%" }}>Simulated (Mocked for Demo)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>LLM Extraction &amp; Schema Adherence:</strong> Live inference via Groq SDK using <code>openai/gpt-oss-120b</code> with strict structured outputs (constrained decoding).
                </td>
                <td>
                  <strong>Call Recording &amp; ASR:</strong> Transcripts are realistic fictional JSON files with pre-split speakers, timestamps, and lines rather than live Zoom/Gong audio webhooks.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Quote Grounding Engine:</strong> Deterministic character-for-character quote verification against transcript lines; ungrounded quotes are automatically dropped.
                </td>
                <td>
                  <strong>CRM Platform:</strong> In-browser interactive pipeline board instead of a live Salesforce or HubSpot REST integration.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Rules Checking Engine:</strong> Deterministic code evaluating promises against catalog lead times, standard offerings, and capabilities.
                </td>
                <td>
                  <strong>Collaboration &amp; Messaging:</strong> In-app approval queues and modals instead of Slack or email alert webhooks.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Pipeline Resolution Gates:</strong> Mathematical contract checkpoints and Closed-Won blocker panels blocking premature stage moves.
                </td>
                <td>
                  <strong>User Auth &amp; Permissions:</strong> Instant header role switcher simulating AE, Implementation Lead, CSM, and VP CS roles instead of SSO logins.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Three-Way Root Cause Attribution:</strong> Objective rule engine classifying broken commitments into Sales, Delivery, or Customer faults.
                </td>
                <td>
                  <strong>Time Elapsed:</strong> Pre-seeded accounts (Harbor in proposal, Cedar in onboarding, Northgate in renewal) with historical event logs.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Benchmark Evaluation Harness:</strong> Automated greedy matching calculating precision, recall, ungrounded rates, and decoy leakage.
                </td>
                <td>
                  <strong>Customer Identities:</strong> All company names (Brightpath, Harbor, Cedar, Northgate) and persons are completely fictional.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Deterministic Rules & Attribution Engine */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: 20, marginBottom: 36 }}>
        {/* Rules Engine */}
        <div className="card" style={{ padding: "20px 24px" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
            How Promises are Checked (Rules 3.3)
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            The AI only extracts facts (quote, type, catalogue item, due days). Flag assignment is 100% deterministic code in <code>lib/rules.ts</code>:
          </p>
          <ul style={{ paddingLeft: 18, fontSize: 12, display: "flex", flexDirection: "column", gap: 6, color: "var(--text-muted)" }}>
            <li><strong style={{ color: "var(--amber)" }}>Amber:</strong> Type is <code>product_capability</code> (unreleased feature).</li>
            <li><strong style={{ color: "var(--amber)" }}>Amber:</strong> Type is <code>commercial</code> (pricing/payment terms need review).</li>
            <li><strong style={{ color: "var(--amber)" }}>Amber:</strong> Deliverable is not in catalog (unvetted custom work).</li>
            <li><strong style={{ color: "var(--red)" }}>Red:</strong> Catalog item has <code>offered = false</code> (actively rejected offering).</li>
            <li><strong style={{ color: "var(--amber)" }}>Amber:</strong> Promised due days &lt; engineering lead time (lead-time risk).</li>
            <li><strong style={{ color: "var(--amber)" }}>Amber:</strong> Catalog item has <code>standard = false</code> (non-standard delivery).</li>
            <li><strong style={{ color: "var(--green)" }}>Green:</strong> Standard catalogue item promised within lead time.</li>
          </ul>
        </div>

        {/* Attribution Engine */}
        <div className="card" style={{ padding: "20px 24px" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
            Three-Way Attribution Rules (Section 3.5)
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            When a commitment breaks at renewal, blame is objectively attributed according to mathematical rules in <code>lib/attribution.ts</code>:
          </p>
          <ul style={{ paddingLeft: 18, fontSize: 12, display: "flex", flexDirection: "column", gap: 8, color: "var(--text-muted)" }}>
            <li>
              <strong style={{ color: "var(--red)" }}>Sales Break:</strong> Promised off-record (never in contract), promised late after proposal against an active risk flag, or promised against an unapproved risk flag.
            </li>
            <li>
              <strong style={{ color: "var(--accent)" }}>Delivery Break:</strong> A safe (green) or approved flag promise that broke for an internal vendor reason (engineering/resourcing).
            </li>
            <li>
              <strong style={{ color: "#d2a8ff" }}>Customer Break:</strong> Broke specifically because the customer failed to satisfy a formally recorded dependency (e.g., missed data export).
            </li>
          </ul>
        </div>
      </div>

      {/* Why Browser State & Known Limitations */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: 20, marginBottom: 36 }}>
        {/* Why Browser State */}
        <div className="card" style={{ padding: "20px 24px" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
            Why State Lives in the Browser
          </h3>
          <ul style={{ paddingLeft: 18, fontSize: 12, display: "flex", flexDirection: "column", gap: 6, color: "var(--text-muted)", lineHeight: 1.5 }}>
            <li>
              <strong>Private Sandboxes:</strong> Every reviewer gets an isolated session in <code>localStorage</code>. Actions taken by one evaluator never interfere with what the next evaluator sees.
            </li>
            <li>
              <strong>Zero Database Latency:</strong> Immediate, deterministic updates without remote provisioning or credentials.
            </li>
            <li>
              <strong>Instant Reset:</strong> The header &ldquo;Reset Demo&rdquo; button restores pristine initial seed state in a single click.
            </li>
            <li>
              <strong>Trade-Off:</strong> State is not synced across different browser profiles or devices. A production deployment would use a Postgres backend (deck slide 15).
            </li>
          </ul>
        </div>

        {/* Known Limitations */}
        <div className="card" style={{ padding: "20px 24px" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
            Known Limitations &amp; Scope
          </h3>
          <ul style={{ paddingLeft: 18, fontSize: 12, display: "flex", flexDirection: "column", gap: 6, color: "var(--text-muted)", lineHeight: 1.5 }}>
            <li>
              <strong>Synthetic Test Bed:</strong> All accounts, transcripts, and employee names are synthetic.
            </li>
            <li>
              <strong>In-Memory Rate Limiter:</strong> Per-IP rate limiting on live Groq extraction is best-effort across serverless instances.
            </li>
            <li>
              <strong>Single-Vendor Catalog:</strong> Rules are currently mapped against Brightpath&apos;s field-service product catalog.
            </li>
            <li>
              <strong>AI Evaluation Set:</strong> 20 benchmark transcripts were drafted with AI assistance; numbers measure performance on this dataset.
            </li>
          </ul>
        </div>
      </div>

      {/* Links & Navigation */}
      <div
        className="card"
        style={{
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          background: "var(--bg-surface)",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Try Kept With Custom Transcripts</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Paste any formatted transcript into our live sandbox to extract commitments in real time.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/try" className="btn btn-secondary">
            Open /try Sandbox →
          </Link>
          <Link href="/deals" className="btn btn-primary">
            Go to Pipeline Board →
          </Link>
        </div>
      </div>
    </div>
  );
}
