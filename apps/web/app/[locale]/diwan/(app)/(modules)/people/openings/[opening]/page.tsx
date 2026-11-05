import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { OpeningEditor } from "@/components/diwan/admin/programmes/opening-editor";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.programmes.openings.editTitle")
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
