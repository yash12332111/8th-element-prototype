import puppeteer, { Page } from "puppeteer";
import * as fs from "node:fs";
import * as path from "node:path";

const BASE_URL = process.env.BASE_URL || "https://8th-element-prototype.vercel.app";
const ARTIFACTS_DIR = "/Users/eslavathyaswanthvenkatasai/.gemini/antigravity-ide/brain/aa4229a5-a067-4463-b0f2-80dcce03e4e8";

async function resetDemoState(page: Page) {
  // Clear local storage and reload page to restore clean seed state
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 600));
}

async function setRole(page: Page, role: "ae" | "implementation" | "csm" | "vp_cs") {
  await page.evaluate((targetRole) => {
    const select = document.getElementById("role-switcher") as HTMLSelectElement | null;
    if (select) {
      select.value = targetRole;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, role);
  await new Promise((r) => setTimeout(r, 400));
}

async function main() {
  console.log(`Launching Puppeteer against ${BASE_URL}...`);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    defaultViewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
    },
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const rootDir = path.resolve(__dirname, "..");
  const workspaceRoot = path.resolve(rootDir, "..");
  const outDirKept = path.join(rootDir, "screenshots");
  const outDirRoot = path.join(workspaceRoot, "screenshots");

  fs.mkdirSync(outDirKept, { recursive: true });
  fs.mkdirSync(outDirRoot, { recursive: true });
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const saveScreenshot = async (filename: string) => {
    const p1 = path.join(outDirKept, filename);
    const p2 = path.join(outDirRoot, filename);
    const p3 = path.join(ARTIFACTS_DIR, filename);

    await page.screenshot({ path: p1, fullPage: false });
    fs.copyFileSync(p1, p2);
    fs.copyFileSync(p1, p3);
    console.log(`✓ Saved ${filename} (${fs.statSync(p1).size} bytes)`);
  };

  try {
    // =========================================================================
    // 1. Screenshot 01_harbor_capture.png
    // "open Harbor, go to the Capture tab, and choose Find commitments.
    // Include the transcript and the candidate list, with the red custom ERP card visible."
    // =========================================================================
    console.log("\n--- Capturing 01_harbor_capture.png ---");
    await page.goto(`${BASE_URL}/deals/d_harbor`, { waitUntil: "networkidle0" });
    await resetDemoState(page);
    await setRole(page, "ae");

    // Click "⚡ Find commitments"
    console.log("Clicking 'Find commitments' on Harbor Call 1...");
    const clickedFind = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.textContent?.includes("Find commitments"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (!clickedFind) throw new Error("Could not find 'Find commitments' button");

    // Wait for candidates to load
    await page.waitForSelector(".candidate-card", { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1500));

    // Find and click the red custom ERP candidate card
    console.log("Clicking red custom ERP card...");
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".candidate-card"));
      const redCard = cards.find((c) => {
        const text = c.textContent || "";
        return text.includes("custom ERP") || c.querySelector(".badge-red") !== null;
      }) as HTMLElement | null;
      if (redCard) {
        redCard.click();
      }
    });
    await new Promise((r) => setTimeout(r, 1200));

    await saveScreenshot("01_harbor_capture.png");

    // =========================================================================
    // 2. Screenshot 02_harbor_contract_block.png
    // "reset, then open Harbor and run Find commitments on the first call first.
    // Without that, the screen shows the new “No commitments found” message instead of the flags.
    // Then open the Stage tab. The blockers list is already showing, so no click is needed."
    // =========================================================================
    console.log("\n--- Capturing 02_harbor_contract_block.png ---");
    await page.goto(`${BASE_URL}/deals/d_harbor`, { waitUntil: "networkidle0" });
    await resetDemoState(page);
    await setRole(page, "ae");

    // Run Find commitments on first call
    console.log("Running Find commitments on first call...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.textContent?.includes("Find commitments"));
      if (btn) btn.click();
    });
    await page.waitForSelector(".candidate-card", { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1500));

    // Open the Stage tab
    console.log("Opening Stage tab...");
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll(".deal-tab"));
      const stageTab = tabs.find((t) => t.textContent?.toLowerCase().includes("stage")) as HTMLElement | null;
      if (stageTab) stageTab.click();
    });
    await page.waitForSelector(".blocker-panel", { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 1000));

    await saveScreenshot("02_harbor_contract_block.png");

    // =========================================================================
    // 3. Screenshot 03_harbor_closed_won_block.png
    // "Extract only the first call.
    // As Implementation Lead, approve every flag, with a note on the red one.
    // As Account Executive, move to Contract.
    // Open Stage. The Closed-Won blockers should show only “not yet confirmed” and “no owner”."
    // =========================================================================
    console.log("\n--- Capturing 03_harbor_closed_won_block.png ---");
    await page.goto(`${BASE_URL}/deals/d_harbor`, { waitUntil: "networkidle0" });
    await resetDemoState(page);
    await setRole(page, "ae");

    // Extract only first call
    console.log("Extracting only first call...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.textContent?.includes("Find commitments"));
      if (btn) btn.click();
    });
    await page.waitForSelector(".candidate-card", { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1500));

    // As Implementation Lead, approve every flag with a note on the red one
    console.log("Switching to Implementation Lead and approving all flags in store...");
    await setRole(page, "implementation");

    // We can approve directly via the store state in localStorage
    await page.evaluate(() => {
      const raw = localStorage.getItem("kept-demo-v1");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data?.state?.commitments) {
        data.state.commitments.forEach((c: any) => {
          if (c.flag === "red") {
            c.approval = "approved";
            c.approvalNote = "Approved exception: custom adapter budgeted in Q4 for strategic account";
          } else if (c.flag === "amber") {
            c.approval = "approved";
            c.approvalNote = "Approved standard exception";
          }
        });
        localStorage.setItem("kept-demo-v1", JSON.stringify(data));
      }
    });

    // Switch role back to Account Executive
    console.log("Switching back to AE role and reloading Harbor deal...");
    await page.goto(`${BASE_URL}/deals/d_harbor`, { waitUntil: "networkidle0" });
    await setRole(page, "ae");

    // Open Stage tab
    console.log("Opening Stage tab...");
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll(".deal-tab"));
      const stageTab = tabs.find((t) => t.textContent?.toLowerCase().includes("stage")) as HTMLElement | null;
      if (stageTab) stageTab.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Click "Move to Contract →"
    console.log("Clicking 'Move to Contract →'...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const moveBtn = btns.find((b) => b.textContent?.includes("Move to Contract"));
      if (moveBtn) moveBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Ensure Stage tab is visible and displays Closed-Won blockers
    await page.waitForSelector(".blocker-panel", { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 800));

    await saveScreenshot("03_harbor_closed_won_block.png");

    // =========================================================================
    // 4. Screenshot 04_northgate_attribution.png
    // "open the Northgate account page with the at-risk header, kept-rate panel
    // and the three attribution cards in view."
    // =========================================================================
    console.log("\n--- Capturing 04_northgate_attribution.png ---");
    await page.goto(`${BASE_URL}/accounts/a_northgate`, { waitUntil: "networkidle0" });
    await resetDemoState(page);
    await new Promise((r) => setTimeout(r, 1000));

    // Adjust scroll slightly if needed to perfectly fit header, kept rate card, and attribution summary
    await page.evaluate(() => {
      window.scrollTo(0, 40);
    });
    await new Promise((r) => setTimeout(r, 600));

    await saveScreenshot("04_northgate_attribution.png");

    // =========================================================================
    // 5. Screenshot 05_eval_accuracy_panel.png
    // "open the AI Accuracy page with the latest test run and the five metric cards in view."
    // =========================================================================
    console.log("\n--- Capturing 05_eval_accuracy_panel.png ---");
    await page.goto(`${BASE_URL}/eval`, { waitUntil: "networkidle0" });
    await resetDemoState(page);
    await new Promise((r) => setTimeout(r, 1000));

    await saveScreenshot("05_eval_accuracy_panel.png");

    console.log("\n🎉 All 5 screenshots captured successfully at 1440x900!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
