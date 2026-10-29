import { z } from "zod";
import { type Client, unwrap } from "./client";

export const RON = "RON" as const;

/** A ranked ballot: position id → candidate ids (or RON) in order. */
export const ballotSchema = z.record(
  z.uuid(),
  z
    .array(z.union([z.uuid(), z.literal(RON)]))
    .refine((ranks) => new Set(ranks).size === ranks.length, {
      message: "duplicate_rank",
    })
);

export type Ballot = z.infer<typeof ballotSchema>;

export const castBallot = async (
  client: Client,
  electionId: string,
  ballot: Ballot
) =>
  unwrap(
    await client.schema("governance").rpc("cast_ballot", {
      choices: ballotSchema.parse(ballot),
      election_id: electionId,
    })
  );

export const councilRoster = async (client: Client) =>
  unwrap(await client.schema("governance").rpc("council_roster")) ?? [];

/** The Council page: every seat, its holder or the seat that covers it. */
export const councilSeats = async (client: Client) =>
  unwrap(
    await client
      .schema("governance")
      .from("council_seats")
      .select("key, kind, title_en, title_ar, holder_en, holder_ar, covered_by")
      .order("sort")
  ) ?? [];

/** Resolutions the Council or the General Assembly adopted, newest first. */
export const adoptedResolutions = async (client: Client) =>
  unwrap(
    await client
      .schema("governance")
      .from("resolutions")
      .select(
        "id, code, title_en, title_ar, body, adopted_on, votes_for, votes_against, votes_abstain"
      )
      .eq("status", "adopted")
      .order("adopted_on", { ascending: false })
      .limit(50)
  ) ?? [];

/** Who was elected in each published election (no other candidates). */
export const publicElectionResults = async (client: Client) =>
  unwrap(await client.schema("governance").rpc("public_election_results")) ??
  [];
