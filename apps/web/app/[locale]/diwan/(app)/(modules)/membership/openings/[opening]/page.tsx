import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { OpeningEditor } from "@/components/diwan/admin/programs/opening-editor";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.programs.openings.editTitle")
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
      <OpeningEditor back="/membership/openings" id={opening} />
    </RequireModule>
  );
};

export default Page;
