import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { OpeningEditor } from "@/components/nexus/admin/programmes/opening-editor";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.programmes.callboard.editTitle")
);

/** One of a program's openings, edited on its own page. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ opening: string; ref: string }>;
}) => {
  const { opening, ref } = await params;
  return (
    <RequireModule module="programs">
      <OpeningEditor
        back={`/events/${decodeURIComponent(ref)}/places`}
        id={opening}
      />
    </RequireModule>
  );
};

export default Page;
