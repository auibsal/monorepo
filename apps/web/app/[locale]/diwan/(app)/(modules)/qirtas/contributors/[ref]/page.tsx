import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { ContributorPage } from "@/components/nexus/admin/journal/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.journal.contributor.title")
);

/** A contributor's bio, edited on its own page. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="journal">
      <ContributorPage slug={decodeURIComponent(ref)} />
    </RequireModule>
  );
};

export default Page;
