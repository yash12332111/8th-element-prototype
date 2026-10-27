import puppeteer from "puppeteer";
import * as fs from "node:fs";
import * as path from "node:path";

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
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

  const saveScreenshot = async (filename: string) => {
    const p1 = path.join(outDirKept, filename);
    const p2 = path.join(outDirRoot, filename);
    await page.screenshot({ path: p1, fullPage: false });
    fs.copyFileSync(p1, p2);
    console.log(`Saved screenshot: ${filename} (${fs.statSync(p1).size} bytes)`);
  };

  try {
    console.log("Navigating to Harbor deal page...");
    await page.goto("http://localhost:3000/deals/d_harbor", { waitUntil: "networkidle0" });

    // Ensure AE role is selected in header
    await page.evaluate(() => {
      const select = document.querySelector("select") as HTMLSelectElement | null;
      if (select && select.value !== "ae") {
        select.value = "ae";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    // 1. Screenshot 1: Harbor Capture with line highlight
    console.log("1. Setting up Harbor Capture tab...");
    await new Promise((r) => setTimeout(r, 1000));

    // Find and click "⚡ Find commitments" button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const findBtn = btns.find((b) => b.textContent?.includes("Find commitments"));
      if (findBtn) findBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    // Click on a red card
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".card"));
      const redCard = cards.find((c) => c.querySelector(".badge-red") !== null) as HTMLElement | null;
      if (redCard) {
        redCard.click();
      }
    });
    await new Promise((r) => setTimeout(r, 1000));

    await saveScreenshot("01_harbor_capture.png");

    // 2. Screenshot 2: Harbor Move to Contract Blocker Panel
    console.log("2. Setting up Harbor Stage tab contract gate blocker...");
    // Click "Stage" tab
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll(".deal-tab"));
      const stageTab = tabs.find((t) => t.textContent?.toLowerCase().includes("stage")) as HTMLElement | null;
      if (stageTab) stageTab.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // Blocker panel is already visible or click move button
    await saveScreenshot("02_harbor_contract_block.png");

    // 3. Screenshot 3: Closed-Won Gate Blocker
    console.log("3. Setting up Closed-Won gate blocker panel...");
    await page.evaluate(() => {
      // Set Harbor deal stage directly to "contract" in store to view the Closed-Won gate blockers
      const raw = localStorage.getItem("kept-demo-v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state?.deals) {
          const harbor = parsed.state.deals.find((d: any) => d.id === "d_harbor");
          if (harbor) {
            harbor.stage = "contract";
            localStorage.setItem("kept-demo-v1", JSON.stringify(parsed));
          }
        }
      }
    });
    // Reload page to rehydrate with stage = contract
    await page.goto("http://localhost:3000/deals/d_harbor", { waitUntil: "networkidle0" });
    // Go to Stage tab
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll(".deal-tab"));
      const stageTab = tabs.find((t) => t.textContent?.toLowerCase().includes("stage")) as HTMLElement | null;
      if (stageTab) stageTab.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    await saveScreenshot("03_harbor_closed_won_block.png");

    // 4. Screenshot 4: Northgate 1 / 1 / 1 Attribution Summary
    console.log("4. Capturing Northgate 1 / 1 / 1 attribution...");
    await page.goto("http://localhost:3000/accounts/d_northgate", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1000));
    await saveScreenshot("04_northgate_attribution.png");

    // 5. Screenshot 5: AI Accuracy Score Panel
    console.log("5. Capturing AI accuracy eval panel...");
    await page.goto("http://localhost:3000/eval", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1000));
    await saveScreenshot("05_eval_accuracy_panel.png");

    console.log("All 5 deck screenshots successfully captured at 1440x900!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
