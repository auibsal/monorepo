import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { EpisodePage } from "@/components/nexus/admin/programmes/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.programmes.tabs.episodes")
);

/** A Next Stop episode on its own page, by its slug (new for a blank one). */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="journal">
      <EpisodePage slug={decodeURIComponent(ref)} />
    </RequireModule>
  );
};

export default Page;
