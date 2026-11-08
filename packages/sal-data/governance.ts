import { z } from "zod";
import { type Client, unwrap } from "./client";

export const RON = "RON" as const;

/**
 * The Society's meetings (decisions.md): the Council, general meetings
 * every two weeks, the Annual Meeting, special meetings and the Founding
 * Meeting (March 30, 2027). There are no other kinds.
 */
export const meetingBodies = [
  "council",
  "general",
  "annual",
  "special",
  "founding",
] as const;
export type MeetingBody = (typeof meetingBodies)[number];

/**
 * A ballot: one choice per seat, a candidate (or RON on an uncontested
 * race), or none to abstain (plurality with a majority, decisions §4).
 */
export const ballotSchema = z.record(
  z.uuid(),
  z.array(z.union([z.uuid(), z.literal(RON)])).max(1)
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

/**
 * The Council page: each person holding a Council role, once, with every
 * title they hold (from their role assignments; officers first).
 */
export const councilMembers = async (client: Client) =>
  unwrap(await client.schema("governance").rpc("council_members")) ?? [];

/**
 * The Council's nine seats (decisions §4), in order, each with whoever
 * holds it (none while open).
 */
export const councilSeats = async (client: Client) =>
  unwrap(await client.schema("governance").rpc("council_seats")) ?? [];

/** Resolutions the Council or a members’ meeting adopted, newest first. */
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
