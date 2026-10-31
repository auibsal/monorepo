"use client";

import { useAuth } from "@repo/auth/provider";
import { usePathname, useRouter } from "@repo/internationalization/navigation";
import { partners } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { safeNextPath } from "@/lib/nexus/navigation";
import {
  hasAllNames,
  useGrants,
  useMemberStatus,
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
 * Where a partner's guests go among the members' pages: Qirtas, to write
 * for calls opened to their partner, and their work sent there.
 * Everything else of theirs is under /account (owner, Oct 31, 2026). Row
 * Level Security still decides every row.
 */
const GUEST_PATHS = ["/qirtas", "/membership/work"];

export const isGuestPath = (pathname: string) =>
  GUEST_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

/** True when the signed-in person is verified as a partner's guest. */
const usePartnerGuest = (enabled: boolean) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled,
    queryFn: async () =>
      (await partners.myAffiliations(supabase)).some(
        (a) => a.status === "verified"
      ),
    queryKey: ["affiliations", "guest", user?.id ?? ""],
  });
};

/**
 * Members only (owner, Oct 31, 2026): anyone else has /account. Members
 * with a pledge to (re-)accept, setup to finish or a name not in four
 * parts go to /welcome first; a partner's guests may write for Qirtas
 * (`isGuestPath`), after the same.
 */
export const RequireMember = ({ children }: GateProps) => {
  const status = useMemberStatus();
  const profile = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const unverified = status.isSuccess && !status.data?.verified;
  const guest = usePartnerGuest(unverified);
  const isGuest = unverified && guest.data === true;
  const elsewhere =
    unverified && guest.isSuccess && !(isGuest && isGuestPath(pathname));

  const needsSetup =
    (status.data?.verified || isGuest) &&
    ((status.data?.pending_pledges.length ?? 0) > 0 ||
      !profile.data?.setup_completed_at ||
      !hasAllNames(profile.data));

  useEffect(() => {
    if (elsewhere) {
      // A guest booking from an event's page books from their account.
      router.replace(
        pathname.startsWith("/membership/calendar")
          ? `/account/calendar${window.location.hash}`
          : "/account"
      );
    } else if (needsSetup && profile.data) {
      router.replace({
        pathname: "/welcome",
        query: {
          next: `${pathname}${window.location.search}${window.location.hash}`,
        },
      });
    }
  }, [elsewhere, needsSetup, pathname, profile.data, router]);

  if (status.isError || profile.isError || guest.isError) {
    return (
      <ErrorState
        onRetry={() =>
          Promise.all([status.refetch(), profile.refetch(), guest.refetch()])
        }
      />
    );
  }
  if (
    status.isPending ||
    profile.isPending ||
    needsSetup ||
    elsewhere ||
    (unverified && guest.isPending)
  ) {
    return <PageSpinner />;
  }
  return children;
};

/**
 * The account of someone who is not a member (owner, Oct 31, 2026): a
 * partner's guests and team, and anyone waiting on a partner application.
 * Members go to Membership. Everyone gives their name in four parts first
 * (at /welcome; a partner's guests also make the pledges there).
 */
export const RequireAccount = ({ children }: GateProps) => {
  const status = useMemberStatus();
  const profile = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const member = status.isSuccess && Boolean(status.data?.verified);
  const unnamed = profile.isSuccess && !hasAllNames(profile.data);

  useEffect(() => {
    if (member) {
      router.replace("/membership");
    } else if (unnamed) {
      router.replace({ pathname: "/welcome", query: { next: pathname } });
    }
  }, [member, pathname, router, unnamed]);

  if (status.isError || profile.isError) {
    return (
      <ErrorState
        onRetry={() => Promise.all([status.refetch(), profile.refetch()])}
      />
    );
  }
  if (status.isPending || profile.isPending || member || unnamed) {
    return <PageSpinner />;
  }
  return children;
};

/**
 * A partner's dashboard (/partners/dashboard; owner, Oct 31, 2026): for its
 * team (partners.own on the partner), members or not. A convenience: Row
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
      router.replace("/account");
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
export const RequireStaff = ({ children }: GateProps) => {
  const grants = useGrants();
  const twoStep = useTwoStep();
  const router = useRouter();
  // A role that needs two-step sign-in grants nothing until the code is in,
  // so its holder is staff waiting for the second step, not a member.
  const waiting = Boolean(twoStep.data?.needs && !twoStep.data.done);
  // A partner's representative holds partners.own only: their partner's
  // dashboard (/partners/dashboard) is theirs, the officers' Diwan is not.
  const officerGrants = (grants.data ?? []).filter(
    (g) => g.permission !== "partners.own"
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
