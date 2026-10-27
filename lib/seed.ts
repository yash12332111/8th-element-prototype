import type { Deal, Commitment, Transcript, AppEvent } from "./types";
import dealsData from "../data/deals.json";
import seedStateData from "../data/seed-state.json";

// Transcript files are loaded lazily so that tree-shaking works in the browser.
// We import them statically here; Next.js / webpack handles JSON imports fine.
import tHarbor01 from "../data/transcripts/t_harbor_01.json";
import tHarbor02 from "../data/transcripts/t_harbor_02.json";
import tCedar01 from "../data/transcripts/t_cedar_01.json";
import tNorthgate01 from "../data/transcripts/t_northgate_01.json";

export const SEED_VERSION = "2026-10-26a";

export interface SeedState {
  seedVersion: string;
  deals: Deal[];
  commitments: Commitment[];
  transcripts: Transcript[];
  events: AppEvent[];
}

export function buildSeedState(): SeedState {
  const deals = dealsData as Deal[];

  const transcripts: Transcript[] = [
    tHarbor01 as Transcript,
    tHarbor02 as Transcript,
    tCedar01 as Transcript,
    tNorthgate01 as Transcript,
  ];

  const { commitments, events } = seedStateData as {
    commitments: Commitment[];
    events: AppEvent[];
  };

  return {
    seedVersion: SEED_VERSION,
    deals,
    commitments,
    transcripts,
    events,
  };
}
