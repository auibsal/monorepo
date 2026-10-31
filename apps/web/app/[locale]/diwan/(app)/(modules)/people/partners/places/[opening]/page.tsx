import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { OpeningEditor } from "@/components/nexus/admin/programmes/opening-editor";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.programmes.callboard.editTitle")
);

/** A place with a partner, edited on its own page. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ opening: string }>;
}) => {
  const { opening } = await params;
  return (
    <RequireModule module="partners">
      <OpeningEditor back="/people/partners/places" id={opening} />
    </RequireModule>
  );
};

export default Page;
