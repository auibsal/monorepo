"use client";

import { useAuth } from "@repo/auth/provider";
import { usePathname, useRouter } from "@repo/internationalization/navigation";
import type { membership } from "@repo/sal-data";
import { type ReactNode, useEffect } from "react";
import { safeNextPath } from "@/lib/nexus/navigation";
import {
  hasAllNames,
  useGrants,
  useMemberStatus,
  useMyMembership,
  useProfile,
} from "@/lib/nexus/queries";
import { TwoStepPanel, useTwoStep } from "./auth/two-step";
import { ErrorState, FullPageSpinner, PageSpinner } from "./states";

interface GateProps {
  readonly children: ReactNode;
}

/**
 * Shows its children only to signed-in users and sends everyone else to the
 * sign-in page (coming back afterwards). A convenience: the data is
 * protected by Row Level Security, not by this check.
 */
export const RequireAuth = ({ children }: GateProps) => {
  const { loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!(loading || user)) {
      router.replace({
        pathname: "/sign-in",
        query: {
          next: `${pathname}${window.location.search}${window.location.hash}`,
        },
      });
    }
  }, [loading, pathname, router, user]);

  return loading || !user ? <PageSpinner /> : children;
};

/**
 * The pages each kind of membership opens (owner, Oct 31, 2026: one
 * Membership for everyone, of one kind). Members open everything; guests
 * their Today, calendar, record, settings and Qirtas (their work and the
 * calls open to them); a partner's people their Today, record and
 * settings (the dashboard is theirs too, behind its own gate). An account
 * with no membership yet (an invitation waiting on its partner, an
 * application waiting on the President) has Today and Settings. Row Level
 * Security still decides every row.
 */
const KIND_PATHS: Record<
  membership.MembershipKind | "none",
  readonly string[]
> = {
  guest: [
    "/membership/calendar",
    "/membership/record",
    "/membership/settings",
    "/membership/work",
    "/qirtas",
  ],
  member: [],
  none: ["/membership/settings"],
  partner: ["/membership/record", "/membership/settings"],
};

/** Whether a kind of membership opens a members' page. */
export const kindOpens = (
  kind: membership.MembershipKind | null,
  pathname: string
) =>
  kind === "member" ||
  pathname === "/membership" ||
  KIND_PATHS[kind ?? "none"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

/**
 * Membership, for every kind (owner, Oct 31, 2026): a page the kind doesn't
 * open goes to Today. Members and guests with a pledge to (re-)accept or
 * setup to finish, and anyone whose name is not in four parts, go to
 * /welcome first.
 */
export const RequireMember = ({ children }: GateProps) => {
  const status = useMemberStatus();
  const mine = useMyMembership();
  const profile = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const kind = mine.data?.kind ?? null;
  const elsewhere = mine.isSuccess && !kindOpens(kind, pathname);
  const pledges = kind === "member" || kind === "guest";

  const needsSetup =
    mine.isSuccess &&
    profile.isSuccess &&
    (!hasAllNames(profile.data) ||
      (pledges &&
        ((status.data?.pending_pledges.length ?? 0) > 0 ||
          !profile.data?.setup_completed_at)));

  useEffect(() => {
    if (elsewhere) {
      router.replace("/membership");
    } else if (needsSetup && profile.data) {
      router.replace({
        pathname: "/welcome",
        query: {
          next: `${pathname}${window.location.search}${window.location.hash}`,
        },
      });
    }
  }, [elsewhere, needsSetup, pathname, profile.data, router]);

  if (status.isError || profile.isError || mine.isError) {
    return (
      <ErrorState
        onRetry={() =>
          Promise.all([status.refetch(), profile.refetch(), mine.refetch()])
        }
      />
    );
  }
  if (
    status.isPending ||
    profile.isPending ||
    mine.isPending ||
    needsSetup ||
    elsewhere
  ) {
    return <PageSpinner />;
  }
  return children;
};

/**
 * A partner's dashboard (/partners/dashboard; owner, Oct 31, 2026): for its
 * team (partners.own on the partner), who hold a partner's membership. A convenience: Row
 * Level Security keeps each to its own partner.
 */
export const RequirePartner = ({ children }: GateProps) => {
  const grants = useGrants();
  const profile = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const holds = (grants.data ?? []).some(
    (g) => g.permission === "partners.own"
  );
  // A partner's people give their names in four parts too (owner, Oct 31,
  // 2026), at /welcome, before their partner's page.
  const unnamed = profile.isSuccess && !hasAllNames(profile.data);
  useEffect(() => {
    if (grants.isSuccess && !grants.isFetching && !holds) {
      router.replace("/membership");
    } else if (holds && unnamed) {
      router.replace({ pathname: "/welcome", query: { next: pathname } });
    }
  }, [grants.isFetching, grants.isSuccess, holds, pathname, router, unnamed]);
  if (grants.isError || profile.isError) {
    return (
      <ErrorState
        onRetry={() => Promise.all([grants.refetch(), profile.refetch()])}
      />
    );
  }
  return grants.isSuccess && holds && profile.isSuccess && !unnamed ? (
    children
  ) : (
    <PageSpinner />
  );
};

/** Sign-in and sign-up pages: signed-in users go on to their account. */
export const GuestOnly = ({ children }: GateProps) => {
  const { loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(safeNextPath(next) ?? "/membership");
    }
  }, [loading, router, user]);

  return loading || user ? <FullPageSpinner /> : children;
};

/**
 * The Diwan is for officers (owner, Oct 24, 2026): anyone holding a role.
 * Everyone else goes to their account on the site. A convenience: Row
 * Level Security still decides every row.
 */
const PARTNER_PERMISSIONS = new Set(["partners.own", "partners.lead"]);

export const RequireStaff = ({ children }: GateProps) => {
  const grants = useGrants();
  const twoStep = useTwoStep();
  const router = useRouter();
  // A role that needs two-step sign-in grants nothing until the code is in,
  // so its holder is staff waiting for the second step, not a member.
  const waiting = Boolean(twoStep.data?.needs && !twoStep.data.done);
  // A partner's team holds partners.own (and its Leads partners.lead):
  // their partner's dashboard (/partners/dashboard) is theirs, the
  // officers' Diwan is not, even for a member who leads their club.
  const officerGrants = (grants.data ?? []).filter(
    (g) => !PARTNER_PERMISSIONS.has(g.permission)
  );
  const partnerOnly =
    officerGrants.length === 0 && (grants.data ?? []).length > 0;
  const staff = officerGrants.length > 0 || waiting;
  // Decide only on fresh answers: right after the second step both reload,
  // and the new level can arrive before the new grants.
  const settled =
    grants.isSuccess &&
    twoStep.isSuccess &&
    !grants.isFetching &&
    !twoStep.isFetching;

  useEffect(() => {
    if (settled && !staff) {
      router.replace(partnerOnly ? "/partners/dashboard" : "/membership");
    }
  }, [partnerOnly, router, settled, staff]);

  if (grants.isError || twoStep.isError) {
    return (
      <ErrorState
        onRetry={() => {
          grants.refetch();
          twoStep.refetch();
        }}
      />
    );
  }
  if (!(grants.isSuccess && twoStep.isSuccess && staff)) {
    return <PageSpinner />;
  }
  return waiting ? <TwoStepPanel /> : children;
};
