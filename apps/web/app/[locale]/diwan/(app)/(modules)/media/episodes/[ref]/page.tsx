import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { EpisodePage } from "@/components/diwan/admin/programmes/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.programmes.tabs.episodes")
);

/** A Next Stop episode on its own page, by its slug (new for a blank one). */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="media">
      <EpisodePage slug={decodeURIComponent(ref)} />
    </RequireModule>
  );
};

export default Page;
