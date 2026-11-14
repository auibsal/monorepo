"use client";

import { usePathname, useRouter } from "@repo/internationalization/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/auth/provider";
import type { membership } from "@/lib/data";
import { safeNextPath } from "@/lib/diwan/navigation";
import { useGrants, useMyMembership } from "@/lib/diwan/queries";
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

  return loading || !user ? (
    <PageSpinner />
  ) : (
    <>
      <Restored />
      {children}
    </>
  );
};

/**
 * Signing in keeps an account its owner had asked to delete (decisions.md,
 * Members: 30 days to change one's mind), and says so once.
 */
const Restored = () => {
  const t = useTranslations("diwan.profile.delete");
  const { supabase, user } = useAuth();
  const restored = useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase.schema("core").rpc("restore_account");
      return data === true;
    },
    queryKey: ["restore-account", user?.id ?? ""],
    staleTime: Number.POSITIVE_INFINITY,
  });
  return restored.data ? (
    <p className="border-line border-b px-4 py-3 text-center" role="status">
      {t("restored")}
    </p>
  ) : null;
};

/**
 * The pages each kind of membership opens (decisions.md: one
 * Membership for everyone, of one kind). Members open everything; guests
 * their Today, events, work, documents, settings and Qirtas (their work and the
 * calls open to them); a partner's people their Today, documents and
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
    "/account/events",
    "/account/documents",
    "/account/work",
    "/account/settings",
    "/qirtas",
  ],
  member: [],
  none: ["/account/settings"],
  partner: ["/account/documents", "/account/settings"],
};

/** Whether a kind of membership opens a members' page. */
export const kindOpens = (
  kind: membership.MembershipKind | null,
  pathname: string
) =>
  kind === "member" ||
  pathname === "/account" ||
  KIND_PATHS[kind ?? "none"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

/**
 * Your account, for every kind (decisions.md): a page the kind doesn't
 * open goes to Today. Nothing else stands between signing in and the page
 * but two-step sign-in for a role that needs it (decisions.md, Members);
 * the e-sign consent, the role agreement, the Arabic form and an
 * incomplete name are to-dos on Today.
 */
export const RequireMember = ({ children }: GateProps) => {
  const mine = useMyMembership();
  const router = useRouter();
  const pathname = usePathname();
  const kind = mine.data?.kind ?? null;
  const elsewhere = mine.isSuccess && !kindOpens(kind, pathname);
  // A role that needs two-step sign-in sets it up at sign-in, before
  // anything else: a passkey first, then an authenticator app, then the
  // recovery codes. Shift-scoped station access is not a role, so it is
  // exempt.
  const twoStep = useTwoStep();
  const waiting = Boolean(twoStep.data?.needs && !twoStep.data.done);

  useEffect(() => {
    if (elsewhere) {
      router.replace("/account");
    }
  }, [elsewhere, router]);

  if (mine.isError) {
    return <ErrorState onRetry={() => mine.refetch()} />;
  }
  if (mine.isPending || elsewhere) {
    return <PageSpinner />;
  }
  return waiting ? <TwoStepPanel /> : children;
};

/**
 * A partner's dashboard (/partners/dashboard; decisions.md): for its
 * team (partners.own on the partner), who hold a partner's membership. A convenience: Row
 * Level Security keeps each to its own partner.
 */
export const RequirePartner = ({ children }: GateProps) => {
  const grants = useGrants();
  const router = useRouter();
  const holds = (grants.data ?? []).some(
    (g) => g.permission === "partners.own"
  );
  useEffect(() => {
    if (grants.isSuccess && !grants.isFetching && !holds) {
      router.replace("/account");
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
      router.replace(safeNextPath(next) ?? "/account");
    }
  }, [loading, router, user]);

  return loading || user ? <FullPageSpinner /> : children;
};

/**
 * The Diwan is for officers (decisions.md): anyone holding a role.
 * Everyone else goes to their account on the site. A convenience: Row
 * Level Security still decides every row.
 */
const PARTNER_PERMISSIONS = new Set(["partners.own", "partners.lead"]);

export const RequireStaff = ({ children }: GateProps) => {
  const grants = useGrants();
  const twoStep = useTwoStep();
  const router = useRouter();
  // A role that needs two-step sign-in grants nothing until the code is in,
  // so its holder is staff waiting for the second step, not a member; and
  // the Diwan asks for it again 12 hours after it was last given.
  const waiting = Boolean(
    twoStep.data?.needs && (!twoStep.data.done || twoStep.data.stale)
  );
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
      router.replace(partnerOnly ? "/partners/dashboard" : "/account");
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
