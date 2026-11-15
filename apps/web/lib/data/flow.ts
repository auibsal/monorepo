/**
 * One form flow (decisions.md, The site): the same status words everywhere
 * in Your account (Received, In review, Decision, Withdrawn), each flow
 * adding only its own steps between them. Shortlisting stays internal, as
 * US hiring systems keep it: an applicant sees "In review" until an
 * interview or a decision.
 */

export type FlowKind = "audition" | "nomination" | "opening" | "partner";

export type FlowStep =
  | "received"
  | "inReview"
  | "interview"
  | "offer"
  | "callback"
  | "councilVote"
  | "decision"
  | "withdrawn";

/** The decision, named plainly. */
type FlowDecision =
  | "accepted"
  | "appointed"
  | "approved"
  | "cast"
  | "declinedOffer"
  | "notApproved"
  | "notCast"
  | "notChosen"
  | "notOnBallot"
  | "onBallot";

export interface FlowStatus {
  readonly decision?: FlowDecision;
  readonly step: FlowStep;
}

/** Each flow's steps, in order (Withdrawn shows alone). */
export const flowSteps: Record<FlowKind, readonly FlowStep[]> = {
  audition: ["received", "callback", "decision"],
  nomination: ["received", "inReview", "decision"],
  opening: ["received", "inReview", "interview", "offer", "decision"],
  partner: ["received", "councilVote", "decision"],
};

const OPENING: Record<string, FlowStatus> = {
  accepted: { decision: "accepted", step: "decision" },
  declined: { decision: "declinedOffer", step: "decision" },
  new: { step: "received" },
  not_picked: { decision: "notChosen", step: "decision" },
  offered: { step: "offer" },
  onboarded: { decision: "appointed", step: "decision" },
  // Shortlisted, kept internal.
  picked: { step: "inReview" },
  talking: { step: "interview" },
  withdrawn: { step: "withdrawn" },
};

const AUDITION: Record<string, FlowStatus> = {
  called_back: { step: "callback" },
  cancelled: { step: "withdrawn" },
  cast: { decision: "cast", step: "decision" },
  not_cast: { decision: "notCast", step: "decision" },
  signed_up: { step: "received" },
};

const NOMINATION: Record<string, FlowStatus> = {
  approved: { decision: "onBallot", step: "decision" },
  nominated: { step: "received" },
  rejected: { decision: "notOnBallot", step: "decision" },
  withdrawn: { step: "withdrawn" },
};

const PARTNER: Record<string, FlowStatus> = {
  active: { decision: "approved", step: "decision" },
  ended: { decision: "notApproved", step: "decision" },
  // Waiting for the Council's vote, at its next meeting.
  prospect: { step: "councilVote" },
};

const BY_KIND: Record<FlowKind, Record<string, FlowStatus>> = {
  audition: AUDITION,
  nomination: NOMINATION,
  opening: OPENING,
  partner: PARTNER,
};

/** Where a record stands, from its flow's own status. */
export const flowStatus = (kind: FlowKind, status: string): FlowStatus =>
  BY_KIND[kind][status] ?? { step: "received" };
