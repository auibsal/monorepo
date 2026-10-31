import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { ResolutionPage } from "@/components/nexus/admin/governance/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.society.resolutions.title")
);

/** One resolution, by its code (R-2026-01), or new for a blank one. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ code: string }>;
}) => {
  const { code } = await params;
  return (
    <RequireModule module="governance">
      <ResolutionPage code={decodeURIComponent(code)} />
    </RequireModule>
  );
};

export default Page;
