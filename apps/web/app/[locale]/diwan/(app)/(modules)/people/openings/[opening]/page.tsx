import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { OpeningEditor } from "@/components/nexus/admin/programmes/opening-editor";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.programmes.openings.editTitle")
);

/** One opening, of any kind, edited on its own page. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ opening: string }>;
}) => {
  const { opening } = await params;
  return (
    <RequireModule module="hiring">
      <OpeningEditor back="/people/openings" id={opening} />
    </RequireModule>
  );
};

export default Page;
