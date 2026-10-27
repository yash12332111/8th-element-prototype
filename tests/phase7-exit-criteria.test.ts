import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Phase 7: Exit Criteria & Production Readiness", () => {
  const rootDir = path.resolve(__dirname, "..");

  it("checks no client-side file imports lib/llm/ or contains hardcoded gsk_ keys", () => {
    const clientDirs = [
      path.join(rootDir, "app", "about"),
      path.join(rootDir, "app", "accounts"),
      path.join(rootDir, "app", "approvals"),
      path.join(rootDir, "app", "dashboard"),
      path.join(rootDir, "app", "deals"),
      path.join(rootDir, "app", "eval"),
      path.join(rootDir, "app", "try"),
      path.join(rootDir, "components"),
    ];

    for (const dir of clientDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir, { recursive: true }) as string[];
      for (const file of files) {
        if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, "utf-8");

        // Client files must not import lib/llm/* directly
        expect(content).not.toMatch(/from\s+["']@\/lib\/llm/);
        expect(content).not.toMatch(/from\s+["']\.\.?\/.*lib\/llm/);

        // Client files must not contain hardcoded Groq API keys
        expect(content).not.toMatch(/gsk_[a-zA-Z0-9]{20,}/);
      }
    }
  });

  it("verifies /about page includes all required architectural sections", () => {
    const aboutPath = path.join(rootDir, "app", "about", "page.tsx");
    expect(fs.existsSync(aboutPath)).toBe(true);
    const content = fs.readFileSync(aboutPath, "utf-8");

    // Two-line definition
    expect(content).toContain("About Kept — Promise Intelligence");
    expect(content).toContain("Promise Intelligence system for B2B software vendors");

    // Table 0.2 Real vs Simulated
    expect(content).toContain("What is Real vs. Simulated");
    expect(content).toContain("Real (Fully Implemented)");
    expect(content).toContain("Simulated (Mocked for Demo)");
    expect(content).toContain("LLM Extraction");
    expect(content).toContain("Quote Grounding Engine");
    expect(content).toContain("Rules Checking Engine");
    expect(content).toContain("Pipeline Resolution Gates");
    expect(content).toContain("Three-Way Root Cause Attribution");
    expect(content).toContain("Benchmark Evaluation Harness");

    // Rules 3.3
    expect(content).toContain("How Promises are Checked (Rules 3.3)");
    expect(content).toContain("product_capability");
    expect(content).toContain("commercial");
    expect(content).toContain("standard = false");

    // Attribution 3.5
    expect(content).toContain("Three-Way Attribution Rules (Section 3.5)");
    expect(content).toContain("Sales Break");
    expect(content).toContain("Delivery Break");
    expect(content).toContain("Customer Break");

    // Browser State 1.2
    expect(content).toContain("Why State Lives in the Browser");
    expect(content).toContain("Private Sandboxes");
    expect(content).toContain("Reset Demo");

    // Known limits
    expect(content).toContain("Known Limitations");
    expect(content).toContain("Synthetic Test Bed");

    // 2-minute click path (10.2)
    expect(content).toContain("Two-Minute Evaluator Click Path");
    expect(content).toContain("Moment 1 (Capture)");
    expect(content).toContain("Moment 2 (Contract Gate)");
    expect(content).toContain("Moment 3");
    expect(content).toContain("Account Renewal");
  });

  it("verifies /try sandbox parser logic per Section 7.7", () => {
    const tryPath = path.join(rootDir, "app", "try", "page.tsx");
    expect(fs.existsSync(tryPath)).toBe(true);
    const content = fs.readFileSync(tryPath, "utf-8");

    // Required parser format
    expect(content).toContain("Name (Company, Role, VENDOR|CUSTOMER): text");
    expect(content).toContain("--:--:--");
    expect(content).toContain("no timestamp");

    // Test the parsing regex directly
    const lineRegex = /^(.+?)\s*\((.+?),\s*(.+?),\s*(VENDOR|CUSTOMER)\):\s*(.+)$/i;

    const validLine = "Priya Raman (Brightpath, Account Executive, VENDOR): SAML SSO live in 14 days.";
    const match = validLine.match(lineRegex);
    expect(match).not.toBeNull();
    expect(match![1].trim()).toBe("Priya Raman");
    expect(match![2].trim()).toBe("Brightpath");
    expect(match![3].trim()).toBe("Account Executive");
    expect(match![4].toUpperCase()).toBe("VENDOR");
    expect(match![5].trim()).toBe("SAML SSO live in 14 days.");

    const invalidLine = "Priya Raman: Hey we can do that.";
    expect(invalidLine.match(lineRegex)).toBeNull();
  });

  it("verifies navigation bar includes all core sections", () => {
    const shellPath = path.join(rootDir, "components", "AppShell.tsx");
    const content = fs.readFileSync(shellPath, "utf-8");

    expect(content).toContain("/deals");
    expect(content).toContain("/approvals");
    expect(content).toContain("/accounts");
    expect(content).toContain("/dashboard");
    expect(content).toContain("/eval");
    expect(content).toContain("/try");
    expect(content).toContain("/about");
  });

  it("verifies benchmark results are committed in data/eval/results.json", () => {
    const resultsPath = path.join(rootDir, "data", "eval", "results.json");
    expect(fs.existsSync(resultsPath)).toBe(true);

    const runs = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
    expect(Array.isArray(runs)).toBe(true);
    expect(runs.length).toBeGreaterThan(0);

    const latest = runs[runs.length - 1];
    expect(latest.split).toBe("test");
    expect(latest.model).toBe("openai/gpt-oss-120b");
    expect(latest.strict).toBe(true);
    expect(latest.nTranscripts).toBe(15);
    expect(latest.precision.value).toBeGreaterThan(0.8);
    expect(latest.recall.value).toBeGreaterThan(0.8);
    expect(latest.ungroundedRate.value).toBeLessThan(0.05);
  });
});
