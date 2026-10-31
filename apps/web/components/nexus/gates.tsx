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
import { PartnerGuest, PendingVerification } from "./pending-verification";
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
 * Where people verified as a partner's members (not Society members) may
 * go: Qirtas (calls opened to their partner), their profile, their service
 * and certificates.
 * Row Level Security still decides every row.
 */
const GUEST_PATHS = [
  "/qirtas",
  "/membership/work",
  "/membership/record",
  "/membership/settings",
];

export const isGuestPath = (pathname: string) =>
  GUEST_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

/** True when the signed-in person is verified as a partner's member. */
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
 * Members only: unverified accounts see the verification notice (where they
 * can also say they belong to a partner), and members with a pledge to
 * (re-)accept or setup to finish go to /welcome first. People verified as a
 * partner's members get the guest pages (`isGuestPath`), after the same
 * pledges and setup.
 */
export const RequireMember = ({ children }: GateProps) => {
  const status = useMemberStatus();
  const profile = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const unverified = status.isSuccess && !status.data?.verified;
  const guest = usePartnerGuest(unverified);
  const isGuest = unverified && guest.data === true;

  const needsSetup =
    (status.data?.verified || isGuest) &&
    ((status.data?.pending_pledges.length ?? 0) > 0 ||
      !profile.data?.setup_completed_at ||
      !hasAllNames(profile.data));

  useEffect(() => {
    if (needsSetup && profile.data) {
      router.replace({
        pathname: "/welcome",
        query: {
          next: `${pathname}${window.location.search}${window.location.hash}`,
        },
      });
    }
  }, [needsSetup, pathname, profile.data, router]);

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
    (unverified && guest.isPending)
  ) {
    return <PageSpinner />;
  }
  if (isGuest) {
    return isGuestPath(pathname) ? children : <PartnerGuest />;
  }
  if (!status.data?.verified) {
    return <PendingVerification />;
  }
  return children;
};

/**
 * A partner's own page in the Diwan (owner, Oct 31, 2026): for its
 * representatives (partners.own on the partner), members or not. A
 * convenience: Row Level Security keeps each to its own partner.
 */
export const RequirePartner = ({ children }: GateProps) => {
  const grants = useGrants();
  const router = useRouter();
  const holds = (grants.data ?? []).some(
    (g) => g.permission === "partners.own"
  );
  useEffect(() => {
    if (grants.isSuccess && !grants.isFetching && !holds) {
      router.replace("/membership");
    }
  }, [grants.isFetching, grants.isSuccess, holds, router]);
  if (grants.isError) {
    return <ErrorState onRetry={() => grants.refetch()} />;
  }
  return grants.isSuccess && holds ? children : <PageSpinner />;
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
  // page (/diwan/partner) is theirs, the officers' Diwan is not.
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
      router.replace(partnerOnly ? "/diwan/partner" : "/membership");
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
