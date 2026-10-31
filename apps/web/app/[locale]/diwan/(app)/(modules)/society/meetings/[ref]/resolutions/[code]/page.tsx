import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { ResolutionPage } from "@/components/nexus/admin/governance/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.society.meetings.title")
);

/**
 * One resolution of a meeting, by its code (R-2026-01), or new for a blank
 * one: a resolution always belongs to a meeting of the Council or the
 * General Assembly.
 */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ code: string; ref: string }>;
}) => {
  const { code, ref } = await params;
  return (
    <RequireModule module="governance">
      <ResolutionPage
        code={decodeURIComponent(code)}
        meetingId={decodeURIComponent(ref)}
      />
    </RequireModule>
  );
};

export default Page;
