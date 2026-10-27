import type { CatalogItem, CommitmentType, Flag } from "./types";

export function checkCommitment(
  input: { type: CommitmentType; catalogItemId: string | null; dueDays: number | null },
  catalog: CatalogItem[]
): { flag: Flag; reason: string } {
  if (input.type === "product_capability")
    return { flag: "amber", reason: "Product capability promise: outside the MVP check. Route to product." };
  if (input.type === "commercial")
    return { flag: "amber", reason: "Commercial term: confirm it is written into the order form." };

  const item = input.catalogItemId ? catalog.find(c => c.id === input.catalogItemId) : undefined;
  if (!item)
    return { flag: "amber", reason: "Not in the can-commit list: needs implementation approval." };
  if (!item.offered)
    return { flag: "red", reason: `Not offered: ${item.name}.` };
  if (item.leadTimeDays !== null && input.dueDays !== null && input.dueDays < item.leadTimeDays)
    return { flag: "amber", reason: `Promised in ${input.dueDays} days; standard lead time is ${item.leadTimeDays} days.` };
  if (!item.standard)
    return { flag: "amber", reason: `Non-standard item: ${item.name}. Needs implementation approval.` };
  return { flag: "green", reason: `Standard item within lead time: ${item.name}.` };
}
