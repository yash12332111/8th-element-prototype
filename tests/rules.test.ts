import { describe, it, expect } from "vitest";
import { checkCommitment } from "../lib/rules";
import type { CatalogItem } from "../lib/types";

const catalog: CatalogItem[] = [
  { id: "int_sso", type: "integration", name: "Single sign-on (SAML)", offered: true, standard: true, leadTimeDays: 10, notes: "" },
  { id: "int_custom_erp", type: "integration", name: "Custom ERP connector", offered: false, standard: false, leadTimeDays: null, notes: "" },
  { id: "mig_csv", type: "data_migration", name: "Data migration from CSV templates", offered: true, standard: true, leadTimeDays: 30, notes: "" },
  { id: "mig_legacy_db", type: "data_migration", name: "Migration from a legacy database", offered: true, standard: false, leadTimeDays: 60, notes: "" },
];

describe("checkCommitment rules", () => {
  it("branch 1: product_capability -> amber with route to product reason", () => {
    const res = checkCommitment({ type: "product_capability", catalogItemId: null, dueDays: null }, catalog);
    expect(res).toEqual({
      flag: "amber",
      reason: "Product capability promise: outside the MVP check. Route to product.",
    });
  });

  it("branch 2: commercial -> amber with order form reason", () => {
    const res = checkCommitment({ type: "commercial", catalogItemId: null, dueDays: null }, catalog);
    expect(res).toEqual({
      flag: "amber",
      reason: "Commercial term: confirm it is written into the order form.",
    });
  });

  it("branch 3: not in catalogue -> amber with needs implementation approval reason", () => {
    const res = checkCommitment({ type: "integration", catalogItemId: "unknown_id", dueDays: 14 }, catalog);
    expect(res).toEqual({
      flag: "amber",
      reason: "Not in the can-commit list: needs implementation approval.",
    });
  });

  it("branch 4: not offered -> red", () => {
    const res = checkCommitment({ type: "integration", catalogItemId: "int_custom_erp", dueDays: null }, catalog);
    expect(res).toEqual({
      flag: "red",
      reason: "Not offered: Custom ERP connector.",
    });
  });

  it("branch 5: short lead time -> amber with days comparison reason", () => {
    const res = checkCommitment({ type: "data_migration", catalogItemId: "mig_csv", dueDays: 21 }, catalog);
    expect(res).toEqual({
      flag: "amber",
      reason: "Promised in 21 days; standard lead time is 30 days.",
    });
  });

  it("branch 6: non-standard item with standard lead time -> amber with non-standard reason", () => {
    const res = checkCommitment({ type: "data_migration", catalogItemId: "mig_legacy_db", dueDays: 65 }, catalog);
    expect(res).toEqual({
      flag: "amber",
      reason: "Non-standard item: Migration from a legacy database. Needs implementation approval.",
    });
  });

  it("branch 7: standard item within lead time -> green", () => {
    const res = checkCommitment({ type: "integration", catalogItemId: "int_sso", dueDays: 14 }, catalog);
    expect(res).toEqual({
      flag: "green",
      reason: "Standard item within lead time: Single sign-on (SAML).",
    });
  });

  it("order check: non-standard item with short lead time -> lead-time reason wins", () => {
    // mig_legacy_db has leadTimeDays: 60 and standard: false
    // promising in 30 days (< 60) should hit the lead-time branch before the standard: false branch
    const res = checkCommitment({ type: "data_migration", catalogItemId: "mig_legacy_db", dueDays: 30 }, catalog);
    expect(res).toEqual({
      flag: "amber",
      reason: "Promised in 30 days; standard lead time is 60 days.",
    });
  });
});
